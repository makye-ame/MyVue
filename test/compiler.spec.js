import { parse, tranform, generate, PatchFlags } from '../src/libs/compiler.js';
import h from '../src/libs/help.js';
import { context, generateExcute } from './testUtil.js'
import { describe, test, expect, vi, beforeEach } from 'vitest'
// 测试前重置所有mock
beforeEach(() => {
    // 恢复原始函数
    vi.restoreAllMocks()
})

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
        expect(vnode.childrens[0].isStatic).toBe(true)
    });

    test('处理插值表达式', () => {
        const template = `<p>{{ message }}</p>`
        const vnode = generateExcute(template)
        expect(vnode.childrens[0]).toEqual({
            patchFlag: PatchFlags.TEXT,
            $dynamicProps: [],
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
            patchFlag: PatchFlags.DYNAMIC_DIRECTIVES | PatchFlags.TEXT,
            $dynamicProps: [],
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
            patchFlag: PatchFlags.HYDRATE_EVENTS | PatchFlags.TEXT,
            $dynamicProps: [],
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
            patchFlag: PatchFlags.CHILDREN,
            $dynamicProps: [],
            tag: 'div',
            props: {},
            "childrens": [{
                patchFlag: PatchFlags.PROPS | PatchFlags.HYDRATE_EVENTS,
                $dynamicProps: ['num'],
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
            patchFlag: PatchFlags.CHILDREN,
            $dynamicProps: [],
            tag: 'div',
            childrens: ['', {
                patchFlag: PatchFlags.HYDRATE_EVENTS | PatchFlags.TEXT,
                $dynamicProps: [],
                tag: 'button',
                props: {
                    onclick: context.hide,
                },
                childrens: ['show'],
                "component": null,
                "el": null,
            }, {
                    patchFlag: PatchFlags.PROPS | PatchFlags.HYDRATE_EVENTS,
                    $dynamicProps: ['num'],
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
            patchFlag: PatchFlags.DYNAMIC_DIRECTIVES | PatchFlags.TEXT,
            $dynamicProps: [],
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

// 添加到文件末尾
describe('编译时优化 - 更新类型标记', () => {
    test('动态文本应被标记为TEXT', () => {
        const ast = parse(`<p>{{ message }}</p>`);
        tranform(ast);

        const p = ast.children[0];
        expect(p.patchFlag).toBe(PatchFlags.TEXT);
        expect(p.isDynamic).toBe(true);
    });

    test('动态class应被标记为CLASS', () => {
        const ast = parse(`<div :class="className"></div>`);
        tranform(ast);

        const div = ast.children[0];
        expect(div.patchFlag).toBe(PatchFlags.CLASS);
        expect(div.isDynamic).toBe(true);
    });

    test('动态style应被标记为STYLE', () => {
        const ast = parse(`<div :style="styles"></div>`);
        tranform(ast);

        const div = ast.children[0];
        expect(div.patchFlag).toBe(PatchFlags.STYLE);
        expect(div.isDynamic).toBe(true);
    });

    test('动态props应被标记为PROPS', () => {
        const ast = parse(`<div :id="uid"></div>`);
        tranform(ast);

        const div = ast.children[0];
        expect(div.patchFlag).toBe(PatchFlags.PROPS);
        expect(div.isDynamic).toBe(true);
        expect(div.dynamicProps).toContain('id');
    });

    test('动态事件应被标记为HYDRATE_EVENTS', () => {
        const ast = parse(`<button @click="handleClick"></button>`);
        tranform(ast);

        const button = ast.children[0];
        expect(button.patchFlag).toBe(PatchFlags.HYDRATE_EVENTS);
        expect(button.isDynamic).toBe(true);
    });

    test('动态指令应被标记为DYNAMIC_DIRECTIVES', () => {
        const ast = parse(`<div v-if="show"></div>`);
        tranform(ast);

        const div = ast.children[0];
        expect(div.patchFlag).toBe(PatchFlags.DYNAMIC_DIRECTIVES);
        expect(div.isDynamic).toBe(true);
    });

    test('包含动态子节点的节点应被标记为CHILDREN', () => {
        const ast = parse(`<div><p>{{ message }}</p></div>`);
        tranform(ast);

        const div = ast.children[0];
        expect(div.patchFlag).toBe(PatchFlags.CHILDREN);
        expect(div.isDynamic).toBe(true);

        const p = div.children[0];
        expect(p.patchFlag).toBe(PatchFlags.TEXT);
        expect(p.isDynamic).toBe(true);
    });

    test('多个动态类型应正确组合标记', () => {
        const ast = parse(`<div :class="className" :id="id" @click="handleClick"><p>{{ message }}</p></div>`);

        tranform(ast);

        const div = ast.children[0];
        // 应该同时包含CLASS, HYDRATE_EVENTS和CHILDREN标记
        const expectedFlags = PatchFlags.CLASS | PatchFlags.HYDRATE_EVENTS | PatchFlags.CHILDREN | PatchFlags.PROPS;

        expect(div.patchFlag).toBe(expectedFlags);
        expect(div.isDynamic).toBe(true);
        expect(div.dynamicProps).toEqual(['id']);

    });
});
describe('编译时优化 - 静态节点缓存', () => {
    // 模拟createStaticNode函数
    beforeEach(() => {
        // 只对当前describe块内的测试生效
        vi.restoreAllMocks();
        h.createStaticNode = vi.fn((args) => {
            return { type: 'static' }
        });

    });
    test('静态节点应被标记为HOISTED并添加到hoistedList', () => {
        const ast = parse(`<div class="static-container"><p>静态文本1</p></div>`);
        tranform(ast);
        // 这个generate需要调用，这样hoistedList才能被重置，不然可能影响后续的测试
        generate(ast);

        const div = ast.children[0];
        expect(div.patchFlag).toBe(PatchFlags.HOISTED);
        expect(div.isDynamic).toBe(false);
        expect(div.isStatic).toBe(true);
        expect(div.hoistedIndex).toBeDefined();
    });

    test('生成的render函数应引用静态节点变量', () => {

        const ast = parse(`<div class="static-container"><p>静态文本2</p></div>`);
        tranform(ast);
        // 调用generate前，createStaticNode应该没有被调用
        expect(h.createStaticNode).toHaveBeenCalledTimes(0);

        const render = generate(ast);
        // 调用generate，createStaticNode应该被调用1次
        expect(h.createStaticNode).toHaveBeenCalledTimes(1);

        const result = render();
        // 模拟第2次渲染
        render()
        // 应该调用createStaticNode创建静态节点
        expect(h.createStaticNode).toHaveBeenCalledTimes(1);

        // 生成的vnode应该引用静态节点
        expect(result.childrens[0].type).toBe('static');
    });
});




