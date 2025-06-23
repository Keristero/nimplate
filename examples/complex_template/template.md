This is just showing off some more complicated substitution, see the template for this at /examples/complex_template/{_nim_template}

normally we do something like `{value1}`

here is something `{something_false}` and `{something_true}` and the number `{number}`

you can get keys in objects like `{object{key1}}`
if you try templating the object itself you get the JSON for it.
```json
{object}
```
you can have other text in there too:
`{object{first value: {key1}, second value: {key2}}}`

```js
//we should not mess with curley bracers where we dont need to
function(){
    console.log('memes')
}
//the same goes here
{
    let life = (){return {number}}
}
```

{
    this text should be preserved, and {value1} was substituted
}

Arrays of anything get seperated by commas
{array_of_numbers}

{array_of_strings}

{array}

but we can also use nested values like `{array{{nested}}}`
as you can see they get combined together.
If we want a bit of formatting around those values, you can do this:
```
{array{- {nested}
}}
```

and you dont even need to use any of the values
```
{array{this inner bit is repeated for each thing in the array thing
}}
```

You could have values inside arrays inside objects inside arrays if you want:
{array_of_object{
- level1{array{
    - level2
        - {value}}}}}