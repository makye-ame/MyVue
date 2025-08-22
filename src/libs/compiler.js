
import h from './help.js'
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
// 二.transform转化
export const tranform = function (ast) {
    // 更新类型标记
    markPatchFlag(ast)
    // 静态缓存
    staticNodeCache(ast)
    staticContainerNodeCache(ast)
}
export const PatchFlags = {
    // 特殊标记：静态提升节点
    HOISTED: -1,
    // 0b00000001 - 动态文本内容（如{{ msg }}）
    TEXT: 1,
    // 0b00000010 - 动态class绑定（如:class="{ active }"）
    CLASS: 1 << 1,    // 2
    // 0b00000100 - 动态style绑定（如:style="styles"）
    STYLE: 1 << 2,    // 4
    // 0b00001000 - 动态props（非class/style的普通属性）
    PROPS: 1 << 3,   // 8
    // 0b10000 -动态子节点
    CHILDREN: 1 << 4,    //16
    // 0b100000 动态事件
    HYDRATE_EVENTS: 1 << 5,  //32
    // 0b1000000 动态指令
    DYNAMIC_DIRECTIVES: 1 << 6  //64
    // ...
}
const markPatchFlag = function (ast) {
    // 如果节点类型是元素
    if (ast.type === TYPE.ELEMENT) {
        ast.patchFlag = 0
        for (let key in ast.attrs) {
            const value = ast.attrs[key]
            // 动态事件
            if (value.function) {
                ast.patchFlag |= PatchFlags.HYDRATE_EVENTS
            }
            if (value.exp) {
                // 动态指令
                if (value.type === TYPE.DIRECTIVE) {
                    ast.patchFlag |= PatchFlags.DYNAMIC_DIRECTIVES
                } else if (value.type === TYPE.ATTRIBUTE) {
                    // 动态class
                    if (value.name === 'class') {
                        ast.patchFlag |= PatchFlags.CLASS
                    } else if (value.name === 'style') {
                        // 动态样式
                        ast.patchFlag |= PatchFlags.STYLE
                    } else {
                        // 动态属性
                        ast.patchFlag |= PatchFlags.PROPS
                        // 收集动态属性
                        if (!ast.dynamicProps) {
                            ast.dynamicProps = []
                        }
                        ast.dynamicProps.push(key)
                    }

                }
            }
        }
    } else if (ast.type === TYPE.INTERPOLATION) {
        // 动态文本
        ast.parent.patchFlag |= PatchFlags.TEXT
    }
    // 处理子节点
    ast.children?.forEach((child) => {
        const childPathcFlag = markPatchFlag(child)
        if (childPathcFlag && childPathcFlag !== PatchFlags.HOISTED) {
            ast.patchFlag |= PatchFlags.CHILDREN
        }
    })
    // 该节点为静态节点
    if (ast.patchFlag === 0) {
        ast.patchFlag = PatchFlags.HOISTED
        ast.isDynamic = false
    } else if (ast.patchFlag) {
        ast.isDynamic = true
    }
    return ast.patchFlag
}
// 静态节点缓存列表
let hoistedList = []
// 静态容器节点缓存列表：本身是静态，但有动态子节点
let hoistedContainerList = []
// v-for指令下的静态容器不要提升变量缓存！！！
// 用栈存储v-for指令
const vforStack = []
const staticContainerNodeCache = function (ast) { 
    // 入栈   
    if (ast.attrs?.['v-for']) {
        vforStack.push(ast)
    }
    if (ast.patchFlag === PatchFlags.CHILDREN) {       
        // v-for栈为空，则不在v-for指令下
        if (vforStack.length === 0) {
            hoistedContainerList.push(ast)
            // 缓存静态容器节点的索引,这样静态容器节点和变量才可以关联起来
            ast.hoistedContainerIndex = hoistedContainerList.length - 1
        }
    }
    if (ast.children && ast.children.length > 0) {
        // 递归处理子节点
        ast.children.forEach((child) => {
            staticContainerNodeCache(child)
        })
    }
    // 出栈
    if (ast.attrs?.['v-for']) {
        vforStack.pop()
    }
}
const staticNodeCache = function (ast) {
    // 判断是否是静态节点
    if (!ast.isDynamic && ast.patchFlag === PatchFlags.HOISTED) {
        ast.isStatic = true
        hoistedList.push(serializeNode(ast))
        // 缓存静态节点的索引,这样静态节点和变量才可以关联起来
        ast.hoistedIndex = hoistedList.length - 1
    } else if (ast.children && ast.children.length > 0) {
        // 递归处理子节点
        ast.children.forEach((child) => {
            staticNodeCache(child)
        })
    }
}
// 将静态节点序列化为模板字符串
const serializeNode = function (ast) {
    // 文本节点直接返回
    if (ast.type === TYPE.TEXT) {
        return ast.value
    }
    // 处理属性
    const propsArray = []
    for (let k in ast.attrs) {
        const v = ast.attrs[k]?.value
        propsArray.push(`${k} = "${v}"`)
    }
    const propsStr = propsArray.join(" ")
    if (ast.isCloseSelf) {
        return `<${ast.tag} ${propsStr}/>`
    } else {
        // 处理子节点
        let childrenArray, childrenStr = ''
        if (ast.children) {
            childrenArray = ast.children.map((child) => {
                return serializeNode(child)
            })
            childrenStr = childrenArray.join("")
        }
        return `<${ast.tag} ${propsStr}>${childrenStr}</${ast.tag}>`
    }
}

// 三.生成render函数
export const generate = function (ast) {
    // 生成静态节点变量声明

    const hoistedDeclarations = hoistedList.map((item, i) => {
        return `const _hoisted_${i} = createStaticNode('${item}')`
    }).join(';\n')
    // 重置静态节点列表
    hoistedList = []
    // 生成静态容器节点变量声明
    const hoistedContainerDeclarations = getHoistedContainerDeclarations()
    hoistedContainerList = []

    // 递归处理ast
    const resultStr = digui(ast)
    // 把字符串转成真实的函数
    // 把变量提取到render函数之外
    // 这里的render函数写法要注意不要用箭头函数，不然上下文this会有问题

    const funcStr = `
        ${hoistedDeclarations}
        ${hoistedContainerDeclarations}
        const render = function(){
           return ${resultStr}
        }
        return render
    `

    const func = new Function('createVNode', 'createTextNode', 'createStaticNode', funcStr)
    const renderFunc = func(h.createVNode, h.createTextNode, h.createStaticNode)
    return renderFunc
}
function getHoistedContainerDeclarations() {
    let containerDeclarations = ''
    // 需要倒序遍历，子容器节点变量申明后，父容器节点才能使用该变量作为子节点
    for (let i = hoistedContainerList.length - 1; i >= 0; i--) {
        const node = hoistedContainerList[i]
        const attrsStr = getPropsStr(node)
        const tagStr = getTag(node.tag)
        const childrenStr = getChildrenStr(node)
        const declaration = `const _hoisted_container_${i} = createVNode(${tagStr},${attrsStr},${childrenStr},${node.patchFlag});\n`
        containerDeclarations += declaration
    }
    return containerDeclarations
}
function getChildrenStr(node) {
    let childrenStr = ''

    // 所有直接子节点都是静态的（这个静态包括静态容器）
    let allChildStatic = true
    childrenStr = node?.children?.map(child => {
        if (child.patchFlag === PatchFlags.CHILDREN && child.hoistedContainerIndex !== undefined) { // 增加判断：hoistedContainerIndex不为undefined
            // 如果是静态容器
            return `_hoisted_container_${child.hoistedContainerIndex}`
        } else if (child.isStatic) {
            // 如果是静态节点
            return `_hoisted_${child.hoistedIndex}\n`
        } else {
            allChildStatic = false
            // 动态节点
            const vnode = digui(child)
            return vnode
        }

    }).join(',') || `[]`

    const isAlreadyArray = /^this\..*\.map/.test(childrenStr) || childrenStr.startsWith('[');
    if (!isAlreadyArray) {
        childrenStr = `[${childrenStr}]`
    }
    // 如果有动态子节点，返回计算函数;
    if (allChildStatic) {
        return childrenStr
    } else {
        return `function(){
            return ${childrenStr}
        }`
    }
}
function digui(obj) {
    let str = ''
    if (obj.isStatic) {
        // 静态节点
        // 根据索引得到变量名
        str += `_hoisted_${obj.hoistedIndex}\n`
    } else if (obj.patchFlag === PatchFlags.CHILDREN && obj.hoistedContainerIndex !== undefined) {  // 增加判断：hoistedContainerIndex不为undefined

        // 静态容器
        str += `_hoisted_container_${obj.hoistedContainerIndex}\n`
    } else {
        // 动态节点
        // 对于不同的type，处理逻辑不同，文本和插槽比较简单，创建一个文本虚拟dom即可；
        // ELEMENT比较复杂，需要拼接子节点字符串，属性字符串，而属性还包括指令的处理(这里只简单模拟v-if)再创建一个元素虚拟dom
        switch (obj.type) {
            case TYPE.ROOT:
            case TYPE.ELEMENT:
                // 拼接子节点字符串
                let childStr = obj.children?.length > 0
                    ? obj.children.map((child) => digui(child)).join(', ')
                    : '[]';
                const isAlreadyArray = /^this\..*\.map/.test(childStr) || childStr.startsWith('[');
                if (!isAlreadyArray) {
                    childStr = `[${childStr}]`
                }
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
                    str += `(${v}) ? createVNode(${tagStr}, ${attrsStr}, ${childStr},${obj.patchFlag})\n : ''`
                } else if (obj.attrs?.hasOwnProperty('v-for')) {
                    // 增加v-for指令的处理
                    const v = obj.attrs['v-for'].exp;
                    const exp = /(.+) in (\w+)/;
                    const match = v.match(exp);

                    if (!match || match.length < 3) {
                        throw new Error('v-for 表达式格式不正确，应为 "item in items"');
                    }

                    const [_, alias, source] = match;
                    const keyExp = obj.attrs['key']?.exp || 'item';

                    // v-for 生成的 childStr 是一个数组表达式
                    const tagStr = getTag(obj.tag)
                    // v-for会生成新的作用域
                    // 这里用闭包的方式把新的作用域传递到里面去
                    const vforStr = `this.${source}?.map((${alias})=> {
                        return createVNode(${tagStr}, { key: ${keyExp} }, ${childStr},${obj.patchFlag})                                         
                })\n`;

                    str += vforStr;
                } else {
                    // 无指令的普通情况
                    str += `createVNode(${tagStr}, ${attrsStr}, ${childStr},${obj.patchFlag})\n`
                }
                break;
            case TYPE.TEXT:
                str += `createTextNode('${obj.value}')`
                break;
            case TYPE.INTERPOLATION:
                str += `createTextNode(${getExpStr(obj.exp)})`
                break;
        }
    }
    return str
}

const getPropsStr = function (obj) {
    const attrs = obj?.attrs
    if (!attrs) return
    let returnStr = ''
    // 动态属性处理
    if (obj.dynamicProps?.length > 0) {
        returnStr += `$dynamicProps:${JSON.stringify(obj.dynamicProps)},`
    }
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
                returnStr += `${attr.name}:(event)=>this.${funName}(${args}),`
            } else {
                returnStr += `${attr.name}:this.${attr.function},`
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
    // 这里是最简单的模拟，没有考虑过多
    // 当前环境下直接取值，v-for会开启新的块作用域    
    const currentExp = `(typeof ${exp} !== 'undefined' ? ${exp} : undefined)`
    // 从当前上下文中取值，考虑值为ref的情况
    const thisExp = `(this.${exp}?.value ?? this.${exp})`;
    // 从props里取值,在vue里，会把props封装成reactive对象
    const propExp = `(this.props?.${exp})`
    // 优先取当前作用域下的值，最后是props的值    
    return `(${currentExp} ?? ${thisExp} ?? ${propExp})`;
}

// 获取tag字符串
// tag可以是普通dom，也可以是组件
// 组件需要注册，但在组合式写法里，组件通过setup返回，模版中即可使用。
// 我们这里假设组件通过setup返回后和data一样，直接挂在this下
const getTag = function (tag) {
    return `this.${tag} ?? '${tag}'`
}

