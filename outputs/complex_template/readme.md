This is just showing off some more complicated substitution
normally we do something like this

here is something false and true and the 42
there is nothing in these quotes "{something_null}"

you can get keys in objects like `{object.key1}`
if you try templating the object itself you get the JSON for it.
```json
{"key1":"value1","key2":"value2"}
```
or you can try unpeeling it layer by layer
first value value1, second value value2

but we can also use nested values like thisthat
as you can see they get combined together.
If we want a bit of formatting around those values, you can do this:
The array has these values:
- this
- that


this inner bit is repeated for each thing in the array thing
this inner bit is repeated for each thing in the array thing


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
    this text should be preserved, and this should be substituted
}


Crazy deep array stuff

- level1
    -level2
        deep
    -level2
        values
- level1
    -level2
        rule