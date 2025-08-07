import { $nextTick, $domUpdate } from '../src/libs/scheduler'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
// 导入 runtime.js 以便模拟
import * as runtime from '../src/libs/runtime'
// 在测试前模拟 runtime.js 模块
// 保存原始全局对象
const originalPromise = window.Promise;
const originalMutationObserver = window.MutationObserver;
const originalSetImmediate = window.setImmediate;
const originalSetTimeout = window.setTimeout;
beforeEach(() => {
  vi.restoreAllMocks()
  // 恢复所有原始全局对象
  vi.stubGlobal('Promise', originalPromise);
  vi.stubGlobal('MutationObserver', originalMutationObserver);
  vi.stubGlobal('setImmediate', originalSetImmediate);
  vi.stubGlobal('setTimeout', originalSetTimeout);
})

describe('$nextTick 函数测试', () => {
  // 测试 $nextTick 是否返回 Promise
  test('应该返回一个 Promise 对象', () => {
    const result = $nextTick()
    expect(result).toBeInstanceOf(Promise)
  })

  // 测试带回调函数的情况
  test('当提供回调函数时，回调应该被执行', async () => {
    const callback = vi.fn()
    await $nextTick(callback)
    expect(callback).toHaveBeenCalled()
  })

  // 测试 Promise 解析时机
  // ... existing code ...
  // 测试 Promise 解析时机与回调执行顺序
  test('Promise 应该在回调执行后被解析', async () => {
    const callback = vi.fn()
    let callbackExecuted = false
    let promiseResolved = false

    $nextTick(() => {
      callback()
      callbackExecuted = true
      // 验证 Promise 尚未解析
      expect(promiseResolved).toBe(false)
    }).then(() => {
      promiseResolved = true
      // 验证回调已经执行
      expect(callbackExecuted).toBe(true)
    })

    // 微任务队列处理前，回调不应执行，Promise 不应解析
    expect(callback).not.toHaveBeenCalled()
    expect(callbackExecuted).toBe(false)
    expect(promiseResolved).toBe(false)

    // 等待微任务队列处理完成
    await $nextTick()

    // 微任务队列处理后，回调应执行，Promise 应解析
    expect(callback).toHaveBeenCalled()
    expect(callbackExecuted).toBe(true)
    expect(promiseResolved).toBe(true)
  })

  // 测试多个 $nextTick 调用的精确执行顺序
  test('多个 $nextTick 调用应该按顺序执行', async () => {
    const executionOrder = []

    $nextTick(() => {
      executionOrder.push(1)
      // 验证第二个回调尚未执行
      expect(executionOrder).toEqual([1])
    })

    $nextTick(() => {
      executionOrder.push(2)
      // 验证第一个回调已经执行，第三个回调尚未执行
      expect(executionOrder).toEqual([1, 2])
    })

    $nextTick(() => {
      executionOrder.push(3)
      expect(executionOrder).toEqual([1, 2, 3])
    })

    // 等待所有微任务执行完成
    await $nextTick()

    expect(executionOrder).toEqual([1, 2, 3])
  })


  // 测试不带回调函数的情况
  test('当不提供回调函数时，Promise 应该被解析', async () => {
    let resolved = false

    $nextTick().then(() => {
      resolved = true
    })

    expect(resolved).toBe(false)

    // 等待微任务队列处理完成
    await $nextTick()

    expect(resolved).toBe(true)
  })


  // 测试 $nextTick 在组件更新后的执行
  test('$nextTick 回调应该在 DOM 更新后执行', async () => {
    // 模拟 update 方法
    const updateSpy = vi.spyOn(runtime, 'update').mockImplementation(() => {
      // 这里可以添加模拟的实现，或者留空
    })
    // 模拟一个简单的组件实例
    const mockInstance = {
      update: vi.fn()
    }

    // 触发更新
    $domUpdate(mockInstance)

    // 在 $nextTick 中检查更新是否已完成
    let updateCompleted = false
    await $nextTick(() => {
      updateCompleted = true
    })

    expect(updateCompleted).toBe(true)
    expect(updateSpy).toHaveBeenCalled()
  })
})

// describe('scheduler 兼容性测试', () => {
//   // 测试无 Promise 但有 MutationObserver 的情况
//   test('不支持 Promise 但支持 MutationObserver 时，应使用 MutationObserver', () => {
//     // 移除 Promise
//     vi.stubGlobal('Promise', undefined);
//     // 模拟 MutationObserver
//     const mockMutationObserver = vi.fn(() => ({
//       observe: vi.fn(),
//       disconnect: vi.fn()
//     }));
//     vi.stubGlobal('MutationObserver', mockMutationObserver);

//     $nextTick(() => { });

//     expect(mockMutationObserver).toHaveBeenCalled();
//   });

//   // 测试无 Promise 和 MutationObserver 但有 setImmediate 的情况
//   test('不支持 Promise 和 MutationObserver 但支持 setImmediate 时，应使用 setImmediate', () => {
//     vi.stubGlobal('Promise', undefined);
//     vi.stubGlobal('MutationObserver', undefined);
//     const setImmediateSpy = vi.spyOn(window, 'setImmediate');

//     $nextTick(() => { });

//     expect(setImmediateSpy).toHaveBeenCalled();
//   });

//   // 测试最低级别的降级：使用 setTimeout
//   test('仅支持 setTimeout 时，应使用 setTimeout', () => {
//     vi.stubGlobal('Promise', undefined);
//     vi.stubGlobal('MutationObserver', undefined);
//     vi.stubGlobal('setImmediate', undefined);
//     const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

//     $nextTick(() => { });

//     expect(setTimeoutSpy).toHaveBeenCalled();
//   });
// });
