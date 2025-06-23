const {plan_expansion,expand_tree} = require('../nimplate.js');
const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');

async function read_all_files_in_directory(directory){
    //Helper function to read all the files in a directory into a deeply nested object
    const files = await fs.readdir(directory, { withFileTypes: true });
    const file_tree = {};
    for (const file of files) {
        const full_path = path.join(directory, file.name);
        if (file.isDirectory()) {
            file_tree[file.name] = await read_all_files_in_directory(full_path);
        } else {
            const content = await fs.readFile(full_path, 'utf8');
            file_tree[file.name] = content;
        }
    }
    return file_tree
}

let examples_path = path.join(".","examples");

describe('plan_expansion', () => {
    it('should produce the expected output', async () => {
        let examples = await fs.readdir(examples_path, { withFileTypes: true });

        for(let example of examples) {
            //add metadata
            example.output_path = path.join('example_outputs', example.name);
            example.path = path.join(examples_path, example.name);
            example.json_path = path.join(examples_path, example.name, '.nim.json');

            //make sure the example output directory exists
            await fs.mkdir( example.output_path, { recursive: true });
            //clean the output directory before running the tests
            example.expected_output = await read_all_files_in_directory( example.output_path)
            await fs.rm( example.output_path, { recursive: true, force: true });
        }
        //load the example's nim.json file
        for(let example of examples) {
            let json_string = await fs.readFile(example.json_path, 'utf8');
            let json_data = JSON.parse(json_string);
            
            const plan = await plan_expansion(json_data, example.path);
            await expand_tree(plan,example.output_path);
            let actual_output = await read_all_files_in_directory(example.output_path);
            assert.deepEqual(actual_output, example.expected_output);
        }
    });
})