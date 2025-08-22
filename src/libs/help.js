export default {
  createVNode(tag, props = {}, childrens, patchFlag) {
    const { $dynamicProps, ...cleanProps } = props;
    const vnode = {
      tag,  // tag可以是普通dom标签，也可以是组件
      props: cleanProps,
      el: null, // 真实的dom节点，如果tag为普通dom标签时存在，预留属性
      component: null, // 组件实例，如果tag为组件时存在，预留属性
      patchFlag,  // 动态更新标记
      $dynamicProps: props?.$dynamicProps || [],  // 动态属性
    }
    if (typeof childrens === 'function') {
      vnode.getChildrens = childrens
    } else {
      vnode.childrens = childrens
    }
    return vnode
  },
  // 1.新增静态节点虚拟dom的创建方式createStaticNode
  createStaticNode(content) {
    return {
      isStatic: true, // 是否是静态节点标识
      el: null, // 真实的dom节点
      props: {}, // props为空对象
      // content, // 模版字符串
      // 这里用mount函数代替简单的content属性，以便做一些逻辑处理
      mount: (() => {  // 使用闭包的方式缓存真实dom
        let cachedDom
        return function (parentDom, insertIndex) {
          let dom
          // 如果有缓存，直接克隆缓存的dom
          if (cachedDom) {
            // 缓存的dom需要深拷贝，不然v-for列表下每一项的静态节点都会共用一个真实dom
            dom = cachedDom.cloneNode(true)
          } else {
            const div = document.createElement('div')
            div.innerHTML = content
            dom = div.childNodes[0]
            cachedDom = dom
          }
          // 插入节点
          if (typeof insertIndex !== 'number' || insertIndex >= parentDom.childNodes.length) {
            parentDom.appendChild(dom)
          } else {
            const refNode = parentDom.childNodes[insertIndex]
            parentDom.insertBefore(dom, refNode)
          }
          // 虚拟dom和真实dom绑定
          this.el = dom
        }
      })()
    }
  },
  createTextNode(value) {
    return value
  },
}
