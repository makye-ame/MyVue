// 建立源对象和代理之间的映射，避免重复代理
const reactiveMap = new WeakMap()
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
            // 返回数据
            return target[key]
        },
        set(target, key, value) {
            target[key] = value
            // 触发更新
            trigger(target, key)
            // set必须设置返回
            return true
        },
    })
    // 目标对象和代理对象建立映射关系
    reactiveMap.set(obj, proxy)
    return proxy
}
export const ref = function (defaultV) {
    const refObj = {
        get value() {
            track(this, 'value')
            if (typeof defaultV === 'object') {
                return reactive(defaultV)
            } else {
                return defaultV
            }
        },
        set value(v) {
            defaultV = v
            trigger(this, 'value')
        },
    }
    return refObj
}
// dom更新是副作用，watchEffect回调是副作用，可以把副作用看成是订阅者
let currentEffect = null

// 收集订阅者
const track = function (target, key) {
    if (!currentEffect) return
    // 获取现有的订阅者
    const listeners = getListeners(target, key)
    // 添加订阅者
    listeners.add(currentEffect)
}
// 订阅者集合，使用如下3级结构
// WeakMap<target, Map<key, Set<effect>>>
// 为啥外层是weakMap，里层是Map？
// WeakMap是弱引用，方便内存回收，但是key必须为对象
// 副作用用Set存储而不是数组，避免重复添加
const listenersWeakMap = new WeakMap()
// 获取订阅者
const getListeners = function (target, key) {
    // 如果当前还没有订阅者，会先初始化
    if (!listenersWeakMap.has(target)) {
        listenersWeakMap.set(target, new Map())
    }
    const targetMap = listenersWeakMap.get(target)
    if (!targetMap.has(key)) {
        targetMap.set(key, new Set()) // 使用set避免重复添加！！！
    }
    return targetMap.get(key)
}
// 触发更新
const trigger = function (target, key) {
    // 获取现有的订阅者
    const listerners = getListeners(target, key)
    // 执行副作用
    listerners.forEach((listerner) => {
        listerner()
    })
}
export const watchEffect = function (update) {
    const effect = () => {
        currentEffect = effect
        update()
        currentEffect = null
    }
    // 立即执行，在这个过程中会自动收集依赖
    effect()
}
export const watch = function (dependency, cb) {
    // 监测reactive对象
    let oldObj = { ...dependency }
    watchEffect(() => {
        const newObj = dependency
        // 比较变化
        if (JSON.stringify(oldObj) !== JSON.stringify(newObj)) {
            cb(newObj, oldObj)
            oldObj = { ...newObj }
        }
    })
}
export const computed = function (cb) {
    const resRef = ref()
    const effect = () => {
        currentEffect = effect
        resRef.value = cb()
        currentEffect = null
    }
    effect()
    return resRef
}

// test...
// test
//const obj = reactive({ name: 'zhangsan', age: 18 })
// watchEffect(() => {
//     console.log('最新年龄是：', obj.age)
// })
// watch(obj, () => {
//     console.log('最新年龄是：', obj.age)
// })
// obj.age = 19
// obj.age = 20
// const countRef = ref(0)
// // watchEffect(() => {
// //     console.log('计数器最新值：', countRef.value)
// // })
// const computedRef = computed(() => {
//     return countRef.value + 1
// })
// watch(computedRef, () => {
//     console.log('计数属性最新值：', computedRef.value)
// })
// countRef.value = 1
// countRef.value = 2
// const countRef = ref(0)
// watchEffect(() => {
//     console.log('计数器最新值：', countRef.value)
// })
// countRef.value = 1
// countRef.value = 2