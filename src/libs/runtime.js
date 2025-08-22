import h from './help.js'
import { parse, generate, tranform, PatchFlags } from './compiler.js'
import { watchEffect, reactive } from './core.js'
import { $domUpdate, $nextTick } from './scheduler.js'

// 参数1:组件配置对象component
// 参数2:组件节点的props属性
// 参数3:父组件实例_instance
const createComponentIntance = function (component, props = {}, _instance) {
    // 1.触发beforeCreate事件钩子
    if (component.beforeCreate) component.beforeCreate()
    // 2.根据template获取render函数
    const { template, render, setup } = component
    let renderFun = render
    // 编译模板
    if (!render && template) {
        const ast = parse(template)
        // 转化ast，进行优化操作
        tranform(ast)
        renderFun = generate(ast)
    }
    // 3.包装props为响应式
    const reactiveProps = reactive(props)
    // 4.初始化组件上下文context，也就是setup函数的返回值
    // 先构建setup函数的第2个参数ctx
    const ctx = {
        emit(eventStr, ...args) {
            // emit函数逻辑处理
            // 这里根据props找到父级的处理函数
            const method = props['on' + eventStr]
            if (method) {
                method(...args)
            }
        },
    }
    const context = setup?.(reactiveProps, ctx) || {}
    // 5.把响应式props挂载到context，方便模板中直接访问props中的数据
    context.props = reactiveProps
    // 6.绑定render函数执行的上下文context
    renderFun = renderFun.bind(context)
    // 7.生成组件实例
    const instance = {
        ...component,
        vnode: null, // 预留属性，后续挂载时生成，与组件的虚拟DOM树建立映射
        render: renderFun,
        context,
        props: reactiveProps,
    }
    // 8.建立组件父子映射，方便父子之间的通信
    instance.parent = _instance
    // 9.触发created事件钩子
    if (component.created) component.created(instance)
    // 10.返回实例 
    return instance
}
// 提供createApp方法创建应用实例
// 接收组件配置对象作为参数
export const createApp = function (component) {
    // 1.创建根组件实例
    const instance = createComponentIntance(component)
    // 2.实例提供mount方法
    instance.mount = function (selector) {
        const parentDom = document.querySelector(selector)
        // 3.挂载会作为响应式副作用执行，这样它会追踪其中所用到的所有响应式依赖。
        commonMount({ instance, parentDom })

    }
    // 4.提供unmount方法
    instance.unmount = function () {
        if (instance.isMounted) {
            // 触发app的beforeUnmount事件
            instance.beforeUnmount?.()
            const rootDom = instance.vnode.el.parentElement;
            removeDomByVnode(instance.vnode, rootDom);
            instance.isMounted = false;
            // 触发app的unmounted事件
            instance.unmounted?.()
        }

    }
    return instance
}
// 参数instance：当前挂载的组件实例
// 参数vnode：当前要挂载的虚拟dom节点
// 参数parentDom：指定要挂载的父元素
// 参数insertIndex：插入位置，指定要挂载的位置，可选参数，不传则挂载在末尾
const mount = function ({ instance, vnode, parentDom, insertIndex }) {
    // 如果当前虚拟dom是组件
    if (typeof vnode.tag === 'object') {

        // 1.创建子组件实例,节点的component属性指向组件实例
        const childIntance = createComponentIntance(vnode.tag, vnode.props, instance)

        vnode.component = childIntance
        // 2.挂载会作为响应式副作用执行，这样它会追踪其中所用到的所有响应式依赖。
        // watchEffect(() => {
        //     // 3.根据render渲染函数生成Vnode
        //     // 4.子组件实例与组件虚拟dom Vnode建立映射
        //     // 5.触发beforeMount生命周期钩子
        //     // 6.执行子组件挂载操作
        //     // 7.触发mounted生命周期钩子
        //     // 8.更新组件的挂载状态
        // })
        commonMount({ instance: childIntance, parentDom, insertIndex })
    } else {
        // 普通虚拟dom
        // 1.创建真实dom
        // 2.递归处理dom的子节点挂载
        // 3.插入dom
        createDomDuiGui({ instance, vnode, parentDom, insertIndex })
    }
}
const commonMount = function ({ instance, parentDom, insertIndex }) {
    // 2.挂载会作为响应式副作用执行，这样它会追踪其中所用到的所有响应式依赖。
    watchEffect(() => {
        // 判定实例状态，如果未挂载，则进行挂载操作，已挂载则进行更新
        if (!instance.isMounted) {
            // 3.根据render渲染函数生成Vnode
            const vnode = instance.render();
            // 4.子组件实例与组件虚拟dom Vnode建立映射            
            instance.vnode = vnode;
            // 5.触发beforeMount生命周期钩子
            instance.beforeMount?.(instance);
            // 6.执行子组件挂载操作
            mount({ instance, vnode, parentDom, insertIndex })
            // 7.触发mounted生命周期钩子
            instance.mounted?.(instance)
            // 8.更新组件的挂载状态
            instance.isMounted = true
        } else {
            // update
            
            //update(instance)
            $domUpdate(instance)
        }
    })
}
// 参数instance：当前挂载的组件实例
// 参数vnode：当前要挂载的虚拟dom节点
// 参数parentDom：父元素dom
// 参数insertIndex：插入位置，指定要挂载的位置，可选参数，不传则挂载在末尾
const createDomDuiGui = function ({ instance, vnode, parentDom, insertIndex }) {
    if (!vnode) return
   
    // 如果是静态节点
    if (vnode.isStatic) {
        vnode.mount(parentDom, insertIndex)
    } else {
        // 1.创建真实dom
        const dom = document.createElement(vnode.tag)

        // 设置dom属性
        for (let k in vnode.props) {
            const v = vnode.props[k]
            if (k === 'style') {
                // style属性值支持字符串和对象
                if (typeof v === 'object') {
                    for (let styleK in v) {
                        dom.style[styleK] = v[styleK]
                    }
                } else {
                    dom.style = v
                }
            } else if (k.startsWith('on')) {
                // 事件

                dom.addEventListener(k.slice(2), v)
            } else {
                dom.setAttribute(k, v)
            }
        }

        // 2.递归处理dom的子节点挂载
        // 设置子节点，因为静态容器的子节点是计算函数
        vnode.childrens = getDaynamicChildren(vnode, instance.context)

        vnode?.childrens?.forEach((child, key) => {
            if (typeof child !== 'object') {
                // 普通文本           
                dom.textContent += child
            } else if (child.tag || child.mount) {
                // 处理子节点的挂载
                mount({ instance, vnode: child, parentDom: dom, insertIndex: key })
            } else {
                dom.textContent += JSON.stringify(child)
            }
        })
        // 3.插入dom
        if (typeof insertIndex !== 'number' || insertIndex >= parentDom.childNodes.length) {
            parentDom.appendChild(dom)
        } else {
            const refNode = parentDom.childNodes[insertIndex]
            parentDom.insertBefore(dom, refNode)
        }
        // 虚拟节点与真实节点建立映射
        vnode.el = dom
    }


}
// 更新阶段
// 参数1:组件实例对象componentInstance
export const update = function (componentInstance) {
    // 1.触发beforeUpdate事件钩子
    if (componentInstance.beforeUpdate) componentInstance.beforeUpdate()
    // 2.获取旧的vnode树
    const oldVnode = componentInstance.vnode
    // 3.根据render函数获取新vnode树
    const newVnode = componentInstance.render()
    // 4.diff对比新旧节点，实现更新
    diff(oldVnode, newVnode, null, null, componentInstance)
    // 5.更新组件vnode树
    componentInstance.vnode = newVnode
    // 6.触发updated事件钩子
    if (componentInstance.updated) componentInstance.updated()
}
// 判断是不是相同节点
const isSameVNodeType = (v1, v2) => {
    return v1.props?.key === v2.props?.key && v1.tag === v2.tag
}
// 对比更新
// 参数1:旧的Vnode树
// 参数2:新的Vnode树
// 参数3:父节点
// 参数4:在父节点中插入的位置
const diffOld = function (oldVnodeTree, VnodeTree, parentDom, insertIndex) {
    // 节点相同不需要对比，直接返回
    if (oldVnodeTree === VnodeTree) return
    // 旧节点为文本节点，只是字符串
    if (typeof oldVnodeTree !== 'object') {
        // 新节点也是文本节点，更新文本内容
        if (typeof VnodeTree !== 'object') {
            parentDom.textContent = parentDom.textContent.replace(oldVnodeTree, VnodeTree)
        } else {
            // 旧节点是文本节点，新节点是非文本节点
            parentDom.textContent = parentDom.textContent.replace(oldVnodeTree, '')
            // 创建新节点
            mount({ vnode: VnodeTree, parentDom, insertIndex })
        }
        return
    }
    // 1. 如果节点不是同类型，直接删除创建新节点
    if (!isSameVNodeType(oldVnodeTree, VnodeTree)) {
        const parentDom = parentDom || oldVnodeTree.el?.parentElement
        // 删除旧节点        
        removeDomByVnode(oldVnodeTree, parentDom)
        // 创建新节点
        mount({ vnode: VnodeTree, parentDom, insertIndex })
        return
    } else if (JSON.stringify(oldVnodeTree.props) !== JSON.stringify(VnodeTree.props)) {
        const oldProps = oldVnodeTree.props
        const newProps = VnodeTree.props
        // 2. 如果节点是同类型，属性有变化，且节点是普通节点，需要更新节点dom属性

        if (typeof VnodeTree.tag !== 'object') {
            const dom = oldVnodeTree.el
            Object.keys(oldProps).forEach((k) => {
                if (oldProps[k] !== newProps[k]) {
                    const v = newProps[k]
                    if (k === 'style') {
                        for (let styleK in v) {
                            if (dom.style[styleK] !== v[styleK]) {
                                dom.style[styleK] = v[styleK]
                            }
                        }
                    } else {
                        dom.setAttribute(k, v)
                    }
                }
            })

        } else {
            // 3. 如节点是组件节点，需要更新组件响应式props(响应式props更新后，会自动触发组件的更新)
            // 属性只会有值变化，不会有新增和删减
            // 这里注意！！！！如果获取子组件的响应式props的属性，会被get劫持，从而父级的副作用会被设置成子级props的副作用了
            // 所以这里直接设置子组件的响应式props的属性即可，避免获取
            const reativeProps = oldVnodeTree.component?.props  // 此时el指向组件实例
            Object.keys(newProps).forEach((k) => {
                reativeProps[k] = newProps[k]
            })
        }
    }
    // 4.设置vnode与dom或者组件的映射关系
    setVnodeDomMap({ vnode: VnodeTree, el: oldVnodeTree.el, component: oldVnodeTree.component })
    // 5. 处理子节点
    diffChildren(oldVnodeTree.childrens || [], VnodeTree.childrens || [], oldVnodeTree.el)
}
// 对比更新
// 参数1:旧的Vnode树
// 参数2:新的Vnode树
// 参数3:父节点
// 参数4:在父节点中插入的位置
const diff = function (oldVnodeTree, VnodeTree, parentDom, insertIndex, instance) {

    // 静态节点和静态容器都是用的缓存，所以一定相等
    // 静态节点可以直接返回，但静态容器还需要对比子节点
    if (oldVnodeTree === VnodeTree) {
        if (oldVnodeTree.patchFlag === PatchFlags.CHILDREN) {
            // 获取动态子节点
            const childrens = getDaynamicChildren(VnodeTree, instance.context)
            diffChildren(oldVnodeTree.childrens || [], childrens || [], oldVnodeTree.el, instance)
            // 对比完成后再重置childrens
            VnodeTree.childrens = childrens
        }
        return
    }
    if (!isSameVNodeType(oldVnodeTree, VnodeTree)) {
        // 1. 如果节点不是同类型，直接删除创建新节点
        // 删除旧节点
        (parentDom || dom.parentElement).removeChild(dom)
        // 创建新节点
        mount({ vnode: VnodeTree, parentDom, insertIndex, instance })
        return
    } else {
        const dom = oldVnodeTree.el
        const reativeProps = oldVnodeTree?.component?.props  // 如果此时el指向组件实例
        // 动态文本
        if (oldVnodeTree.patchFlag & PatchFlags.TEXT) {
            const newText = VnodeTree.childrens.join("")
            const oldText = oldVnodeTree.childrens.join("")
            if (oldText !== newText) {
                dom.innerText = newText
            }

        }
        // dom属性有更新
        const oldProps = oldVnodeTree.props
        const newProps = VnodeTree.props
        // 动态class
        if (oldVnodeTree.patchFlag & PatchFlags.CLASS) {
            if (oldProps.class !== newProps.class) {
                typeof VnodeTree.tag === 'object' ? reativeProps.class = newProps.class : dom.setAttribute('class', newProps.class)
            }
        }
        // 动态样式
        if (oldVnodeTree.patchFlag & PatchFlags.STYLE) {
            const newStyle = VnodeTree.props.style
            for (let styleK in newStyle) {
                if (dom.style[styleK] !== newStyle[styleK]) {
                    typeof VnodeTree.tag === 'object' ? (reativeProps.style[styleK] = newStyle[styleK]) : (dom.style[styleK] = newStyle[styleK])
                }
            }
        }
        // 动态属性
        if (oldVnodeTree.patchFlag & PatchFlags.PROPS) {
            // 只遍历动态属性，非动态的不处理
            const dynamicProps = oldVnodeTree.$dynamicProps
            dynamicProps.forEach((k) => {
                if (oldProps[k] !== newProps[k]) {
                    const v = newProps[k]
                    typeof VnodeTree.tag === 'object' ? (reativeProps[k] = v) : dom.setAttribute(k, v)
                }
            })
        }
        if (oldVnodeTree.patchFlag & PatchFlags.HYDRATE_EVENTS) {
            // 在目前我们模拟的情况下，事件处理函数不会变化，所以这里暂不写逻辑
        }
        if (oldVnodeTree.patchFlag & PatchFlags.DYNAMIC_DIRECTIVES) {
            // 在目前我们模拟的情况下，只实现了v-if指令，这个指令的逻辑在generate时就处理过了，所以这里暂不写逻辑
        }
        // 设置vnode与dom或者组件的映射关系
        setVnodeDomMap({ vnode: VnodeTree, el: oldVnodeTree.el, component: oldVnodeTree.component })
        // 处理子节点
        if (oldVnodeTree.patchFlag & PatchFlags.CHILDREN) {
            // 设置新节点的子节点
            const childrens = getDaynamicChildren(VnodeTree, instance.context)
            diffChildren(oldVnodeTree.childrens || [], childrens || [], oldVnodeTree.el, instance)
            // 对比完成后再重置childrens
            VnodeTree.childrens = childrens
        }
    }
}
// 设置子节点
// 如果节点的子节点是计算函数，执行函数获取真正的子节点
const getDaynamicChildren = function (vnode, context) {
    if (vnode.patchFlag === PatchFlags.CHILDREN && typeof vnode.getChildrens === 'function') {
        // 绑定执行上下文
        const func = vnode.getChildrens.bind(context)
        return func()
    } else {
        return vnode.childrens
    }
}
// 参数1：旧的子节点列表
// 参数2：新的子节点列表
// 参数3：父节点dom
const diffChildren = function (oldChildren, newChildren, parentDom, instance) {
    if (oldChildren.length <= 0 && newChildren.length <= 0) return
    // 1.两端进行对比
    let start = 0;
    let oldEnd = oldChildren.length - 1
    let newEnd = newChildren.length - 1
    const minLength = Math.min(oldChildren.length, newChildren.length)

    while (start < minLength && isSameVNodeType(oldChildren[start], newChildren[start])) {
        diff(oldChildren[start], newChildren[start], parentDom, start, instance)
        start++
    }

    while (
        start <= oldEnd &&
        start <= newEnd &&
        isSameVNodeType(oldChildren[oldEnd], newChildren[newEnd])
    ) {
        diff(oldChildren[oldEnd], newChildren[newEnd], parentDom, oldEnd, instance)
        oldEnd--
        newEnd--
    }
    // 2.如果列表已经对比完毕，处理新增和删除
    if (start > oldEnd && newEnd > oldEnd) {
        // 新增
        for (let i = start; i <= newEnd; i++) {
            mount({ vnode: newChildren[i], parentDom, insertIndex: i, instance })
        }
    } else if (start >= newEnd && oldEnd > newEnd) {
        // 删除
        for (let i = start; i <= oldEnd; i++) {
            removeDomByVnode(oldChildren[i], parentDom)
        }
    } else if (!(start > oldEnd && start > newEnd)) {
        // 3.如果还有剩余不同节点，处理剩余节点
        // a. 对新节点建立key和位置的映射表
        // 要用map存储，map才是有序的
        const keyToNewIndexMap = new Map()
        newChildren.slice(start, newEnd + 1).forEach((item, i) => {
            if (item) {
                const key =
                    typeof item.props.key !== 'undefined' ? item.props.key : `__temp_key_${i + start}`
                // 根据key值建立映射对象，对象包含新的位置(position)，是否已经比对更新过(hasDiff)，真实dom节点(el)
                keyToNewIndexMap.set(key, { position: i + start, hasDiff: false, el: null, component: null })
            }
        })
        // b. 遍历旧节点，映射表里找不到的旧节点表示应该删除，找到的进行对比更新，记录更新状态、更新虚拟dom的el指向新的dom节点
        oldChildren.slice(start, oldEnd + 1).forEach((item, i) => {
            if (item) {
                const key =
                    typeof item.props.key !== 'undefined' ? item.props.key : `__temp_key_${i + start}`
                const mapEntry = keyToNewIndexMap.get(key)
                if (mapEntry) {
                    // 找到了 key，进行属性更新
                    const newIndex = mapEntry.position
                    diff(item, newChildren[newIndex], parentDom, i, instance)
                    // 改变对比更新状态
                    mapEntry.hasDiff = true
                    // 重新建立mapEntry与dom或者组件的映射关系
                    setVnodeDomMap({ vnode: mapEntry, el: item.el, component: item.component })

                } else {
                    // 找不到表示节点应该删除
                    removeDomByVnode(item, parentDom)
                }
            }
        })
        // c.映射表里剩余的节点，表示新增节点
        keyToNewIndexMap.values().forEach((entry) => {
            if (!entry.hasDiff) {
                mount({
                    vnode: newChildren[entry.position],
                    parentDom,
                    insertIndex: entry.position,
                    instance
                })
                setVnodeDomMap({ vnode: entry, el: newChildren[entry.position].el, component: newChildren[entry.position].component })
            }
        })
        // d.处理位置的移动，采用LIS算法进行最小移动
        // 找到新节点在原队列里的位置
        const oldPositions = []
        const parentChildren = Array.from(parentDom.children || [])
        keyToNewIndexMap.values().forEach((entry) => {
            const el = entry.el || entry.component.vnode.el
            // 根据key找到虚拟dom对应的原位置
            const indexInParent = parentChildren.indexOf(el)
            oldPositions.push(indexInParent)
        })
        if (oldPositions.length <= 0) return
        // 找到原位置的最长递增子序列
        // 不在递增子序列的才是需要移动的
        const noRemoveIndex = findLIS(oldPositions)
        let index = 0
        const needRemoveArray = []
        keyToNewIndexMap.values().forEach((entry) => {
            if (noRemoveIndex.indexOf(index) < 0) {
                // 需要移动，先删除dom，后面再一起插入 
                // 不然已经存在的需要移动的dom霸占了位置，就可能导致insertBefore移动时位置是错的  
                //???   这个代码还真需要，可是这样不合情理，组件不应该被卸载          
                removeDomByVnode(entry, parentDom)
                needRemoveArray.push(entry)
            }
            index++
        })
        // 按插入位置从前往后排序
        const sortedArray = needRemoveArray.sort((a, b) => a.position - b.position)
        sortedArray.forEach((item) => {
            const { el, position } = item
            insertDomByVnode(item, parentDom, position)
        })
    }

}
// 找出最长递增子序列（LIS）
function findLIS(arr) {
    const tails = [];
    const indices = new Array(arr.length);

    arr.forEach((num, i) => {
        let left = 0, right = tails.length;
        while (left < right) {
            const mid = (left + right) >> 1;
            tails[mid] < num ? left = mid + 1 : right = mid;
        }
        indices[i] = left;
        tails[left] = num;
    });

    let lisLength = tails.length;
    const result = [];
    for (let i = arr.length - 1; i >= 0; i--) {
        if (indices[i] === lisLength - 1) {
            result.unshift(i);
            lisLength--;
        }
    }
    return result;
}
export { findLIS }
// 设置虚拟节点与真实节点的映射
function setVnodeDomMap({ vnode, el, component }) {
    if (el) {
        vnode.el = el
    }
    if (component) {
        vnode.component = component
    }
}
// 根据虚拟节点移除真实dom
// 这里有一个注意点：删除操作是先逻辑-后dom，也就是说先执行unmount，然后才删除真实dom
// 这样在unmount函数里依然可以访问到dom，另外组件的事件监听（如 window.scroll）、计时器等资源，需要在 DOM 移除前清理，否则会残留引用，导致内存泄漏。
// 如果子节点里有组件，需要递归处理子组件的卸载，但是dom的删除统一删除父节点即可！
function removeDomByVnode(vnode, parentDom) {
    // 先逻辑删除
    unmountComponent(vnode)
    // 后删除真实dom
    const dom = vnode.el || vnode.component?.vnode?.el;
    parentDom.removeChild(dom);
}
function unmountComponent(vnode) {
    // 1.触发 beforeUnmount 钩子    
    vnode?.component?.beforeUnmount?.();
    // 2. 递归处理子组件
    if (vnode.childrens && vnode.childrens.length > 0) {
        vnode.childrens.forEach(child => {
            unmountComponent(child)
        });
    }
    // 3.触发 unmounted 钩子    
    vnode?.component?.unmounted?.();

}
// 根据虚拟节点插入dom
function insertDomByVnode(vnode, parentDom, insertIndex) {
    const dom = vnode.el || vnode.component?.vnode?.el
    const refNode = parentDom.childNodes[insertIndex]
    if (refNode) {
        parentDom.insertBefore(dom, refNode)
    } else {
        // 尾部追加节点
        parentDom.appendChild(dom)
    }
}