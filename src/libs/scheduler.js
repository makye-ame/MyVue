
// 任务调度器
import { update } from './runtime.js'
// nextTick任务列表
const nextTickTasks = []
// dom更新任务列表
const updateDomTasks = new Set()
// 是否有未执行的微任务
let hasMicroTask = false

let observer = null
const dom = document.createTextNode('1')
// 创建微任务
// 参数cb:nextTick回调
// 参数instance:需要更新的组件实例
const createMicroTask = function (cb, instance) {
  // 任务放进队列
  if (cb) {
    nextTickTasks.push(cb)
  }
  if (instance) {
    updateDomTasks.add(instance)
  }
  // 所有的任务会放到一个微任务里处理
  // 如果已有未执行的微任务，不做处理
  if (!hasMicroTask) {
    // 根据兼容性创建微任务
    if (typeof Promise !== 'undefined') {
      Promise.resolve().then(batchDealTasks)
    } else if (typeof MutationObserver !== 'undefined') {
      if (observer && dom) {
        dom.textContent = dom.textContent + '1'
      } else {
        observer = new MutationObserver(batchDealTasks)
        observer.observe(dom, { characterData: true })
        dom.textContent = '1'
      }
    } else if (typeof setImmediate !== 'undefined') {
      setImmediate(batchDealTasks)
    } else {
      setTimeout(batchDealTasks)
    }
    hasMicroTask = true
  }
}
// 批量处理任务
const batchDealTasks = function () {
  console.log('批量执行任务start：：：')
  // 先dom更新
  updateDomTasks.forEach((instance) => update(instance))
  // 再执行nextTick的任务
  nextTickTasks.forEach((cb) => cb())

  console.log('批量执行任务end：：：')
  // 重置任务队列
  nextTickTasks.length = 0
  updateDomTasks.clear()
  // 微任务已经执行，hasMicroTask重置为false
  hasMicroTask = false
}

// 接收一个回调函数
// 返回一个promise或兼容对象
export const $nextTick = function (cb) {
  // 检查Promise是否可用
  if (typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      createMicroTask(() => {
        if (cb) {
          cb()
        }
        resolve()
      }, null)
    })
  } else {
    // Promise不可用时的降级处理
    createMicroTask(cb, null)
    return {
      then: function (callback) {
        createMicroTask(callback, null)
        return this
      }
    }
  }
}
export const $domUpdate = function (instance) {
  createMicroTask(null, instance)
}