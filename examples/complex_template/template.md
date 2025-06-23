This is just showing off some more complicated substitution
normally we do something like {value1}

here is something {something_false} and {something_true} and the {number}
there is nothing in these quotes "{something_null}"

you can get keys in objects like `{object.key1}`
if you try templating the object itself you get the JSON for it.
```json
{object}
```
or you can try unpeeling it layer by layer
{object{first value {key1}, second value {key2}}}

but we can also use nested values like {array{{nested}}}
as you can see they get combined together.
If we want a bit of formatting around those values, you can do this:
The array has these values:
{array{- {nested}
}}

{array{this inner bit is repeated for each thing in the array thing
}}

```js
//we should not mess with curley bracers where we dont need to
function(){
    console.log('memes')

}
//the same goes here
{
    let func = (){return "yeep"}
}
```

{
    this text should be preserved, and {value1} should be substituted
}


Crazy deep array stuff
{array_of_object{
- level1{array{
    -level2
        {value}}}}}