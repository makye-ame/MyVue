import { createApp, createVNode } from '../src/libs/runtime.js'
import { reactive, ref, computed, watch } from '../src/libs/core.js'
import { vi, expect, test, describe, beforeEach } from 'vitest'
import { $nextTick } from '../src/libs/scheduler.js'
import ParentComponent from '../src/appComponent.js'
import ChildComponent from '../src/childComponent.js'
// 保存原始函数以便后续恢复

const originalQuerySelector = document.querySelector
// 重置DOM环境
beforeEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

// 集成测试 - 关注模块间交互和系统行为
describe('framework - integration', () => {
  test('integration test', async () => {
    // 模拟document.querySelector
    const mockElement = document.createElement('div')
    document.querySelector = vi.fn(() => mockElement)
    // 监听函数调用
    const callOrders = []
    const appBeforeCerateSpy = vi.spyOn(ParentComponent, 'beforeCreate').mockImplementation(() => { callOrders.push('appBeforeCreate') })
    const appCreatedSpy = vi.spyOn(ParentComponent, 'created').mockImplementation(() => { callOrders.push('appCreated') })
    const appBeforeMountSpy = vi.spyOn(ParentComponent, 'beforeMount').mockImplementation(() => { callOrders.push('appBeforeMount') })
    const appMountedSpy = vi.spyOn(ParentComponent, 'mounted').mockImplementation(() => { callOrders.push('appMounted') })
    const appBeforeUpdateSpy = vi.spyOn(ParentComponent, 'beforeUpdate').mockImplementation(() => { callOrders.push('appBeforUpdate') })
    const appUpdatedSpy = vi.spyOn(ParentComponent, 'updated').mockImplementation(() => { callOrders.push('appUpdated') })
    const appBeforeUnmountSpy = vi.spyOn(ParentComponent, 'beforeUnmount').mockImplementation(() => { callOrders.push('appBeforeUnmount') })
    const appUnmountedSpy = vi.spyOn(ParentComponent, 'unmounted').mockImplementation(() => { callOrders.push('appUnmounted') })

    const childBeforeCerateSpy = vi.spyOn(ChildComponent, 'beforeCreate').mockImplementation(() => { callOrders.push('childBeforeCreate') })
    const childCreatedSpy = vi.spyOn(ChildComponent, 'created').mockImplementation(() => { callOrders.push('childCreated') })
    const childBeforeMountSpy = vi.spyOn(ChildComponent, 'beforeMount').mockImplementation(() => { callOrders.push('childBeforeMount') })
    const childMountedSpy = vi.spyOn(ChildComponent, 'mounted').mockImplementation(() => { callOrders.push('childMounted') })
    const childBeforeUpdateSpy = vi.spyOn(ChildComponent, 'beforeUpdate').mockImplementation(() => { callOrders.push('childBeforeUpdate') })
    const childUpdatedSpy = vi.spyOn(ChildComponent, 'updated').mockImplementation(() => { callOrders.push('childUpdated') })
    const childBeforeUnmountSpy = vi.spyOn(ChildComponent, 'beforeUnmount').mockImplementation(() => { callOrders.push('childBeforeUnmount') })
    const childUnmountedSpy = vi.spyOn(ChildComponent, 'unmounted').mockImplementation(() => { callOrders.push('childUnmounted') })

    // 创建实例
    const app = createApp(ParentComponent)
    await new Promise((resolve) => setTimeout(() => resolve(), 0))
    expect(callOrders).toEqual(['appBeforeCreate', 'appCreated'])
    callOrders.length = 0

    // 挂载
    app.mount("#app")
    await new Promise((resolve) => setTimeout(() => resolve(), 0))
    const childInstance = app.vnode.childrens[0].childrens[4].component
    expect(callOrders).toEqual(['appBeforeMount', 'childBeforeCreate', 'childCreated', 'childBeforeMount', 'childMounted', 'appMounted'])
    callOrders.length = 0

    expect(app.vnode.childrens[0].childrens[3].el.textContent).toBe('hide')
    expect(childInstance.vnode.childrens[0].childrens[1].el.textContent).toBe('父组件num：0')

    //更新
    // 点击添加按钮   
    mockElement.querySelector('#add').click()
    await new Promise((resolve) => setTimeout(() => resolve(), 0))
    expect(app.context.num.value).toBe(1)
    expect(childInstance.vnode.childrens[0].childrens[1].el.textContent).toBe('父组件num：1')
    // 因为批量更新机制的原因，父节点更新完成了，子节点才会开始更新
    //expect(callOrders).toEqual(['appBeforUpdate', 'childBeforeUpdate', 'childUpdated', 'appUpdated'])
    expect(callOrders).toEqual(['appBeforUpdate', 'appUpdated', 'childBeforeUpdate', 'childUpdated'])
    callOrders.length = 0

    // 子节点点击添加按钮
    mockElement.querySelector('#childAdd').click()
    await new Promise((resolve) => setTimeout(() => resolve(), 0))
    expect(childInstance.vnode.childrens[0].childrens[1].el.textContent).toBe('父组件num：2')
    expect(app.vnode.childrens[0].el.className).toBe('red')

    // 点击隐藏按钮
    mockElement.querySelector('#hide').click()
    await new Promise((resolve) => setTimeout(() => resolve(), 0))
    expect(app.context.isShow.value).toBe(false)
    expect(mockElement.querySelector("#static2")).toBeNull()
    expect(mockElement.querySelector("#static4")).toBeNull()
    expect(mockElement.querySelector('#hide').textContent).toBe("show")
    // 检查顺序是否正确
    expect(app.vnode.childrens[0].el.childNodes[1].id).toBe("add")
    expect(app.vnode.childrens[0].el.childNodes[2].id).toBe("hide")
    expect(app.vnode.childrens[0].el.childNodes[4].textContent).toBe("我是静态节点3")

    // 点击显示按钮
    mockElement.querySelector('#hide').click()
    await new Promise((resolve) => setTimeout(() => resolve(), 0))
    expect(mockElement.querySelector("#static2")).toBeTruthy()
    expect(mockElement.querySelector("#static4")).toBeTruthy()
    expect(mockElement.querySelector('#hide').textContent).toBe("hide")
    // 检查顺序是否正确
    expect(app.vnode.childrens[0].childrens[1].el.id).toBe("static2")
    expect(app.vnode.childrens[0].childrens[2].el.id).toBe("add")
    expect(app.vnode.childrens[0].childrens[3].el.id).toBe("hide")
    expect(app.vnode.childrens[0].childrens[4].component).toBeTruthy()
    expect(app.vnode.childrens[0].childrens[5].el.textContent).toBe("我是静态节点3")
    expect(app.vnode.childrens[0].childrens[6].el.id).toBe("static4")
    callOrders.length = 0

    // 卸载    
    app.unmount()
    await new Promise((resolve) => setTimeout(() => resolve(), 0))
    expect(callOrders).toEqual(['appBeforeUnmount', 'childBeforeUnmount', 'childUnmounted', 'appUnmounted'])
    callOrders.length = 0
    // 检查是否从DOM中移除
    expect(mockElement.querySelector("#app")).toBeNull()
    
  })
})
