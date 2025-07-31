
const TYPE = {
    ROOT: 'root',
    ELEMENT: 'element',  // 元素
    TEXT: 'text',  // 文本
    INTERPOLATION: 'interpolation',  // 插值
    DIRECTIVE: 'directive',  // 指令
    ATTRIBUTE: 'attribute',  // 属性
    EVENT: 'event' //事件
}
export const parse = function (template) {
    let i = 0
    const root = { type: TYPE.ROOT, tag: 'div', children: [] }
    let current = root
    template = template.trim()
    // 开始标签正则
    const startTagReg = /<(\w+)([^>]*)(\/?)>/
    // 结束标签正则
    const endTagREg = /<\/(\w+)>/
    // 插值正则
    const interReg = /{{([^}]+)}}/
    while (i < template.length) {
        const tempStr = template.slice(i)
        if (template[i] === '<') {
            const startMatch = tempStr.match(startTagReg)
            // 先判定是否是结束标签，结束标签重要逻辑是回到父级，不需要新增节点
            if (template[i + 1] === "/") {
                const endMatch = tempStr.match(endTagREg)
                // 如果结束标签和当前标签不匹配，或者没有父节点，抛出异常
                if (endMatch[1] !== current.tag || !current.parent) {
                    throw new Error('模板不合法')
                } else {
                    current = current.parent
                    i = i + endMatch[0].length
                }
            } else if (startMatch) {
                // 开始标签。重要逻辑是添加节点，节点类型是元素
                const obj = {
                    type: TYPE.ELEMENT,
                    tag: startMatch[1],
                    children: [],
                    parent: current // 保持对父节点的引用
                }
                obj.attrs = getAttributes(startMatch[2])
                // 自结束标签
                if (startMatch[3]) {
                    obj.isCloseSelf = true
                }
                // 添加节点，父子节点建立双向映射
                current.children.push(obj)
                // 更新当前操作节点
                current = obj
                i = i + startMatch[0].length
            } else {
                throw new Error('模板不合法')
            }
        } else if (template[i] === '{' && template[i + 1] === '{') {
            // 文本差值，重要逻辑是添加节点，节点类型是插值,没有子节点
            const interMatch = tempStr.match(interReg)
            if (interMatch) {
                const obj = {
                    type: TYPE.INTERPOLATION,
                    exp: interMatch[1].trim(),
                    parent: current
                }
                current?.children?.push(obj)
            } else {
                throw new Error('模板不合法')
            }
            i = i + interMatch[0].length
        } else {
            // 普通文本，重要逻辑是添加节点，节点类型是文本,没有子节点
            // 找到下一个标签或者插值位置
            const aIndex = tempStr.indexOf('<')
            const bIndex = tempStr.indexOf('{{')
            const temp = (aIndex >= 0 && bIndex >= 0) ? Math.min(aIndex, bIndex) : Math.max(aIndex, bIndex)
            if (temp < 0) {
                throw new Error('模板不合法')
            }
            const text = template.slice(i, i + temp).trim()
            if (text) {
                const obj = {
                    type: TYPE.TEXT,
                    value: text,
                    parent: current
                }
                current?.children?.push(obj)
            }
            i = i + temp
        }
    }
    console.log("parse：", root)
    return root
}
// 获取节点属性
const getAttributes = function (attrStr) {
    if (!attrStr) return
    const resultObj = {}
    const regex = /([^=\s]+)=?("([^"]*)"|'([^']*)')?/g;
    let match;
    while ((match = regex.exec(attrStr)) !== null) {
        let [name, _1, _2, _3] = match.slice(1);
        let value = (_3 || _2 || _1).trim()
        name = name?.trim()
        if (name.startsWith("@")) {
            // 事件     
            resultObj['on' + name.substring(1)] = {
                type: TYPE.EVENT,
                name: 'on' + name.substring(1),
                function: value
            }
        } else if (name.startsWith("v-")) {
            // 指令
            resultObj[name] = {
                type: TYPE.DIRECTIVE,
                name: name,
                exp: value
            }
        } else if (name.startsWith(":")) {
            // 动态属性
            resultObj[name.substring(1)] = {
                type: TYPE.ATTRIBUTE,
                name: name.substring(1),
                exp: value
            }
        } else {
            // 普通属性
            resultObj[name] = {
                type: TYPE.ATTRIBUTE,
                name,
                value
            }
        }
    }
    return resultObj
}


// 三.生成render函数
export const generate = function (ast) {
    // 递归处理ast
    const resultStr = digui(ast)
    console.log("render函内容：",resultStr)
    const func = new Function('createVNode', 'createTextNode', `return ${resultStr}`)
    return func
}
function digui(obj) {
    let str = ''
    // 对于不同的type，处理逻辑不同，文本和插槽比较简单，创建一个文本虚拟dom即可；
    // ELEMENT比较复杂，需要拼接子节点字符串，属性字符串，而属性还包括指令的处理(这里只简单模拟v-if)再创建一个元素虚拟dom
    switch (obj.type) {
        case TYPE.ROOT:
        case TYPE.ELEMENT:
            // 拼接子节点字符串
            let childStr = obj?.children?.map((child, i) => digui(child, i)).join(', ')
            childStr = childStr ? `[${childStr}]` : '[]'
            // 拼接属性字符串
            // 指令处理
            // 获取属性字符串
            const attrsStr = getPropsStr(obj)
            // 获取tag字符串
            const tagStr = getTag(obj.tag)
            if (obj.attrs?.['v-if']) {
                // v-if指令 
                // 获取指令的值
                const v = getExpStr(obj.attrs['v-if'].exp)
                // 如果值为true才创建虚拟dom，否则返回空字符
                str += `(${v}) ? createVNode(${tagStr}, ${attrsStr}, ${childStr},${obj.patchFlag}) : ''`
            } else {
                // 无指令的普通情况
                str += `createVNode(${tagStr}, ${attrsStr}, ${childStr},${obj.patchFlag})`
            }
            break;
        case TYPE.TEXT:
            str += `createTextNode('${obj.value}')`
            break;
        case TYPE.INTERPOLATION:
            str += `createTextNode(${getExpStr(obj.exp)})`
            break;
    }
    return str
}

const getPropsStr = function (obj) {
    const attrs = obj?.attrs
    if (!attrs) return
    let returnStr = ''    
    Object.values(attrs).forEach((attr) => {
        if (!attr.name) return
        // 属性
        if (attr.type === TYPE.ATTRIBUTE) {
            if (attr.exp) {
                // 动态属性
                returnStr += `${attr.name}:${getExpStr(attr.exp)},`
            } else {
                // 普通属性
                returnStr += `${attr.name}:'${attr.value}',`
            }
        } else if (attr.type === TYPE.EVENT) {
            //事件
            const match = attr.function.match(/(.+)\((.*)\)/)
            // 如果事件处理器有传递参数，需要特殊处理
            let args = match?.[2].trim()
            if (args) {
                // 参数的最后追加event
                args = args ? `${args},event` : 'event'
                const funName = match?.[1]
                returnStr += `${attr.name}:(event)=>${getExpStr(funName)}(${args}),`
            } else {
                returnStr += `${attr.name}:${getExpStr(attr.function)},`
            }
        } else {
            // 其他指令 暂不模拟
        }
    })
    if (returnStr.endsWith(",")) {
        returnStr = returnStr.substr(0, returnStr.length - 1)
    }
    returnStr = `{${returnStr}}`
    return returnStr
}
// 获取动态值的字符串
const getExpStr = function (exp) {
    // 从当前作用域下取值，考虑值为ref的情况
    const thisExp = `(this.${exp}?.value ?? this.${exp})`;
    // 从props里取值,在vue里，会把props封装成reactive对象
    const propExp = `(this.props?.${exp})`
    // 优先取当前作用域下的值，最后是props的值    
    return `(${thisExp} ?? ${propExp})`;
}

// 获取tag字符串
// tag可以是普通dom，也可以是组件
// 组件需要注册，但在组合式写法里，组件通过setup返回，模版中即可使用。
// 我们这里假设组件通过setup返回后和data一样，直接挂在this下
const getTag = function (tag) {
    return `this.${tag} ?? '${tag}'`
}

