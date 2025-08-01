// 建立源对象和代理之间的映射，避免重复代理
const reactiveMap = new WeakMap()
// reative代理对象，支持深层嵌套
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
            if (typeof value === 'object') {                
                return reactive(value)
            } else {
                return value
            }
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
// ref的默认值可以是普通类型，也可以是对象，如果是对象，会再封装成reactie
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
// watch可以监听ref、reactive对象和getter函数
// 这里watch会立即执行，并深层监听
// 监听返回响应式属性的getter函数，可以精确监听reactive的某个属性，而不是全部属性。
// 但如果这个属性是对象，只有在返回不同的对象时，才会触发回调，也就是说非深层监听

export const watch = function (dependency, cb) {
    let oldValue
    if (typeof dependency === 'function') {
        // getter函数
        oldValue = dependency()
        watchEffect(() => {
            const newValue = dependency()
            if (oldValue !== newValue) {
                cb(newValue, oldValue)
                oldValue = newValue
            }
        })
    } else {
        // 深度拷贝对象
        let oldClone = JSON.parse(JSON.stringify(dependency))
        watchEffect(() => {
            // 比较变化
            if (JSON.stringify(oldClone) !== JSON.stringify(dependency)) {
                // 如果是ref，返回value
                if (dependency.value) {
                    cb(dependency.value, oldClone?.value)
                } else {
                    cb(dependency, dependency)
                }
                oldClone = JSON.parse(JSON.stringify(dependency))
            }
        })
    }

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