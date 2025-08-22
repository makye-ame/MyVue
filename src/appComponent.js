import { ref, computed,reactive } from './libs/core.js'
import { $nextTick } from './libs/scheduler.js'
import ChildComponent from './childComponent.js'
// 定义模板
const template = `
  <div  :class="class1">

   <button  @click="addItem(444)">addItem</button>  
    <button  @click="sort">排序</button> 
   <ul>
      <li v-for="item in items" :key="item.id">
        <div><div><div><div><div><div><div><div>我是被包含在静态容器里的动态子节点</div></div></div></div></div></div></div></div>  
        <span>{{item.text}}</span>
        <button  @click="delItem(item)">delItem</button>        
      </li>
   </ul>  
 </div>
 `
export default {
  name: 'appComponent',
  template,
  setup() {
    const isShow = ref(true)
    const num = ref(0)
    const class1 = computed(() => {
      return num.value === 2 ? 'red' : ''
    })
    const add = function (step = 1, e) {
      console.log("add e:", e)
      num.value = num.value + step
    }

    const hide = (e) => {
      console.log("hide e:", e)
      isShow.value = !isShow.value
    }
    const btnText = computed(() => {
      $nextTick(() => {
        // const bthText = document.getElementById("1").childNodes[1].innerText
        // console.log("nextTick btnText:", bthText)
      })
      return isShow.value ? 'hide' : 'show'
    })

    // 新增列表逻辑
    const array = new Array(4000).fill(0).map((i, k) => {
      return { id: k, text: k }
    }).reverse()
    let index = array.length - 1
    const items = reactive(array)
    const addItem = (event) => {
      index++
      items.splice(2, 0, { id: index, text: index })
    }
    const delItem = (item, event) => {
      const index = items.findIndex((i) => i.id === item.id)
      items.splice(index, 1)
    }
    const sort = () => {
      items.sort((item1, item2) => {
        return item2.id - item1.id
      })
    }

    return {
      ChildComponent,
      isShow,
      btnText,
      hide,
      class1,
      add,
      num,
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
