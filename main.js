#!/usr/bin/env node

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


function pretty_print_plan(plan) {
    const { files, folders, validation_errors, output_dir, working_dir } = plan;

    // Print summary
    console.log('\n=== Plan Summary ===');
    console.log(`Working Directory: ${working_dir || '(not specified)'}`);
    if (output_dir) console.log(`Output Directory: ${output_dir}`);
    console.log(`Folders to create: (${folders.length})`);
    for (const folder of folders) {
        console.log(`📁 ${path.resolve(folder.nim_path.join('/'))}`);
    }
    console.log(`Files to create: (${files.length})`);
    for (const file of files) {
        console.log(`📄 ${path.resolve(...file.nim_path)} (📘: ${file.template})`);
    }

    // Print validation errors, if any
    if (validation_errors && validation_errors.length > 0) {
        console.log('\n❌ Validation Errors:');
        for (const err of validation_errors) {
            const pathStr = (err.path || []).join(' > ');
            console.log(`  - At ${pathStr}:
        ${err.message}`);
        }
        process.exit(1);
    }
    
    console.log('\n✅ No validation errors.');

    if(files.length === 0 && folders.length === 0) {
        console.log('\n👋 Nothing to do! Exiting...');
        process.exit(0);
    }
    console.log('====================\n');
}

async function main() {
    // read json file from path if required
    let {json_data,working_dir,output_dir} = await read_args();
    //validate
    let plan = await plan_expansion(json_data,working_dir);
    pretty_print_plan(plan);
    //expand macro
    await expand_tree(plan,output_dir);
}

main()