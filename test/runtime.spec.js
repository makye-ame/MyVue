import { createApp } from '../runtime.js';
import {describe,test,expect} from 'vitest'
describe('运行时增强测试', () => {
  test('响应式更新', async () => {
    document.body.innerHTML = `<div id="app"></div>`;
    const app = createApp({
      data: () => ({ count: 0 }),
      template: `<button @click="count++">{{ count }}</button>`
    });
    
    app.mount('#app');
    const button = document.querySelector('button');
    button.click();
    
    await new Promise(r => setTimeout(r, 10));
    expect(button.textContent).toBe('1');
  });

  test('条件渲染', () => {
    document.body.innerHTML = `<div id="app"></div>`;
    const app = createApp({
      data: () => ({ show: false }),
      template: `<div v-if="show">内容</div>`
    });
    
    app.mount('#app');
    expect(document.querySelector('div')).toBeNull();
    
    app.data.show = true;
    app.update();
    expect(document.querySelector('div').textContent).toBe('内容');
  });
});