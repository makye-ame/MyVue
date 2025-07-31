import { ref,watchEffect } from '../core.js'
import { parse, generate } from '../compiler.js';
import h from '../help.js'
const data = {
    message: '我是插值message',
    show: ref(true),
    btnText: ref('hide'),
    num: ref(0),
}
const hide = () => {
    data.show.value = !data.show.value
    data.btnText.value = data.show.value ? 'hide' : 'show'
}
const add = function (step = 1) {
    num.value = num.value + step
}
watchEffect(()=>{
    data.btnText.value = data.show.value ? 'hide' : 'show'
    console.log("btnTextbtnTextbtnTextbtnText:::",data.btnText.value)
})
export const context = { ...data, hide ,add}
export function generateExcute(template,$context={}) {
    const root = parse(template);
    const render = generate(root)
    //render.bind(context)
    const vnode = render.call(
        {...context,...$context},
        h.createVNode,
        h.createTextNode
    )
    return vnode
}