import assert, {strictEqual} from 'assert'

let hello_world_test = `
{
    "scripts/":{
        "hello_world.bat":{
            "_nim_template":"/templates/echoer.bat",
            "value_a":"hello",
            "value_b":"world"
        }
    }
}
`

import {run_nimplate} from '../nimplate.js'