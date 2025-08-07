import { parse } from '../src/libs/compiler.js';
import { context, generateExcute } from './testUtil.js'
import { describe, test, expect } from 'vitest'


describe('模板编译器parse', () => {
    test('解析div标签', () => {
        const root = parse(`<div class="container"></div>`);
        const div = root.children[0]
        expect(div.tag).toBe('div');
        expect(div.attrs.class.value).toBe('container');
    });

    test('处理插值表达式', () => {
        const root = parse(`<p>{{ message }}</p>`);
        const p = root.children[0]
        expect(p.children[0].type).toBe('interpolation');
        expect(p.children[0].exp).toBe('message');
    });
    test('处理v-if指令', () => {
        const root = parse(`<p v-if="show">{{ message }}</p>`);
        const p = root.children[0]
        expect(p.attrs['v-if'].exp).toBe('show');
        expect(p.attrs['v-if'].type).toBe('directive');
    });
    test('处理事件', () => {
        const root = parse(`<button  @click="hide">{{btnText}}</button>`);
        const button = root.children[0]
        expect(button.attrs.onclick.function).toBe('hide');
        expect(button.children[0].type).toBe('interpolation');
        expect(button.children[0].exp).toBe('btnText');
    });
    test('嵌套结构解析', () => {
        const root = parse(`<div><p v-if="show">{{ message }}</p><button  @click="hide">{{btnText}}</button></div>`);
        const div = root.children[0]
        const p = div.children[0]
        const button = div.children[1]
        expect(p.attrs['v-if'].exp).toBe('show');
        expect(p.attrs['v-if'].type).toBe('directive');
        expect(button.attrs.onclick.function).toBe('hide');
        expect(button.children[0].type).toBe('interpolation');
        expect(button.children[0].exp).toBe('btnText');
    });
});

describe('模板编译器generate', () => {
    test('解析div标签', () => {
        const vnode = generateExcute(`<div class="container"></div>`)
        expect(vnode.childrens[0]).toEqual({
            tag: 'div',
            props: {
                class: 'container',
            },
            "childrens": [],
            "component": null,
            "el": null,
        });
    });

    test('处理插值表达式', () => {
        const template = `<p>{{ message }}</p>`
        const vnode = generateExcute(template)
        expect(vnode.childrens[0]).toEqual({
            tag: 'p',
            props: {
            },
            childrens: ['我是插值message'],
            "component": null,
            "el": null,
        });
        const vnodeNew = generateExcute(template, { message: '我是更新后的message' })
        expect(vnodeNew.childrens[0].childrens).toEqual(['我是更新后的message']);
    });

    test('处理v-if指令', () => {
        const template = `<p v-if="show">{{ message }}</p>`
        const vnode = generateExcute(template)
        expect(vnode.childrens[0]).toEqual({
            tag: 'p',
            props: {},
            childrens: ['我是插值message'],
            "component": null,
            "el": null,
        });
        context.show.value = false
        const vnodeNew = generateExcute(template)
        expect(vnodeNew.childrens[0]).toEqual('')
    });
    test('处理事件', () => {
        const vnode = generateExcute(`<button  @click="hide">{{btnText}}</button>`)
        expect(vnode.childrens[0]).toEqual({
            tag: 'button',
            props: {
                onclick: context.hide,
            },
            childrens: ['show'],
            "component": null,
            "el": null,
        });
    });
    test('处理子组件', () => {
        const vnode = generateExcute(`<div><ChildComponent :num="num" @add="add"></ChildComponent></div>`)
        expect(vnode.childrens[0]).toEqual({
            tag: 'div',
            props: {},
            "childrens": [{
                tag: 'ChildComponent',
                props: {
                    num: 0,
                    onadd: context.add
                },
                "component": null,
                "el": null,
                childrens: []
            }],
            "component": null,
            "el": null,
        });
    });
    test('嵌套结构解析', async () => {
        context.show.value = false
        const template = `<div><p v-if="show">{{ message }}</p><button  @click="hide">{{btnText}}</button><ChildComponent :num="num" @add="add"></ChildComponent></div>`
        const vnode = generateExcute(template)
        expect(vnode.childrens[0]).toEqual({
            tag: 'div',
            childrens: ['', {
                tag: 'button',
                props: {
                    onclick: context.hide,
                },
                childrens: ['show'],
                "component": null,
                "el": null,
            }, {
                    tag: 'ChildComponent',
                    props: {
                        num: 0,
                        onadd: context.add
                    },
                    "component": null,
                    "el": null,
                    childrens: []
                }],
            "component": null,
            "el": null,
            "props": {},
        });
        context.show.value = true
        const vnodeNew = generateExcute(template)
        expect(vnodeNew.childrens[0].childrens[0]).toEqual({
            tag: 'p',
            props: {
            },
            childrens: ['我是插值message'],
            "component": null,
            "el": null,
        })
        expect(vnodeNew.childrens[0].childrens[1].childrens).toEqual(['hide'])
    });
});


