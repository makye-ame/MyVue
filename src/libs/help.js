export default {
  createVNode(tag, props = {}, childrens,) {
    return {
      tag,  // tag可以是普通dom标签，也可以是组件
      props: props,
      childrens,
      el: null, // 真实的dom节点，如果tag为普通dom标签时存在，预留属性
      component: null, // 组件实例，如果tag为组件时存在，预留属性
     
    }
  },

  createTextNode(value) {
    return value
  },
}
