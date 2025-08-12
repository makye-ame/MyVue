import { ref, watchEffect, reactive } from '../src/libs/core.js'
import { parse, generate, tranform } from '../src/libs/compiler.js';
import h from '../src/libs/help.js'
import {expect} from 'vitest'

// 测试上下文数据
const data = {}

export class TestContext {
  constructor(initialData = {}) {
    // 初始化响应式数据
    this.message = ref(initialData.message || '我是插值message')
    this.show = ref(initialData.show !== undefined ? initialData.show : true)
    this.btnText = ref(initialData.btnText || 'hide')
    this.num = ref(initialData.num || 0)
    this.className = ref(initialData.className || 'test-class')
    this.styles = ref(initialData.styles || { color: 'red' })
    this.uid = ref(initialData.uid || 'test-id')
    
    // 方法
    this.hide = this.hide.bind(this)
    this.add = this.add.bind(this)
    this.handleClick = this.handleClick.bind(this)
    
    // 自动同步btnText
    watchEffect(() => {
      this.btnText.value = this.show.value ? 'hide' : 'show'
    })
  }

  hide() {
    this.show.value = !this.show.value
  }

  add(step = 1) {
    this.num.value = this.num.value + step
  }

  handleClick() {
    // 空实现，用于测试事件绑定
  }

  // 转换为普通对象，用于传递给渲染函数
  toObject() {
    return {
      message: this.message.value,
      show: this.show.value,
      btnText: this.btnText.value,
      num: this.num.value,
      className: this.className.value,
      styles: this.styles.value,
      uid: this.uid.value,
      hide: this.hide,
      add: this.add,
      handleClick: this.handleClick
    }
  }
}

// 默认上下文
export const defaultContext = new TestContext()

export function generateExcute(template, customContext = {}) {
  const root = parse(template);
  tranform(root)
  const render = generate(root)
  
  // 合并默认上下文和自定义上下文
  const context = { ...defaultContext.toObject(), ...customContext }
  
  return render.call(
    context,
    h.createVNode,
    h.createTextNode
  )
}

// VNode断言工具
export function expectVNode(vnode, expectations) {
  // 验证标签
  if (expectations.tag) {
    expect(vnode.tag).toBe(expectations.tag)
  }

  // 验证props
  if (expectations.props) {
    Object.keys(expectations.props).forEach(key => {
      expect(vnode.props).toHaveProperty(key)
      expect(vnode.props[key]).toEqual(expectations.props[key])
    })
  }

  // 验证patchFlag
  if (expectations.patchFlag !== undefined) {
    expect(vnode.patchFlag).toBe(expectations.patchFlag)
  }

  // 验证$dynamicProps
  if (expectations.dynamicProps) {
    expect(vnode.$dynamicProps).toEqual(expectations.dynamicProps)
  }

  // 验证静态标志
  if (expectations.isStatic !== undefined) {
    expect(vnode.isStatic).toBe(expectations.isStatic)
  }

  // 验证子节点
  if (expectations.children) {
    expect(vnode.childrens).toEqual(expectations.children)
  }
}

// 编译优化断言工具
export function expectOptimized(astNode, expectations) {
  // 验证patchFlag
  if (expectations.patchFlag !== undefined) {
    expect(astNode.patchFlag).toBe(expectations.patchFlag)
  }

  // 验证动态标志
  if (expectations.isDynamic !== undefined) {
    expect(astNode.isDynamic).toBe(expectations.isDynamic)
  }

  // 验证动态props
  if (expectations.dynamicProps) {
    expect(astNode.dynamicProps).toEqual(expectations.dynamicProps)
  }

  // 验证静态标志
  if (expectations.isStatic !== undefined) {
    expect(astNode.isStatic).toBe(expectations.isStatic)
  }

  // 验证hoistedIndex
  if (expectations.hoistedIndex !== undefined) {
    expect(astNode.hoistedIndex).toBeDefined()
  }
}