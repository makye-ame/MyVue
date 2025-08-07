import { watchEffect } from './libs/core.js'
// 定义模板
const template = `
 <div style="color:blue">
   <h1> 我是子组件</h1>  
   <p>父组件num：{{num}}</p>
   <button id="childAdd" @click="add">给父节点+{{num}}</button>   
 </div>
 `
export default {
  name: 'childComponent',
  template,
  setup(props, ctx) {
    watchEffect(() => {
      console.log('props changed:', props.num)
    })
    const add = () => {
      ctx.emit('add', props.num)
    }
    return { add }
  },
  mounted() {
    console.log('########child mounted')
  },
  beforeMount() {
    console.log('########child beforeMount')
  },
  updated() {
    console.log('########child updated')
  },
  beforeUpdate() {
    console.log('########child beforeUpdate')
  },
  beforeCreate() {
    console.log('########child beforeCreate')
  },
  created() {
    console.log('########child created')
  },
  beforeUnmount() {
    console.log('########child BeforeUnmount')
  },
  unmounted() {
    console.log('########child unmounted')
  },
}
