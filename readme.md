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
1. write your nim json file and your templates
2. Here are some examples with the same result
    1. `nimplate --json ./examples/hello_world/.nim.json --output_dir ./output`
    2. `nimplate --json ./examples/hello_world/.nim.json --cwd ./examples/hello_world --output_dir ./output`
    3. `cat ./examples/hello_world/.nim.json | nimplate --cwd ./examples/hello_world --output_dir ./output`


### Arguments
`--json <path to your .nim.json>` Alternatively you can pipe your json string in directly with `<json_string> | nimplate`

`--cwd <path to look for templates from>` *defaults to the directory of your json file*

`--output_dir <path to place your outputs in>` *defaults to cwd* 


## Design Doc
### .nim.json
Everything there is to know about the .nim.json

Its ordinary json in all its key, value, double quoted glory. **However** you will be growled at if you dont follow these rules

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
- _nim_template must be an existing text based file path, *or growling happens*

#### Variables
- values can be any json type
- cant contain files or folders, or null
    ```json
    {
        "variable":{
            "string_variable":"A", ✅
            "number_variable":1, ✅
            "object_variable":{}, ✅
            "array_variable":[], ✅
            "null_variable":null, ⁉️
            "folder_variable/":{}, ⁉️
            "file_variable.bat":{}, ⁉️
        }
    }
    ```
- if you reference an object `{some_object}`, you can reference any variables inside it like this `{some_object{another_variable}}`
- if you reference an array `{some_array}`, all of the values will be used
- you can put as many variables in one or more curley brackets as you like `{{some_variable} {some_variable} {{ladedah, hello {some_variable}}}}`

### nim Templates
- can be any file that can be processed as text
- any variables provided by the nim.json file will be found and replaced


**for example, these two inputs:**
- `template.txt`
    ```txt
    I have a {var1}, I have a {var2}
    Uh! {var2}-{var1}!
    I have a {var1}, I have {var3}
    Uh! {var3}-{var1}!
    {var2}-{var1}, {var3}-{var1}
    Uh!
    ```
- `.nim.json`
    ```json
    {
        "lyrics.txt": {
            "_nim_template": "template.txt",
            "var1":"Pen",
            "var2":"Apple",
            "var3":"Pineapple"
        }
    }
    ```
**run the command**
`nimplate --json ./examples/pen/.nim.json --output_dir ./output/pen`
**would produce this `lyrics.txt`**
```txt
I have a Pen, I have a Apple
Uh! Apple-Pen!
I have a Pen, I have Pineapple
Uh! Pineapple-Pen!
Apple-Pen, Pineapple-Pen
Uh!
```

