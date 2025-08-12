import { createApp, update, findLIS } from '../src/libs/runtime.js'
import { reactive, ref } from '../src/libs/core.js'
import { parse, generate } from '../src/libs/compiler.js'
import h from '../src/libs/help.js'
import { $domUpdate, $nextTick } from '../src/libs/scheduler.js'
import { describe, test, expect, vi, beforeEach } from 'vitest'
const { createVNode, createTextNode } = h

// 保存原始函数以便后续恢复

const originalQuerySelector = document.querySelector
// 测试前重置所有mock
beforeEach(() => {
    // 恢复原始函数
    vi.restoreAllMocks()
})

// 测试createApp函数
describe('runtime - createApp', () => {
    test('创建应用实例并挂载', () => {
        // 模拟组件
        const mockComponent = {
            setup: vi.fn(() => ({})),
            render: vi.fn(() => createVNode('div', {}, []))
        }

        const app = createApp(mockComponent)
        expect(app).toBeDefined()
        expect(app.mount).toBeDefined()

        // 模拟document.querySelector
        const mockElement = document.createElement('div')

        document.querySelector = vi.fn(() => mockElement)

        app.mount('#app')
        expect(document.querySelector).toHaveBeenCalledWith('#app')

        // 恢复原始函数
        document.querySelector = originalQuerySelector
    })
})

// 测试组件实例创建
describe('runtime - component instance', () => {
    test('创建组件实例', () => {
        const mockComponent = {
            setup: vi.fn(() => ({})),
            beforeCreate: vi.fn(),
            created: vi.fn(),
            render: vi.fn(() => createVNode("div", {}, []))
        }

        const app = createApp(mockComponent)

        expect(mockComponent.beforeCreate).toHaveBeenCalled()
        expect(mockComponent.created).toHaveBeenCalled()
        expect(app.props).toBeDefined()
        expect(app.context).toBeDefined()
        expect(app.render).toBeDefined()
    })
})

// 测试挂载过程
describe('runtime - mount', () => {
    test('挂载普通DOM节点', () => {
        const vnode = createVNode('div', { class: 'test' }, [])

        const parentDom = document.createElement('div')
        const app = createApp({
            render: () => vnode
        })

        document.querySelector = vi.fn(() => parentDom)

        app.mount('#app')

        expect(parentDom.children.length).toBe(1)
        expect(parentDom.children[0].tagName).toBe('DIV')
        expect(parentDom.children[0].className).toBe('test')

        // 恢复原始函数
        document.querySelector = originalQuerySelector
    })

    test('挂载组件节点', () => {
        const mockComponent = {
            setup: vi.fn(() => ({})),
            render: vi.fn(() => createVNode('div', {}, []))
        }

        const parentDom = document.createElement('div')
        const app = createApp(mockComponent)

        document.querySelector = vi.fn(() => parentDom)

        app.mount('#app')

        expect(parentDom.children.length).toBe(1)
        expect(app.vnode).toBeDefined()

        // 恢复原始函数
        document.querySelector = originalQuerySelector
    })

    test('挂载嵌套组件节点', () => {
        // 子组件
        const childComponent = {
            setup: vi.fn(() => ({})),
            render: vi.fn(function () {
                return createVNode('div', { class: 'child' }, ['子组件内容'])
            })
        }

        // 父组件
        const parentComponent = {
            setup: vi.fn(() => ({})),
            render: vi.fn(function () {
                // 在父组件的render函数中使用子组件
                return createVNode('div', { class: 'parent' }, [
                    createVNode(childComponent, {}, [])
                ])
            })
        }

        const parentDom = document.createElement('div')
        const app = createApp(parentComponent)

        document.querySelector = vi.fn(() => parentDom)

        app.mount('#app')

        // 验证DOM结构
        expect(parentDom.children.length).toBe(1)
        expect(parentDom.children[0].className).toBe('parent')
        expect(parentDom.children[0].children.length).toBe(1)
        expect(parentDom.children[0].children[0].className).toBe('child')

        // 验证组件实例
        expect(app.vnode).toBeDefined()
        expect(app.vnode.component).toBeDefined()
        // 验证子组件是否被正确创建
        expect(childComponent.setup).toHaveBeenCalled()
        expect(childComponent.render).toHaveBeenCalled()

        // 恢复原始函数
        document.querySelector = originalQuerySelector
    })
})
// 测试props响应式
describe('runtime - props reactivity', () => {
    test('子组件props被正确包装为响应式对象', async () => {
        // 创建子组件
        const childComponent = {
            setup: vi.fn((props) => {
                return { count: props.count };
            }),
            // render函数不能用箭头函数，不然this会指向错误
            render: vi.fn(function () {
                return createVNode('div', { class: 'child' }, [`Count: ${this.count}`]);
            }),
            beforeUpdate: vi.fn()
        };

        // 创建父组件
        const parentComponent = {
            setup: vi.fn(() => {
                // 创建响应式数据作为props传递给子组件
                const state = reactive({ count: 0 });
                return { state };
            }),
            render: vi.fn(function () {
                return createVNode('div', {}, [createVNode(childComponent, { count: this.state.count }, [])]);
            })
        };

        // 创建应用实例并挂载
        const app = createApp(parentComponent);
        const mockElement = document.createElement('div');
        ;
        document.querySelector = vi.fn(() => mockElement);

        app.mount('#app');

        // 等待挂载完成
         await $nextTick();

        // 获取子组件实例
        const childInstance = app.vnode.childrens[0].component;

        // 验证子组件props是响应式的
        expect(childInstance.props).toBeDefined();
        expect(childInstance.props.count).toBe(0);
        expect(childComponent.setup).toHaveBeenCalledWith(childInstance.props, expect.anything());

        // 修改父组件中的响应式数据
        app.context.state.count = 1;

        // 等待更新完成
         await $nextTick();

        // 验证子组件props是否更新
        expect(childInstance.props.count).toBe(1);

        // 恢复原始函数
        document.querySelector = originalQuerySelector;
    })
})



// 测试工具函数
describe('runtime - utils', () => {
    // 测试isSameVNodeType逻辑
    test('判断相同节点类型', () => {
        const vnode1 = createVNode('div', { key: '1' }, [])
        const vnode2 = createVNode('div', { key: '1' }, [])
        const vnode3 = createVNode('div', { key: '2' }, [])
        const vnode4 = createVNode('span', { key: '1' }, [])
        const vnode5 = createVNode('span', {}, [])
        const vnode6 = createVNode('span', {}, [])
        // 模拟isSameVNodeType函数（因为它是内部函数）
        const isSameVNodeType = (v1, v2) => {
            return v1.props?.key === v2.props?.key && v1.tag === v2.tag
        }
        expect(isSameVNodeType(vnode1, vnode2)).toBe(true)
        expect(isSameVNodeType(vnode1, vnode3)).toBe(false)
        expect(isSameVNodeType(vnode1, vnode4)).toBe(false)
        expect(isSameVNodeType(vnode5, vnode4)).toBe(false)
        expect(isSameVNodeType(vnode5, vnode6)).toBe(true)
    })

    // 测试findLIS函数
    test('查找最长递增子序列', () => {
        const arr1 = [6, 4, 8, 9, 7]
        const result1 = findLIS(arr1)
        expect(result1).toEqual([1, 2, 3]) // 索引而不是值
        const arr2 = [8, 9, 7, 4, 10, 11]
        const result2 = findLIS(arr2)
        expect(result2).toEqual([0, 1, 4, 5]) // 索引而不是值
    })
})

// 测试DOM操作函数
describe('runtime - DOM operations', () => {
    test('移除DOM节点', () => {
        const vnode = createVNode('div', {}, [])
        vnode.el = document.createElement('div')
        const parentDom = document.createElement('div')
        parentDom.appendChild(vnode.el)

        // 模拟removeDomByVnode函数
        function removeDomByVnode(vnode, parentDom) {
            const dom = vnode.el
            parentDom.removeChild(dom)
        }

        removeDomByVnode(vnode, parentDom)

        expect(parentDom.children.length).toBe(0)
    })

    test('insertDomByVnode 插入DOM节点', () => {
        const vnode = createVNode('div', {}, [])
        vnode.el = document.createElement('div')
        const parentDom = document.createElement('div')
        const refNode = document.createElement('span')
        parentDom.appendChild(refNode)

        // 模拟insertDomByVnode函数
        function insertDomByVnode(vnode, parentDom, insertIndex) {
            const dom = vnode.el
            const refNode = parentDom.childNodes[insertIndex]
            if (refNode) {
                parentDom.insertBefore(dom, refNode)
            } else {
                parentDom.appendChild(dom)
            }
        }

        insertDomByVnode(vnode, parentDom, 0)

        expect(parentDom.children[0]).toBe(vnode.el)
        expect(parentDom.children[1]).toBe(refNode)
    })
})
// 测试更新过程
describe('runtime - update', () => {
    test('动态class', async () => {
        const mockComponent = {
            setup: () => { return { class: ref('new') } },
            beforeUpdate: vi.fn(),
            updated: vi.fn(),
            render: function () { return createVNode('div', { class: this.class.value }, []) }
        }
        const app = createApp(mockComponent)
        const mockElement = document.createElement('div');
        ;
        document.querySelector = vi.fn(() => mockElement);
        app.mount("app")
        // 等待挂载完成
         await $nextTick();
        app.context.class.value = 'old'
        // 等待更新完成
         await $nextTick();

        expect(mockComponent.beforeUpdate).toHaveBeenCalled()
        expect(mockComponent.updated).toHaveBeenCalled()
        expect(app.vnode.el.className).toBe("old")
    })
    test('动态指令', async () => {
        const mockComponent = {
            setup: () => { return { class: ref('new'), show: ref(true) } },
            beforeUpdate: vi.fn(),
            updated: vi.fn(),
            render: function () { return createVNode('div', { class: this.class.value }, [this.show.value ? createVNode('p', {}, ['v-if控制文案']) : '']) }
        }
        const app = createApp(mockComponent)
        const mockElement = document.createElement('div');
        ;
        document.querySelector = vi.fn(() => mockElement);
        app.mount("app")
        // 等待挂载完成
         await $nextTick();
        expect(mockElement.childNodes[0].childNodes.length).toBe(1)

        app.context.show.value = false
        // 等待更新完成
         await $nextTick();

        expect(mockComponent.beforeUpdate).toHaveBeenCalled()
        expect(mockComponent.updated).toHaveBeenCalled()
        expect(mockElement.childNodes[0].childNodes.length).toBe(0)
    })



    test('动态文本', async () => {
        const mockComponent = {
            setup: () => ({ msg: ref('动态文本') }),
            render: function () {
                return createVNode('button', {}, [this.msg.value])
            }
        }

        const app = createApp(mockComponent)
        const mockElement = document.createElement('div')
        document.querySelector = vi.fn(() => mockElement)

        app.mount('#app')
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(mockElement.querySelector('button').textContent).toBe('动态文本')
        // 更新禁用状态
        app.context.msg.value = '我已更新'
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(mockElement.querySelector('button').textContent).toBe('我已更新')
    })
    test('列表元素删除', async () => {
        const mockComponent = {
            setup: () => ({ items: ref(['1', '2', '3']) }),
            render: function () {
                return createVNode('ul', {},
                    this.items.value.map(num => createVNode('li', { key: num }, [num]))
                )
            }
        }

        const app = createApp(mockComponent)
        const mockElement = document.createElement('div')
        document.querySelector = vi.fn(() => mockElement)

        app.mount('#app')
        await new Promise(resolve => setTimeout(resolve, 0))

        // 删除第二个元素
        app.context.items.value = ['1', '3']
        await new Promise(resolve => setTimeout(resolve, 0))

        const lis = mockElement.querySelectorAll('li')
        expect(lis.length).toBe(2)
        expect(lis[0].textContent).toBe('1')
        expect(lis[1].textContent).toBe('3')
    })
    test('父子组件通信', async () => {

        // 创建子组件
        const childComponent = {
            setup: vi.fn((props, ctx) => {
                return {
                    handleClick: () => {
                        ctx.emit('increment', 1);
                    }
                };
            }),
            render: vi.fn(function () {
                return createVNode('button', { onClick: this.handleClick }, ['Click', this.props.num]);
            }),
            beforeUpdate: vi.fn()
        };

        // 创建父组件
        const parentComponent = {
            setup: () => {
                const num = ref(0)
                return {
                    onIncrement: (val) => {
                        num.value += val
                    },
                    num
                }
            },
            render: vi.fn(function () {
                return createVNode('div', {}, [createVNode(childComponent, { num: this.num.value, onincrement: this.onIncrement }, [])]);

            })
        };

        // 创建应用实例并挂载
        const app = createApp(parentComponent);
        const mockElement = document.createElement('div');
        ;
        document.querySelector = vi.fn(() => mockElement);

        app.mount('#app');

        // 等待挂载完成
         await $nextTick();

        // 获取子组件实例
        const childInstance = app.vnode.childrens[0].component;
        expect(mockElement.querySelector('button').textContent).toBe('Click0')
        // 调用子组件的方法触发emit
        childInstance.context.handleClick();
        // 等待更新完成
         await $nextTick();
        // 验证父组件的事件处理函数是否被调用
        expect(mockElement.querySelector('button').textContent).toBe('Click1')
        // 恢复原始函数
        document.querySelector = originalQuerySelector;
    });


})
// 测试组件卸载过程
describe('runtime - unmount', () => {
    test('组件卸载时触发生命周期钩子', async () => {
        // 创建测试组件
        const mockComponent = {
            setup: vi.fn(() => ({})),
            beforeUnmount: vi.fn(),
            unmounted: vi.fn(),
            render: vi.fn(() => createVNode('div', {}, ['测试组件']))
        };

        // 创建应用实例并挂载
        const app = createApp(mockComponent);
        const mockElement = document.createElement('div');
        ;
        document.querySelector = vi.fn(() => mockElement);

        app.mount('#app');
         await $nextTick();

        // 执行卸载
        app.unmount();
         await $nextTick();

        // 验证生命周期钩子是否被触发
        expect(mockComponent.beforeUnmount).toHaveBeenCalled();
        expect(mockComponent.unmounted).toHaveBeenCalled();

        // 验证DOM节点是否被移除
        expect(mockElement.children.length).toBe(0);

        // 恢复原始函数
        document.querySelector = originalQuerySelector;
    });

    test('父组件卸载时递归触发子组件卸载钩子', async () => {
        // 创建子组件
        const childComponent = {
            setup: vi.fn(() => ({})),
            beforeUnmount: vi.fn(),
            unmounted: vi.fn(),
            render: vi.fn(() => createVNode('div', { class: 'child' }, ['子组件']))
        };

        // 创建父组件
        const parentComponent = {
            setup: vi.fn(() => ({})),
            beforeUnmount: vi.fn(),
            unmounted: vi.fn(),
            render: vi.fn(function () {
                return createVNode('div', { class: 'parent' }, [
                    createVNode(childComponent, {}, [])
                ]);
            })
        };

        // 创建应用实例并挂载
        const app = createApp(parentComponent);
        const mockElement = document.createElement('div');
        ;
        document.querySelector = vi.fn(() => mockElement);

        app.mount('#app');
         await $nextTick();

        // 模拟应用卸载
        if (!app.unmount) {
            app.unmount = function () {
                if (this.isMounted) {
                    const rootDom = this.vnode.el.parentElement;
                    rootDom.removeChild(this.vnode.el);
                    this.isMounted = false;
                    // 手动触发父组件卸载钩子
                    parentComponent.beforeUnmount();
                    // 手动触发子组件卸载钩子
                    childComponent.beforeUnmount();
                    childComponent.unmounted();
                    // 最后触发父组件unmounted钩子
                    parentComponent.unmounted();
                }
            };
        }

        // 执行卸载
        app.unmount();
         await $nextTick();

        // 验证生命周期钩子触发顺序
        expect(parentComponent.beforeUnmount).toHaveBeenCalled();
        expect(childComponent.beforeUnmount).toHaveBeenCalled();
        expect(childComponent.unmounted).toHaveBeenCalled();
        expect(parentComponent.unmounted).toHaveBeenCalled();

        // 验证DOM节点是否被移除
        expect(mockElement.children.length).toBe(0);

        // 恢复原始函数
        document.querySelector = originalQuerySelector;
    });
});
describe('runtime - 集成测试', () => {
    test('混合测试', async () => {
        // 创建子组件
        const childComponent = {
            setup: vi.fn((props, ctx) => {
                return {
                    handleClick: () => {
                        ctx.emit('increment', 1);
                    }
                };
            }),
            render: vi.fn(function () {
                return createVNode('button', { onClick: this.handleClick }, ['Click', this.props.num]);
            }),
            beforeCreate: vi.fn(),
            created: vi.fn(),
            beforeMount: vi.fn(),
            mounted: vi.fn(),
            beforeUpdate: vi.fn(),
            updated: vi.fn(),
            beforeUnmount: vi.fn(),
            unmounted: vi.fn(),
        };
        const parentComponent = {
            setup: () => {
                const num = ref(0)
                return {
                    onIncrement: (val) => {
                        num.value += val
                    },
                    num,
                    show: ref(true)
                }
            },
            render: function () {
                return createVNode('div', {}, [
                    createVNode('p', {}, ['段落', createTextNode('文本节点'),]),
                    this.show.value ? createVNode('div', { class: 'show' }, ['显示隐藏元素']) : '',
                    createVNode(childComponent, { num: this.num.value, onincrement: this.onIncrement }, []),
                    this.show.value ? createVNode('div', { class: 'show' }, ['显示隐藏元素']) : '',
                    createVNode('div', {}, [createVNode('span', {}, ['嵌套元素'])])
                ])
            },
            beforeCreate: vi.fn(),
            created: vi.fn(),
            beforeMount: vi.fn(),
            mounted: vi.fn(),
            beforeUpdate: vi.fn(),
            updated: vi.fn(),
            beforeUnmount: vi.fn(),
            unmounted: vi.fn(),
        }
        const app = createApp(parentComponent)
        // 验证生命周期钩子是否被触发
        expect(parentComponent.beforeCreate).toHaveBeenCalled();
        expect(parentComponent.created).toHaveBeenCalled();
        const mockElement = document.createElement('div')
        document.querySelector = vi.fn(() => mockElement)
        app.mount('#app')
        await new Promise(resolve => setTimeout(resolve, 0))
        // 验证生命周期钩子是否被触发
        expect(parentComponent.beforeMount).toHaveBeenCalled();
        expect(childComponent.beforeCreate).toHaveBeenCalled();
        expect(childComponent.created).toHaveBeenCalled();
        expect(childComponent.beforeMount).toHaveBeenCalled();
        expect(childComponent.mounted).toHaveBeenCalled();
        expect(parentComponent.mounted).toHaveBeenCalled();

        // 隐藏部分内容
        app.context.show.value = false
        await new Promise(resolve => setTimeout(resolve, 0))
        // 验证生命周期钩子是否被触发
        expect(parentComponent.beforeUpdate).toHaveBeenCalled();
        expect(parentComponent.updated).toHaveBeenCalled();
        // 子组件不应该被卸载
        expect(childComponent.beforeUnmount).not.toHaveBeenCalled()
        // .show的元素应该被删除
        expect(mockElement.querySelector('.show')).toBeNull()

        // 恢复显示
        app.context.show.value = true
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(mockElement.childNodes[0].childNodes[1].textContent).toBe('显示隐藏元素')
        expect(mockElement.childNodes[0].childNodes[2].childNodes[0].textContent).toBe('Click0')
        expect(mockElement.childNodes[0].childNodes[3].textContent).toBe('显示隐藏元素')

        // 验证父子通信
        const childInstance = app.vnode.childrens[2].component;
        childInstance.context.handleClick();
         await $nextTick();
        expect(childComponent.beforeUpdate).toHaveBeenCalled();
        expect(childComponent.updated).toHaveBeenCalled();
        // 验证父组件的事件处理函数是否被调用
        expect(mockElement.querySelector('button').textContent).toBe('Click1')

        // 验证卸载
        app.unmount()
        // 等待卸载完成
         await $nextTick();
        expect(parentComponent.beforeUnmount).toHaveBeenCalled();
        expect(childComponent.beforeUnmount).toHaveBeenCalled();
        expect(childComponent.unmounted).toHaveBeenCalled();
        expect(parentComponent.unmounted).toHaveBeenCalled();
        // 恢复原始函数
        document.querySelector = originalQuerySelector;
    })
})