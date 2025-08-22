# Vue响应式系统深度优化详解
在实现了Vue响应式核心功能后，我们面临两个关键优化点需要解决：

## 一、数组操作性能优化问题
当使用 reactive 处理数组时，数组的增删操作会导致后续元素索引全部变化，从而触发多次更新通知，造成性能浪费。
```js
const arr = [1, 2, 3, 4]
const proxy = reactive(arr)
proxy.splice(1, 1)  // 删除索引为1的项

```
执行上述代码会触发三次更新（索引1、2、length的值都发生了变化），随着数组规模增大，触发的更新次数会线性增长

### 优化方案
核心思路是拦截数组的变异方法，在方法内部统一处理更新，避免多次触发：
```js
// core.js
// 1.需要覆盖数组的方法，返回数组变异方法，在方法里统一触发一次更新
// 2.如果是数组变异方法导致数组的修改，直接跳过触发（已在上一步中手动触发）

// 需要拦截的数组的方法，具体可能不止这些，这里只是简单模拟实现
const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
let isMutating = false  // 是否正在执行变异方法
export const reactive = function (obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj // 非对象或 null 不需要代理
    }
    // 已经有代理直接返回
    if (reactiveMap.has(obj)) {
        return reactiveMap.get(obj)
    }
    // reactive做两件事，1：生成一个proxy对象，2.做get，set拦截
    const proxy = new Proxy(obj, {
        get(target, key) {
            // 收集订阅者
            track(target, key)
            let value = target[key]
            // 拦截数组的方法，返回数组变异方法，在方法里统一触发一次更新
            if (Array.isArray(target) && arrayMethods.includes(key)) {
                return function (...args) {
                    isMutating = true
                    const res = target[key].apply(this, args)
                    isMutating = false
                    // 触发更新
                    trigger(target, 'length')
                    return res
                }

            }
            if (typeof value === 'object') {
                return reactive(value)
            } else {
                return value
            }
        },
        set(target, key, value) {
            // 判断新旧值不等
            if (target[key] !== value) {
                target[key] = value
                // 触发更新
                // 如果是数组变异方法导致的修改，直接跳过触发（已在包装方法中手动触发）
                if (!isMutating) {
                    trigger(target, key)
                }
            }
            // set必须设置返回
            return true
        },
    })
    // 目标对象和代理对象建立映射关系
    reactiveMap.set(obj, proxy)
    return proxy
}
``` 
### 优化要点
1. 方法拦截 ：通过覆盖数组的7个变异方法，实现统一更新触发
2. 状态标记 ：使用 isMutating 标记数组变异过程，避免重复触发
3. 单次更新 ：无论数组修改影响多少元素，只通过 length 属性触发一次更新
4. 性能提升 ：数组操作的更新次数从O(n)降至O(1)，大幅提升大型数组的操作性能

## 二、watchEffect嵌套调用优化
原始的 watchEffect 实现简单，不支持嵌套调用，虽然官方也不推荐开发中嵌套调用，但框架内部的挂载和更新过程不可避免要嵌套使用。

### 优化目标
1. 支持嵌套调用
2. 实现副作用清理机制
3. 增强错误处理的健壮性

### 优化方案

```js
// core.js
// 1.要支持嵌套调用，需要使用栈来存储当前的effect
let effectStack = []
export const watchEffect = function (update) {
    let cleanup = null // 存储清理函数
    const effect = () => {
        // 2.每次执行之前先清理旧的副作用
        if (cleanup) {
            cleanup()
            cleanup = null 
        }
        currentEffect = effect
        effectStack.push(effect)
        // 3.try增强健壮性，如果update执行出错，也要保证effectStack的正常   
        try {
            const result = update()
            // 如果更新函数有返回清理函数，保存清理函数
            if (typeof result === 'function') {
                cleanup = result
            }
        } finally {
            effectStack.pop()
            currentEffect = effectStack.length - 1 >= 0 ? effectStack[effectStack.length - 1] : null
        }
    }
    // 立即执行，在这个过程中会自动收集依赖
    effect()
}
```
### 实现要点
1. 嵌套支持 ：使用 effectStack 栈结构存储当前执行的effect，确保嵌套调用时依赖收集正确
2. 副作用清理 ：每次执行前清理上一次的副作用，避免内存泄漏
3. 健壮性保障 ：通过 try-finally 确保即使更新函数执行出错，也能正确恢复 currentEffect 状态
4. 清理函数传递 ：支持通过返回值传递自定义清理函数

### 扩展说明
实际的Vue实现中， watchEffect 还提供了停止监听的功能，可通过返回的停止函数手动终止响应式监听。完整实现还会包含更细致的错误处理和性能优化。

## 总结
通过以上两项优化：

1. 数组操作性能得到显著提升，避免了不必要的更新触发
2. watchEffect 支持嵌套调用，具备完善的副作用清理机制和错误处理能力
这些优化为Vue框架的响应式系统奠定了更坚实的基础，使其能够应对更复杂的应用场景。
