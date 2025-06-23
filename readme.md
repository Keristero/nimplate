# ✨ nimplate

**Turn JSON into files and folders using templates. Magic! 🪄**

---

## 🚀 What does it do?

Feed **nimplate** a JSON like this:

```js
"scripts/": {
    "hello_world.bat": {
        "_nim_template": "/templates/echoer.bat",
        "value_a": "hello",
        "value_b": "world"
    }
}
```

It grabs your template files (any text file will do), like:

```bat title="/templates/echoer.bat"
echo "{value_a} {value_b}!"
```

And *poof!*—it creates:

```diff
+   scripts/
+       hello_world.bat
```

> 💡 *So much power, so little effort!*

Just generate your `nim.json` however you like, run **nimplate**, and watch it build your files and folders.

---

## 🛠️ Installation

```sh
npm i nimplate -g
```

---

## ⚡ Usage

1. Write your nim JSON file and templates.
2. Run nimplate in any of these ways (same result each time!):

    ```sh
    nimplate --json ./examples/hello_world/.nim.json --output_dir ./output
    nimplate --json ./examples/hello_world/.nim.json --cwd ./examples/hello_world --output_dir ./output
    cat ./examples/hello_world/.nim.json | nimplate --cwd ./examples/hello_world --output_dir ./output
    ```

### 📝 Arguments

| Argument              | Description                                                        |
|-----------------------|--------------------------------------------------------------------|
| `--json <path>`       | Path to your `.nim.json` (or pipe JSON in directly)                |
| `--cwd <path>`        | Where to look for templates (defaults to your JSON file's directory)|
| `--output_dir <path>` | Where to put the results (defaults to cwd)                         |

---

## 📦 How does `.nim.json` work?

It's just regular JSON, but with a few rules:

### 🔑 Keys

- **Ends with `/`**: *It's a folder!*
    ```js
    "my_folder/": {}
    ```
- **Contains a `.`**: *It's a file!*
    ```js
    "my_file.txt": {}
    ```
- **Otherwise**: *It's a variable!*
    ```js
    "my_variable": "value"
    ```

### 📁 Folders

- Must have object values:
    ```js
    "folder/": {}      // ✅
    "folder/": "oops"  // ❌
    ```

### 📄 Files

- Value must be an object `{}`.
- Must have a `_nim_template` variable.
- Can't contain folders.

    ```js
    "secret.txt": {
        "_nim_template": "/templates/creds.txt",
        "password": "abc123"
    } // ✅

    "secret.txt": {
        "_nim_template": "/templates/creds.txt",
        "folder/": {}
    } // ❌
    ```

- `_nim_template` must point to a real text file, or you'll get a growl.

### 🧩 Variables

Variables in your `.nim.json` can be any JSON type (except `null`). They are used to inject dynamic values into your templates.

#### ✅ Allowed and ❌ Disallowed Variable Types

| Type      | Allowed? | Example                       |
|-----------|----------|------------------------------|
| string    | ✅       | `"A"`                        |
| number    | ✅       | `1`                          |
| boolean   | ✅       | `true`                       |
| object    | ✅       | `{"x": 1}`                   |
| array     | ✅       | `[1, 2, 3]`                  |
| null      | ❌       | `null`                       |
| folder    | ❌       | `"folder_var/": {}`          |
| file      | ❌       | `"file_var.bat": {}`         |

```js
{
    "variables": {
        "string_var": "A",         // ✅ string
        "number_var": 1,           // ✅ number
        "bool_var": true,          // ✅ boolean
        "object_var": {"x": 1},    // ✅ object
        "array_var": [1, 2, 3],    // ✅ array
        "null_var": null,          // ❌ null not allowed
        "folder_var/": {},         // ❌ folders not allowed
        "file_var.bat": {}         // ❌ files not allowed
    }
}
```

---

### 🏗️ Objects

- **Reference object variables** using `{object_var{property}}` in your template.
- If you reference the object directly (e.g. `{object_var}`), you'll get its JSON string.

**Example:**

```js
{
    "character": {
        "name": "Link",
        "stats": {
            "health": 100,
            "mana": 50
        }
    }
}
```

Template:
```
Name: {character{name}}
Health: {character{stats{health}}}
Character JSON: {character}
```

Output:
```
Name: Link
Health: 100
Character JSON: {"name":"Link","stats":{"health":100,"mana":50}}
```

---

### 🗂️ Arrays

- **Arrays of primitives** become comma-separated strings:  
  `{colors}` → `red,green,blue`
- **Arrays of objects** can be iterated in templates using `{array_var{...}}`.

**Example 1: Array of primitives**

```js
{
    "colors": ["red", "green", "blue"]
}
```

Template:
```
Available colors: {colors}
```

Output:
```
Available colors: red,green,blue
```

**Example 2: Array of objects**

```js
{
    "fruits": [
        {"name": "Banana", "emoji": "🍌"},
        {"name": "Apple", "emoji": "🍎"},
        {"name": "Pear", "emoji": "🍐"}
    ]
}
```

Template:
```
{fruits{
Fruit: {name} {emoji}
}}
```

Output:
```
Fruit: Banana 🍌
Fruit: Apple 🍎
Fruit: Pear 🍐
```

---

### 🔢 Strings, Numbers, Booleans

- Use `{var}` to inject their value.
- Booleans become `true` or `false` strings.

**Example:**

```js
{
    "title": "Hello",
    "count": 3,
    "isActive": false
}
```

Template:
```
Title: {title}
Count: {count}
Active? {isActive}
```

Output:
```
Title: Hello
Count: 3
Active? false
```

---

> 💡 **Tip:**  
> You can nest variables and mix types freely, as long as you follow the rules above. If you try to use a file, folder, or `null` as a variable, nimplate will throw an error.

---

## 📚 More Examples

Check [`/examples`](./examples) and [`/example_outputs`](./example_outputs) in the GitHub repo for more!