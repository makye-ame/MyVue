import { reactive, ref, watchEffect, watch, computed } from '../src/libs/core.js';
import { describe, test, expect } from 'vitest'
describe('响应式系统', () => {
    test('reactive 基础功能', () => {
        const obj = reactive({ a: 1 });
        let dummy;
        watchEffect(() => (dummy = obj.a));
        expect(dummy).toBe(1);
        obj.a = 2;
        expect(dummy).toBe(2);
    });
    test('reactive嵌套对象深层次响应式', () => {
        const obj = reactive({
            level1: {
                level2: {
                    value: 0
                }
            }
        });
        let dummy;
        watchEffect(() => {
            dummy = obj.level1.level2.value;
        });
        expect(dummy).toBe(0);
        obj.level1.level2.value = 10;
        expect(dummy).toBe(10);
    });
    test('非对象reactive返回原值', () => {
        expect(reactive(123)).toBe(123);
        expect(reactive('string')).toBe('string');
        expect(reactive(null)).toBe(null);
    });

    test('ref 基础类型', () => {
        const count = ref(0);
        let dummy;
        watchEffect(() => (dummy = count.value));
        expect(dummy).toBe(0);
        count.value++;
        expect(dummy).toBe(1);
    });
    test('ref对象处理', () => {
        const nested = ref({ count: 0 });
        let dummy;
        watchEffect(() => (dummy = nested.value.count));
        nested.value.count = 5;
        expect(dummy).toBe(5);
    });
    test('ref对象嵌套处理', () => {
        const nested = ref({ level1: { count: 0 } });
        let dummy;
        watchEffect(() => (dummy = nested.value.level1.count));
        nested.value.level1.count = 5;
        expect(dummy).toBe(5);
    });

    test('computed 计算属性', () => {
        const count = ref(1);
        const doubled = computed(() => count.value * 2);
        expect(doubled.value).toBe(2);
        count.value = 2;
        expect(doubled.value).toBe(4);
    });

    test('watch 监听ref变化', () => {
        const count = ref(0);
        let observed = 0;
        watch(count, (newVal) => (observed = newVal));
        count.value = 5;
        expect(observed).toBe(5);
    });
    test('watch 监听ref嵌套对象变化', () => {
        const obj = ref({ count: 0 });
        let observed = 0;
        watch(obj, (newVal) => (observed = newVal.count));
        obj.value.count = 5;
        expect(observed).toBe(5);
    });

    test('watch 监听reactive变化', () => {
        const obj = reactive({ count: 0 });
        let observed = 0;
        watch(obj, (newVal) => (observed = newVal.count));
        obj.count = 5;
        expect(observed).toBe(5);
    });
    test('watch 监听reactive深层嵌套变化', () => {
        const obj = reactive({ level: { count: 0 } });
        let observed = 0;
        watch(obj, (newVal) => (observed = newVal.level.count));
        obj.level.count = 5;
        expect(observed).toBe(5);
    });   
    test('watch 监听getter函数', () => {
        const obj = reactive({ level: 1,name:'zhangsan' });
        let observed = {};
        watch(()=>obj.name, (newVal)=>observed.name = newVal);
        obj.name = 'lisi'
        obj.level = 3;       
        expect(observed).toEqual({name:'lisi'});
    }); 
});