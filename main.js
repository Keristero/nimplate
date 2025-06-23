const fs = require('node:fs/promises');
const path = require('path');
const {plan_expansion,expand_tree} = require('./nimplate.js');

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

async function main() {
    // read json file from path if required
    let {json_data,working_dir,output_dir} = await read_args();
    //validate
    let plan = await plan_expansion(json_data,working_dir);
    console.log("variable tree:", JSON.stringify(plan.variable_tree, null, 2));
    //expand macro
    await expand_tree(plan,output_dir);
}

main()