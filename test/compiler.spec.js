import { parse, tranform, generate, PatchFlags } from '../src/libs/compiler.js';
import h from '../src/libs/help.js';
import { TestContext, generateExcute, expectVNode, expectOptimized } from './testUtil.js'
import { describe, test, expect, vi, beforeEach,expect } from 'vitest'

// 测试前重置所有mock
beforeEach(() => {
  // 恢复原始函数
  vi.restoreAllMocks()
  // 重置静态节点缓存
  h.hoistedList = []
})

describe('模板编译器', () => {
  describe('parse - 解析模板', () => {
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
      const root = parse(`<button @click="hide">{{btnText}}</button>`);
      const button = root.children[0]
      expect(button.attrs.onclick.function).toBe('hide');
      expect(button.children[0].type).toBe('interpolation');
      expect(button.children[0].exp).toBe('btnText');
    });

    test('嵌套结构解析', () => {
      const root = parse(`<div><p v-if="show">{{ message }}</p><button @click="hide">{{btnText}}</button></div>`);
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
   describe('编译时优化', () => {
    describe('更新类型标记', () => {
      test('动态文本应被标记为TEXT', () => {
        const ast = parse(`<p>{{ message }}</p>`);
        tranform(ast);

        expectOptimized(ast.children[0], {
          patchFlag: PatchFlags.TEXT,
          isDynamic: true
        })
      });

      test('动态class应被标记为CLASS', () => {
        const ast = parse(`<div :class="className"></div>`);
        tranform(ast);

        expectOptimized(ast.children[0], {
          patchFlag: PatchFlags.CLASS,
          isDynamic: true
        })
      });

      // 其他优化测试用例使用expectOptimized类似优化...
    });

    describe('静态节点缓存', () => {
      beforeEach(() => {
        // 模拟createStaticNode函数
        vi.spyOn(h, 'createStaticNode').mockImplementation((args) => {
          return { type: 'static' }
        });
      });

      test('静态节点应被标记为HOISTED并添加到hoistedList', () => {
        const ast = parse(`<div class="static-container"><p>静态文本1</p></div>`);
        tranform(ast);
        generate(ast); // 触发hoistedList重置

        expectOptimized(ast.children[0], {
          patchFlag: PatchFlags.HOISTED,
          isDynamic: false,
          isStatic: true,
          hoistedIndex: true // 只要定义即可
        })
      });

      test('生成的render函数应引用静态节点变量', () => {
        const ast = parse(`<div class="static-container"><p>静态文本2</p></div>`);
        tranform(ast);
        
        expect(h.createStaticNode).toHaveBeenCalledTimes(0);
        const render = generate(ast);
        expect(h.createStaticNode).toHaveBeenCalledTimes(1);

        render();
        render(); // 第二次调用不应该再次创建静态节点
        expect(h.createStaticNode).toHaveBeenCalledTimes(1);
      });
    });
  });
  describe('generate - 生成VNode', () => {
    test('解析div标签', () => {
      const vnode = generateExcute(`<div class="container"></div>`)
      expectVNode(vnode.childrens[0], {
        isStatic: true
      })
    });

    test('处理插值表达式', () => {
      const template = `<p>{{ message }}</p>`
      const vnode = generateExcute(template)
      expectVNode(vnode.childrens[0], {
        tag: 'p',
        patchFlag: PatchFlags.TEXT,
        $dynamicProps: [],
        childrens: ['我是插值message']
      });

      const vnodeNew = generateExcute(template, { message: '我是更新后的message' })
      expect(vnodeNew.childrens[0].childrens).toEqual(['我是更新后的message']);
    });

    test('处理v-if指令', () => {
      const template = `<p v-if="show">{{ message }}</p>`
      const context = new TestContext({ show: true })
      const vnode = generateExcute(template, context.toObject())

      expectVNode(vnode.childrens[0], {
        tag: 'p',
        patchFlag: PatchFlags.DYNAMIC_DIRECTIVES | PatchFlags.TEXT,
        $dynamicProps: []
      });

      context.hide() // 切换show为false
      const vnodeNew = generateExcute(template, context.toObject())
      expect(vnodeNew.childrens[0]).toEqual('')
    });

    // 其他测试用例使用expectVNode类似优化...
  });

 
});




