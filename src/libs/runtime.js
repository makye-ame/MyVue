import h from './help.js'
import { parse, generate } from './compiler.js'
import { watchEffect, reactive } from './core.js'
import { $domUpdate } from './scheduler.js'
// 参数1:组件配置对象component
// 参数2:组件节点的props属性
// 参数3:父组件实例_instance
const createComponentIntance = function (component, props, _instance) {
    // 1.触发beforeCreate事件钩子
    if (component.beforeCreate) component.beforeCreate()
    // 2.根据template获取render函数
    const { template, render, setup } = component
    let renderFun = render
    // 编译模板
    if (!render && template) {
        const ast = parse(template)
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
    const context = setup(reactiveProps, ctx)
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
    return instance
}
// 参数instance：当前挂载的组件实例
// 参数vnode：当前要挂载的虚拟dom节点
// 参数parentDom：指定要挂载的父元素
// 参数insertIndex：插入位置，指定要挂载的位置，可选参数，不传则挂载在末尾
const mount = function ({ instance, vnode, parentDom, insertIndex }) {
    // 如果当前虚拟dom是组件
    if (typeof vnode.tag === 'object') {
        // todo...
        // 1.创建子组件实例,节点的component属性指向组件实例
        const childIntance = createComponentIntance(vnode.tag, vnode.props, instance)

        vnode.component = childIntance
        // 2.挂载会作为响应式副作用执行，这样它会追踪其中所用到的所有响应式依赖。
        // watchEffect(() => {
        //     // 3.根据render渲染函数生成Vnode
        //     // 4.子组件实例与组件虚拟dom Vnode建立双向映射
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
            const vnode = instance.render(h.createVNode, h.createTextNode);
            // 4.子组件实例与组件虚拟dom Vnode建立双向映射
            // todo...
            // vnode.component = instance;
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
            console.log("监测到更新", instance.name)
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
    let dom
    // 1.创建真实dom
    dom = document.createElement(vnode.tag)
    // 虚拟节点与真实节点建立映射
    vnode.el = dom
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
    vnode?.childrens?.forEach((child, key) => {
        if (typeof child !== 'object') {
            // 普通文本
            dom.innerText += child
        } else if (child.tag || child.mount) {
            // 处理子节点的挂载
            mount({ instance, vnode: child, parentDom: dom, insertIndex: key })
        } else {
            dom.innerText += JSON.stringify(child)
        }
    })

    // 3.插入dom
    if (typeof insertIndex !== 'number' || insertIndex >= parentDom.childNodes.length) {
        parentDom.appendChild(dom)
    } else {
        const refNode = parentDom.childNodes[insertIndex]
        parentDom.insertBefore(dom, refNode)
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
    const newVnode = componentInstance.render(h.createVNode, h.createTextNode)
    // 4.diff对比新旧节点，实现更新
    diff(oldVnode, newVnode)
    // 5.更新组件vnode树
    componentInstance.vnode = newVnode
    // 6.触发updated事件钩子
    if (componentInstance.updated) componentInstance.updated()
}
// 判断是不是相同节点
const isSameVNodeType = function (vnode1, vnode2) {
    // 有key值判定key值是否相同
    if (typeof vnode1.props?.key !== 'undefined' || typeof vnode2.props?.key !== 'undefined') {
        return vnode1.props?.key === vnode2.props?.key
    } else {
        // 没有key值判定tag是否一致
        return vnode1.tag === vnode2.tag
    }
}
// 对比更新
// 参数1:旧的Vnode树
// 参数2:新的Vnode树
// 参数3:父节点
// 参数4:在父节点中插入的位置
const diff = function (oldVnodeTree, VnodeTree, parentDom, insertIndex) {
    // 节点相同不需要对比，直接返回
    if (oldVnodeTree === VnodeTree) return
    // 旧节点为文本节点，只是字符串
    if (typeof oldVnodeTree !== 'object') {
        // 新节点也是文本节点，更新文本内容
        if (typeof VnodeTree !== 'object') {
            parentDom.innerText = parentDom.innerText.replace(oldVnodeTree, VnodeTree)
        } else {
            // 旧节点是文本节点，新节点是非文本节点
            parentDom.innerText = parentDom.innerText.replace(oldVnodeTree, '')
            // 创建新节点
            mount({ vnode: VnodeTree, parentDom, insertIndex })
        }
        return
    }
    // todo...  
    // 1. 如果节点不是同类型，直接删除创建新节点
    if (!isSameVNodeType(oldVnodeTree, VnodeTree)) {
        const parentDom = parentDom || oldVnodeTree.el?.parentElement
        // 删除旧节点
        // todo...
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
            // todo...
            // 5. 如节点是组件节点，需要更新组件响应式props(响应式props更新后，会自动触发组件的更新)
            // 属性只会有值变化，不会有新增和删减

            // 这里注意！！！！如果获取子组件的响应式props的属性，会被get劫持，从而父级的副作用会被设置成子级props的副作用了
            // 所以这里直接设置子组件的响应式props的属性即可，避免获取
            const reativeProps = oldVnodeTree.component?.props  // 此时el指向组件实例
            Object.keys(newProps).forEach((k) => {
                reativeProps[k] = newProps[k]
            })

        }

    }// todo...
    // 3.设置vnode与dom或者组件的映射关系
    setVnodeDomMap({ vnode: VnodeTree, el: oldVnodeTree.el, component: oldVnodeTree.component })
    // 4. 处理子节点
    diffChildren(oldVnodeTree.childrens || [], VnodeTree.childrens || [], oldVnodeTree.el)


}

// 参数1：旧的子节点列表
// 参数2：新的子节点列表
// 参数3：父节点dom
const diffChildren = function (oldChildren, newChildren, parentDom) {
    if (oldChildren.length <= 0 && newChildren.length <= 0) return
    // 1.两端进行对比
    let start = 0;
    let oldEnd = oldChildren.length - 1
    let newEnd = newChildren.length - 1
    const minLength = Math.min(oldChildren.length, newChildren.length)

    while (start < minLength && isSameVNodeType(oldChildren[start], newChildren[start])) {
        diff(oldChildren[start], newChildren[start], parentDom, start)
        start++
    }

    while (
        start <= oldEnd &&
        start <= newEnd &&
        isSameVNodeType(oldChildren[oldEnd], newChildren[newEnd])
    ) {
        diff(oldChildren[oldEnd], newChildren[newEnd], parentDom, oldEnd)
        oldEnd--
        newEnd--
    }
    // 2.如果列表已经对比完毕，处理新增和删除
    if (start > oldEnd && newEnd > oldEnd) {
        // 新增
        for (let i = start; i <= newEnd; i++) {
            mount({ vnode: newChildren[i], parentDom, insertIndex: i })
        }
    } else if (start >= newEnd && oldEnd > newEnd) {
        // 删除
        for (let i = start; i <= oldEnd; i++) {
            // todo...
            removeDomByVnode(oldChildren[i], parentDom)
        }
    } else if (!(start > oldEnd && start > newEnd)) {
        // 3.如果还有剩余不同节点，处理剩余节点
        // a. 对新节点建立key和位置的映射表
        const keyToNewIndexMap = {}
        newChildren.slice(start, newEnd + 1).forEach((item, i) => {
            if (item) {
                const key =
                    typeof item.props.key !== 'undefined' ? item.props.key : `__temp_key_${i + start}`
                // 根据key值建立映射对象，对象包含新的位置(position)，是否已经比对更新过(hasDiff)，真实dom节点(el)
                keyToNewIndexMap[key] = { position: i + start, hasDiff: false, el: null, component:null }
            }
        })
        // b. 遍历旧节点，映射表里找不到的旧节点表示应该删除，找到的进行对比更新，记录更新状态、更新虚拟dom的el指向新的dom节点
        oldChildren.slice(start, oldEnd + 1).forEach((item, i) => {
            if (item) {
                const key =
                    typeof item.props.key !== 'undefined' ? item.props.key : `__temp_key_${i + start}`
                const mapEntry = keyToNewIndexMap[key]
                if (mapEntry) {
                    // 找到了 key，进行属性更新
                    const newIndex = mapEntry.position
                    diff(item, newChildren[newIndex], parentDom, i)
                    // 改变对比更新状态
                    mapEntry.hasDiff = true
                    // todo...
                    // 重新建立mapEntry与dom或者组件的映射关系
                    setVnodeDomMap({ vnode: mapEntry, el: item.el, component: item.component })
                    // 设置el属性

                    // if (item.el) {
                    //     mapEntry.el = item.el
                    // } else if (item.component) {
                    //     // 如果元素是组件，设置component属性
                    //     mapEntry.component = item.component
                    // }

                } else {
                    // 找不到表示节点应该删除
                    // todo...
                    removeDomByVnode(item, parentDom)
                    //parentDom.removeChild(item.el || item.component?.vnode?.el)

                }
            }
        })
        // c.映射表里剩余的节点，表示新增节点
        Object.entries(keyToNewIndexMap).forEach(([key, entry]) => {
            if (!entry.hasDiff) {
                mount({
                    vnode: newChildren[entry.position],
                    parentDom,
                    insertIndex: entry.position,
                })
                // todo...
                setVnodeDomMap({ vnode: entry, el: newChildren[entry.position].el, component: newChildren[entry.position].component })
                // const el = newChildren[entry.position].el
                // const component = newChildren[entry.position].component
                // if (el) {
                //     entry.el = el
                // } else if (component) {
                //     entry.component = component
                // }

            }
        })
        // d.处理位置的移动，采用LIS算法进行最小移动
        // 找到新节点在原队列里的位置
        const oldPositions = []
        const parentChildren = Array.from(parentDom.children || [])
        Object.entries(keyToNewIndexMap).forEach(([key, entry]) => {
            const el = entry.el
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
        Object.entries(keyToNewIndexMap).forEach(([key, entry]) => {
            if (noRemoveIndex.indexOf(index) < 0) {
                // 需要移动，先删除dom，后面再一起插入
                // todo...
                removeDomByVnode(entry, parentDom)
                // parentDom.removeChild(entry.el?.vnode?.el || entry.el)
                needRemoveArray.push(entry)
            }
            index++
        })
        // 按插入位置从前往后排序
        const sortedArray = needRemoveArray.sort((a, b) => a.position - b.position)
        sortedArray.forEach((item) => {
            const { el, position } = item
            // todo...
            insertDomByVnode(item, parentDom, position)
            // const refNode = parentDom.childNodes[position]
            // if (refNode) {
            //     // 该操作会删除el节点，再在指定位置插入el节点
            //     parentDom.insertBefore(el?.vnode?.el || el, refNode)
            // } else {
            //     // 尾部追加节点
            //     parentDom.appendChild(el?.vnode?.el || el)
            // }
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
function removeDomByVnode(vnode, parentDom) {
    const dom = vnode.el || vnode.component?.vnode?.el
    parentDom.removeChild(dom)
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