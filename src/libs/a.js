// 原本v-for会创建子作用域，v-for下的节点能访问子作用域是通过闭包机制实现的
// 可做了静态变量提升之后，闭包就不再起作用了，需要再额外处理v-for作用域问题
// vnode创建的申明是先申明父节点再申明子节点
// 但是运行确实子节点先创建，父节点后创建
// 所以对于v-for创建新作用域的问题，只能用申明作用域解决，不能用运行this解决,this会指向组件上下文，是节点共用的

// 方案
// v-for会开启局部作用域，但是静态提升提升成了全局作用域，所以v-for下的静态容器如果有依赖局部作用域的子节点，那么是不能做提升的
function testa(scope){
   
    console.log(scope)
}

function test(){
    console.log(this)
   testa(this)
}
test.call({a:3})
