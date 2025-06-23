This is just showing off some more complicated substitution, see the template for this at /examples/complex_template/template.md

normally we do something like `this`

here is something `false` and `true` and the number `42`

you can get keys in objects like `key1`
if you try templating the object itself you get the JSON for it.
```json
{"key1":"value1","key2":"value2"}
```
you can have other text in there too:
`first value: value1, second value: value2`

```js
//we should not mess with curley bracers where we dont need to
function(){
    console.log('memes')
}
//the same goes here
{
    let life = (){return 42}
}
```

{
    this text should be preserved, and this was substituted
}

Arrays of anything get seperated by commas
1,2,3,4

one,two,three,four

{"nested":"this"},{"nested":"that"}

but we can also use nested values like `thisthat`
as you can see they get combined together.
If we want a bit of formatting around those values, you can do this:
```
- this
- that

```

and you dont even need to use any of the values
```
this inner bit is repeated for each thing in the array thing
this inner bit is repeated for each thing in the array thing

```

You could have values inside arrays inside objects inside arrays if you want:

- level1
    - level2
        - deep
    - level2
        - values
- level1
    - level2
        - rule