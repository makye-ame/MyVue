import { ref, computed,reactive } from './libs/core.js'
import { $nextTick } from './libs/scheduler.js'
import ChildComponent from './childComponent.js'
// 定义模板
const template = `
  <div  :class="class1">
   <a href="https://www.baidu.com" target="_blank">我是静态节点1</a>
   <div id="static2" v-if="isShow"><p>我是静态节点2</p>  </div>
  <button id="add" @click="add(1)">add</button>
   <button id="hide" @click="hide">{{btnText}}</button>
   <ChildComponent    :num="num" @add="add"></ChildComponent>
    <a href="https://www.baidu.com" target="_blank">我是静态节点3</a>
   <div id="static4" v-if="isShow"><p>我是静态节点4</p>  </div>  

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
    const array = new Array(10).fill(0).map((i, k) => {
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
        return item1.id - item2.id
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
