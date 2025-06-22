# .nim.json templater
Takes a JSON string looking something like this:
```json
"scripts/":{
    "hello_world.bat":{
        "_nim_template":"/templates/echoer.bat",
        "value_a":"hello",
        "value_b":"world"
    }
}
    
```

It will read any referenced nim template files, they can be any file type. as soon as we use them here, they are considered nim templates regardless of their feelings.

`/templates/echoer.bat`
```bat
echo "{value_a} {value_b}!"
```

and produces these files and folders
```diff
+   scripts/
+       hello_world.bat
```
*what incredible power*

The idea is that you generate the nim.json content using whatever language you want, then you call this tool and it creates the output for you.

## Usage
1. have your nim templates ready in your current working directory.
2. generate your nim json content
3. `nimplate <nim json>`
### Arguments
```
--json (path to your .nim.json)
--cwd (path that your .nim.json should look for its templates relative to, defaults to the same directory as your json file, then your cwd)
--output_dir (all the files and folders your are creating will go here, defaults to your cwd argument)
```

### Examples
`node nimplate.js --json ./examples/stupid_website/.nim.json --cwd ./examples/stupid_website --output_dir ./outputs/stupid_website`

you can also pipe the json in
`cat nim.json | nimplate`


## Design Doc
### nim.json
Everything there is to know about the .nim.json

Its ordinary json in all its key, value, double quoted glory, but there is a particular structure to follow which will be growled about in detail if it is wrong.

the **key** can be used to name three things:
1. if the key ends in a "/" it is a folder
    ```json
        "im a folder/":
    ```
2. otherwise, if the key has a "." it is a file
    ```json
        "im a file.txt":
    ```
3. otherwise the key is a variable
    ```json
        "im a variable":
    ```
#### Folders
- Must have object values
    ```json
        "im a folder/":{} ✅
        "im a folder/":"wait what" ❌
    ```

#### Files
- values must be objects `{}`
- have a variable called {_nim_template}
- cant contain folders
    ```json
        "secret_password.txt":{
            "_nim_template":"/templates/creds.txt"
            "password":"abc123"
        } ✅

        "secret_password.txt":{
            "_nim_template":"/templates/creds.txt"
            "password_folder/":{} ⁉️
        }
    ```
- _nim_template must be an existing file path, *or growling happens*

#### Variables
- values can be any json type
- cant contain files or folders
    ```json
    {
        "variable":{
            "string_variable":"A", ✅
            "number_variable":1, ✅
            "object_variable":{}, ✅
            "array_variable":[], ✅
            "null_variable":null, ✅
            "folder_variable/":{}, ⁉️
            "file_variable.bat":{}, ⁉️
        }
    }
    ```
- if you reference an object `{some_object}`, you can reference any variables inside it like this `{some_object{another_variable}}`
- if you reference an array `{some_array}`, all of the values will be used
- you can put as many variables in the curley brackets as you like! `{some_variable some_variable ladedah, hello some_variable}`

### nim Templates
- can be any file that can be processed as text
- any variables provided by the nim.json file will be found and replaced


**for example, these two inputs:**
- `nim template.txt`
    ```txt
    I have a {var1}
    I have a {var2}
    {var1} {var2}!
    ```
- `nim.json`
    ```json
    "meme.txt":{
        "_nim_template":"/nim template.txt",
        "var1":"pineapple",
        "var2":"pen
    }
    ```
**would produce this `meme.txt`**
```txt
I have a pen
I have a pinapple
pineapple pen!
```

**furthermore, all of these nim templates would produce the same output**
```txt
I have a {var1}
I have a {var2}
{var1 var2!}
```

```txt
{
I have a var1
I have a var2
var1 var2!
}
```