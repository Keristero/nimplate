//parse cli arguments, allow json to be piped in or specified as a file
//I dont  want to use any dependencies
const fs = require('node:fs/promises');
const path = require('path');
const process = require('process');

//usage: node nimplate.js [--json <json_file_path>]
//or pipe json data

async function read_from_stdin() {
    return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.on('data', chunk => data += chunk);
        process.stdin.on('end', () => {
            resolve(data);
        });
        process.stdin.on('error', err => reject(err));
    });
}

async function read_args() {
    //get json path if provided
    const args = process.argv.slice(2);
    const json_arg_index = args.indexOf('--json');
    const working_dir_arg_index = args.indexOf('--cwd');
    const output_dir_arg_index = args.indexOf('--output_dir');


    let json_file_path = ".";
    if (json_arg_index !== -1 && json_arg_index + 1 < args.length) {
        json_file_path = args[json_arg_index + 1];
    }

    if (process.stdin.isTTY) {
        // If not piped, load from path
        json_string = await fs.readFile(json_file_path, 'utf8');
    } else {
        json_string = await read_from_stdin();
    }
    let json_data = JSON.parse(json_string);

    //get the working_dir argument from --working_dir or use current working directory
    //defaults to the directory containing the json, if that was provided
    let working_dir = path.dirname(path.resolve(json_file_path || '.'));
    if (working_dir_arg_index !== -1 && working_dir_arg_index + 1 < args.length) {
        working_dir = args[working_dir_arg_index + 1];
    }

    //get the output_dir argument, or use the working directory
    let output_dir = working_dir
    if (output_dir_arg_index !== -1 && output_dir_arg_index + 1 < args.length) {
        output_dir = args[output_dir_arg_index + 1];
    }

    return {json_data,working_dir,output_dir}
}

async function main() {
    // read json file from path if required
    let {json_data,working_dir,output_dir} = await read_args();
    //validate
    let metadata = await check_tree_validity(json_data,working_dir);
    console.log("Metadata:", metadata);
    console.log("variable tree:", JSON.stringify(metadata.variable_tree, null, 2));
    //expand macro
    await expand_tree(metadata,output_dir);
}

async function* traverse_nim_object(obj) {
    // Use a stack to avoid recursion, traverse the object breadth-first, yield exactly once for each key, yield the {key,value,path}
    const stack = [{ key: 'root', value: obj, path: ['root'] }];
    while (stack.length > 0) {
        const { key, value, path } = stack.pop();
        let nim_type = determine_nim_type(key,path)
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

async function check_tree_validity(nim_tree,working_dir) {
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
            add_validation_error(validation_errors,nim_path,`${nim_type} ${key} should not have any child folders`);
        }
    }
    function assert_object_value(key,value,nim_path){
        let not_object_value = typeof value !== 'object';
        if(not_object_value){
            //if the folder does not have an object value, add a validation error
            add_validation_error(validation_errors,nim_path,`${nim_type} ${current_key} should have an object value.`);
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
        console.log(`key: ${current_key}, value: ${value}, nim_path: ${JSON.stringify(nim_path)}, type: ${nim_type}`);
        type_handlers[nim_type](current_key, value, nim_path);
    }

    //await all the template file values, add validation errors if any are null
    for (const [file_path, template_promise] of Object.entries(template_files_paths)) {
        let template_content = await template_promise;
        if (template_content === null) {
            add_validation_error(validation_errors, [file_path], `Template file ${file_path} could not be read.`);
        }
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

async function fill_file_template(template_text, scoped_variables) {
    // Helper: resolve a variable path like "foo.bar.baz"
    function resolve_var(path, scope) {
        return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : undefined, scope);
    }

    // Helper: format value for output
    function format_value(val) {
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
    }

    // Find the next balanced {...} block in the template
    function find_next_brace_block(text, start) {
        let open = text.indexOf('{', start);
        if (open === -1) return null;
        let depth = 0;
        for (let i = open; i < text.length; i++) {
            if (text[i] === '{') depth++;
            if (text[i] === '}') depth--;
            if (depth === 0) return { start: open, end: i };
        }
        return null;
    }

    // Iteratively process the template with the current scope to avoid stack overflows
    function process_template(text, scope) {
        let result = '';
        let stack = [{ text, scope, idx: 0, result: '' }];

        while (stack.length > 0) {
            let frame = stack.pop();
            let { text, scope, idx } = frame;
            let localResult = frame.result;

            while (idx < text.length) {
                let block = find_next_brace_block(text, idx);
                if (!block) {
                    localResult += text.slice(idx);
                    break;
                }
                // Add text before the block
                localResult += text.slice(idx, block.start);

                // Extract inside of braces
                let content = text.slice(block.start + 1, block.end).trim();

                // Check for nested template: varName{innerTemplate}
                let nestedMatch = /^([a-zA-Z0-9_.]+)\{([\s\S]*)\}$/.exec(content);
                if (nestedMatch) {
                    const varName = nestedMatch[1];
                    const innerTemplate = nestedMatch[2];
                    const value = resolve_var(varName, scope);

                    if (Array.isArray(value)) {
                        // Push the rest of the template after this block to the stack
                        stack.push({ text, scope, idx: block.end + 1, result: localResult });
                        // Push each array item as a new frame to process the inner template
                        for (let i = value.length - 1; i >= 0; i--) {
                            stack.push({ text: innerTemplate, scope: { ...scope, ...value[i] }, idx: 0, result: '' });
                        }
                        localResult = '';
                        break;
                    } else if (typeof value === 'object' && value !== null) {
                        // Push the rest of the template after this block to the stack
                        stack.push({ text, scope, idx: block.end + 1, result: localResult });
                        // Push the object as a new frame to process the inner template
                        stack.push({ text: innerTemplate, scope: { ...scope, ...value }, idx: 0, result: '' });
                        localResult = '';
                        break;
                    } else {
                        localResult += format_value(value);
                    }
                } else {
                    // Multiple variables in one set of braces
                    const parts = content.split(/\s+/);
                    localResult += parts.map(part => format_value(resolve_var(part, scope))).join(' ');
                }
                idx = block.end + 1;
            }

            // If there is a previous frame, append this result to it
            if (stack.length > 0) {
                stack[stack.length - 1].result += localResult;
            } else {
                result += localResult;
            }
        }
        return result;
    }

    return process_template(template_text, scoped_variables);
}

async function expand_tree(metadata,output_dir) {
    let {
        nim_tree,
        working_dir,
        template_files_paths,
        files,
        folders,
        variable_tree
    } = metadata

    // 1. Create folders
    for (const folder of folders) {
        const folderPath = path.join(output_dir, folder.name);
        await fs.mkdir(folderPath, { recursive: true });
    }

    //
    for(let file of files){
        //get the varible object for the file
        const [current, last_key] = get_object_and_last_key(file.nim_path, variable_tree);
        let scoped_variables = current[last_key];
        let template_text = await template_files_paths[file.template];
        let expanded_file_text = await fill_file_template(template_text, scoped_variables);
        //write the file to the correct path
        const file_path = path.join(output_dir, ...remove_root(file.nim_path))
        await fs.writeFile(file_path, expanded_file_text, 'utf8');

    }
    
}

main()