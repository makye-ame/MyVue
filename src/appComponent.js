import { reactive } from './libs/core.js'
// 定义模板
const template = `
  <div>    
   <button  @click="addItem(444)">addItem</button>
   <button  @click="sort">排序</button> 
   <ul>
      <li v-for="item in items" :key="item.id">
        我是for列表：{{item.text}}
        <button  @click="delItem(item)">delItem</button>        
      </li>
   </ul>  
 </div>
 `
export default {
  name: 'appComponent',
  template,
  setup() {
    // 新增列表逻辑
    const array = new Array(10000).fill(0).map((i, k) => {
      return { id: k, text: k }
    }).reverse()
    let index = array.length - 1
    const items = reactive(array)
    const addItem = () => {
      index++
      items.splice(2, 0, { id: index, text: index })
    }
    const delItem = (item) => {
      const index = items.findIndex((i) => i.id === item.id)
      items.splice(index, 1)
    }
    const sort = () => {
      items.sort((item1, item2) => {
        return item1.id - item2.id
      })
    }

    return {     
      // 新增列表逻辑
      items,
      addItem,
      delItem,
      sort
    }
  },
  mounted() {
    console.log('########app mounted', Date.now())
  },
  beforeMount() {
    console.log('########app beforeMount', Date.now())
  },
  updated() {
    console.log('########app updated', Date.now())
  },
  beforeUpdate() {
    console.log('########app beforeUpdate', Date.now())
  },
  beforeCreate() {
    console.log('########app beforeCreate')
  },
  created() {
    console.log('########app created')
  },
  beforeUnmount() {
    console.log('########app BeforeUnmount')
  },
  unmounted() {
    console.log('########app unmounted')
  },
}
