import { ref, computed } from './libs/core.js'
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

    return {
      ChildComponent,
      isShow,
      btnText,
      hide,
      class1,
      add,
      num
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
