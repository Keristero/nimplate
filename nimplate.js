//parse cli arguments, allow json to be piped in or specified as a file
//I dont  want to use any dependencies
const fs = require('node:fs/promises');
const path = require('path');

//usage: node nimplate.js [--json <json_file_path>]
//or pipe json data

async function* traverse_nim_object(obj) {
    // Use a stack to avoid recursion, traverse the object breadth-first, yield exactly once for each key, yield the {key,value,path}
    const stack = [{ key: 'root', value: obj, path: ['root'] }];
    while (stack.length > 0) {
        const { key, value, path } = stack.pop();
        let nim_type = determine_nim_type(key,path)
        if(value === undefined || value === null) {
            //if the value is undefined or null, skip it without even yielding
            continue
        }
        yield [key, value, path, nim_type];
        if (nim_type === 'variable' && typeof value === 'object'){
            //we dont need to traverse variables.
            continue
        }
        if (typeof value === 'object' && value !== null) {
            for (const [child_key, child_value] of Object.entries(value)) {
                stack.push({
                    key: child_key,
                    value: child_value,
                    path: [...path, child_key]
                });
            }
        }
    }
}

function determine_nim_type(key,nim_path){
    if(key.slice(-1) == '/'){
        return "folder"
    }else if(key.includes('.')) {
        return "file"
    }else if(nim_path.length == 1) {
        return "root"
    }else{
        return "variable"
    }
}

async function load_nim_template_async(file_path, working_dir) {
    let template_string = null;
    try {
        template_string = await fs.readFile(path.join(working_dir, file_path), 'utf8');
    } catch (error) {
        console.error(`Error reading template file ${file_path}:`, error);
    }
    return template_string
}

function get_object_and_last_key(path, value) {
    // Traverse the value object according to the path, return [current, last_key], create as requried
    let current = value;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (!current[key]) {
            current[key] = {};
        }
        current = current[key];
    }
    const last_key = path[path.length - 1];
    return [current, last_key];
}

function upsert_variable_to_path(variable_meta, path, value) {
    // Use get_object_and_last_key to insert the variable at the correct path
    const [current, last_key] = get_object_and_last_key(path, value);
    current[last_key] = variable_meta.value;
}

function remove_root(nim_path) {
    // Return the nim_path without the root element
    return nim_path.slice(1);
}

async function plan_expansion(nim_tree,working_dir) {
    let iterator = traverse_nim_object(nim_tree);
    let validation_errors = [];
    let template_files_paths = {};
    let files = [];
    let folders = [];
    let variable_tree = {};

    //helpers
    function add_validation_error(nim_path,message){
        //add a validation error to the errors array
        validation_errors.push({path: nim_path, message: message});
    }

    //asserts
    function assert_no_child_folder(key,value,nim_path){
        let has_child_folder = Object.keys(value).some(k => k.endsWith('/'));
        if(has_child_folder){
            //if the file has a child folder, add a validation error
            add_validation_error(validation_errors,nim_path,`${key} should not have any child folders`);
        }
    }
    function assert_object_value(key,value,nim_path){
        let not_object_value = typeof value !== 'object';
        if(not_object_value){
            //if the folder does not have an object value, add a validation error
            add_validation_error(validation_errors,nim_path,`${current_key} should have an object value.`);
        }
    }
    function assert_template_property(key,value,nim_path){
        let nim_template_path = value["_nim_template"]
        let has_nim_template = value["_nim_template"] !== undefined;
        if(has_nim_template){
            //if the file has a _nim_template property, read the file text asynchronously
            template_files_paths[nim_template_path] = load_nim_template_async(nim_template_path, working_dir);
        }else{
            //if the file does not have a _nim_template property, add a validation error
            add_validation_error(validation_errors,nim_path,`file ${key} should have a "_nim_template" property.`);
        }
    }

    let type_handlers = {
        "folder":(key, value, nim_path) => {
            assert_object_value(key, value, nim_path)
            let folder_meta = {
                name: key.slice(0, -1), //remove trailing slash
                nim_path: nim_path
            }
            folders.push(folder_meta)
        },
        "file":(key, value, nim_path) => {
            assert_no_child_folder(key,value,nim_path)
            assert_object_value(key,value,nim_path)
            assert_template_property(key,value,nim_path)
            let file_meta = {
                template: value["_nim_template"],
                nim_path:nim_path
            }
            files.push(file_meta)
        },
        "variable":(key, value, nim_path) => {
            assert_no_child_folder(key,value,nim_path)
            let variable_meta = {
                name: key,
                value: value,
                path:nim_path
            }
            upsert_variable_to_path(variable_meta, nim_path, variable_tree);
        },
        "root":(key, value, nim_path) => {
            assert_object_value(key,value,nim_path)
        }
    }

    for await (const [current_key, value, nim_path, nim_type] of iterator) {
        type_handlers[nim_type](current_key, value, nim_path);
    }

    //await all the template file values, add validation errors if any are null
    for (const [file_path, template_promise] of Object.entries(template_files_paths)) {
        let template_content = await template_promise;
        if (template_content === null) {
            add_validation_error(validation_errors, [file_path], `Template file ${file_path} could not be read.`);
        }
    }

    //try to fill the templates with variables
    for(let file of files){
        //get the varible object for the file
        const [current, last_key] = get_object_and_last_key(file.nim_path, variable_tree);
        let scoped_variables = current[last_key];
        let template_text = await template_files_paths[file.template];
        let expanded_file_text = await fill_file_template(template_text, scoped_variables);
        file.expanded_file_text = expanded_file_text;
    }

    //log all errors
    for(let error of validation_errors){
        console.error(`Validation Error at ${error.path.join('.')} - ${error.message}`);
    }

    let metadata = {
        nim_tree: nim_tree,
        working_dir: working_dir,
        validation_errors: validation_errors,
        template_files_paths: template_files_paths,
        files: files,
        folders: folders,
        variable_tree: variable_tree
    }

    return metadata
}

// Fill a template string with variables from scoped_variables
async function fill_file_template(template_text, scoped_variables) {
    // Resolve a variable path like "foo.bar.baz" from the scope
    const resolveVar = (path, scope) =>
        path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : undefined, scope);

    // Format a value for output
    const formatValue = (val) => {
        if (val === undefined || val === null) return '';
        if (typeof val === 'string' || typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return val.toString();
        if (Array.isArray(val)) {
            if (val.length === 0) return '';
            if (typeof val[0] === 'string') return val.join('\n');
            if (typeof val[0] === 'number') return val.join(',');
            if (typeof val[0] === 'object') return val.map(v => JSON.stringify(v)).join('\n');
            return val.map(String).join('\n');
        }
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    // Find the next balanced {...} block in the template
    const findNextBraceBlock = (text, start = 0) => {
        let open = text.indexOf('{', start);
        if (open === -1) return null;
        let depth = 0;
        for (let i = open; i < text.length; i++) {
            if (text[i] === '{') depth++;
            if (text[i] === '}') depth--;
            if (depth === 0) return { start: open, end: i };
        }
        return null;
    };

    // Replace variables in a string (outside of curly blocks)
    const replaceVarsInString = (str, scope) => {
        return str.replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, varName) => {
            const val = resolveVar(varName, scope);
            return formatValue(val);
        });
    };

    // Process a template string with a given scope
    // Non-recursive template processor: replaces {var} with value, supports {var{...}} for arrays/objects
    const processTemplate = (text, scope) => {
        let result = '';
        let idx = 0;
        while (idx < text.length) {
            const block = findNextBraceBlock(text, idx);
            if (!block) {
                result += replaceVarsInString(text.slice(idx), scope);
                break;
            }
            result += replaceVarsInString(text.slice(idx, block.start), scope);
            // Preserve original formatting inside the block
            let content = text.slice(block.start + 1, block.end);

            // Check if the first word is a variable in the current scope
            const firstWord = content.trim().split(/\s|{/)[0];
            const varExists = Object.prototype.hasOwnProperty.call(scope, firstWord);

            if (varExists) {
                // Handle nested {var{...}} in a single pass
                const nested = /^([a-zA-Z0-9_.]+)\{([\s\S]*)\}$/.exec(content.trim());
                if (nested) {
                    const [ , varName, inner ] = nested;
                    const value = resolveVar(varName, scope);
                    if (Array.isArray(value)) {
                        result += value.map(item =>
                            processTemplate(inner, { ...scope, ...item })
                        ).join('');
                    } else if (typeof value === 'object' && value !== null) {
                        result += processTemplate(inner, { ...scope, ...value });
                    } else {
                        result += formatValue(value);
                    }
                } else {
                    // Replace {var} or {var1 var2}
                    const parts = content.trim().split(/\s+/);
                    result += parts.map(part => formatValue(resolveVar(part, scope))).join(' ');
                }
            } else {
                // Not a variable in scope, preserve the curly braces but still replace variables inside
                result += '{' + replaceVarsInString(content, scope) + '}';
            }
            idx = block.end + 1;
        }
        return result;
    };

    return processTemplate(template_text, scoped_variables);
}

async function expand_tree(plan,output_dir) {
    let {
        files,
        folders,
    } = plan
    // 0 Ensure output directory exists
    await fs.mkdir(output_dir, { recursive: true });

    // 1. Create folders
    for (const folder of folders) {
        const folderPath = path.join(output_dir, folder.name);
        await fs.mkdir(folderPath, { recursive: true });
    }

    // 2. Write files
    for (const file of files) {
        const file_path = path.join(output_dir, ...remove_root(file.nim_path))
        await fs.writeFile(file_path, file.expanded_file_text, 'utf8');
    }
    
}

module.exports = {
    plan_expansion,
    expand_tree,
    traverse_nim_object,
    get_object_and_last_key
}