export default {
  createVNode(tag, props = {}, childrens, patchFlag) {
    const { $dynamicProps, ...cleanProps } = props;
    return {
      tag,  // tag可以是普通dom标签，也可以是组件
      props: cleanProps,
      childrens,
      el: null, // 真实的dom节点，如果tag为普通dom标签时存在，预留属性
      component: null, // 组件实例，如果tag为组件时存在，预留属性
      patchFlag,  // 动态更新标记
      $dynamicProps: props?.$dynamicProps || [],  // 动态属性
    }
  },
  // 1.新增静态节点虚拟dom的创建方式createStaticNode
  createStaticNode(content) {
    return {
      isStatic: true, // 是否是静态节点标识
      el: null, // 真实的dom节点
      props: {}, // props为空对象
      // content, // 模版字符串
      // 这里用mount函数代替简单的content属性，实现真实dom的缓存
      mount: (() => {
        // 静态虚拟dom可以缓存，那对应的真实dom也可以缓存
        // 使用闭包缓存真实dom，以便运行阶段反复使用
        let cacheDom = null
        return () => {
          if (!cacheDom) {
            const temp = document.createElement('div')
            temp.innerHTML = content
            cacheDom = temp.childNodes[0]
          } else {
            console.log("跳过静态节点创建")
          }
          return cacheDom
        }
      })()
    }
  },
  createTextNode(value) {
    return value
  },
}
