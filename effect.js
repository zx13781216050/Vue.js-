//用一个全局变量存储被注册的副作用函数
let activeEffect
//effect栈
const effectStack = []
//effect函数用于注册副作用函数
function effect(fn){
  const effectFn = () =>{
      //调用cleanup函数完成清除工作
      cleanup(effectFn)
      //当effectFn执行时，将其设置为当前激活的副作用函数
      activeEffect = effectFn
      //在调用副作用函数之前将副作用函数压入栈中
      effectStack.push(effectFn)
      //将fn的执行结果存储在res
      const res = fn()
      //在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并把activeEffect还原为之前的值
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
      //将res作为effectFn的返回值
      return res
  }
  //将options挂载到effectFn上
  effectFn.options = options
  //activeEffect.deps用来存储所有与该副作用函数相关联的依赖集合
  effectFn.deps = []
  //只有非lazy的时候，才执行
  if(!options.lazy){
    //执行副作用函数
    effectFn()
  }
  //将副作用函数作为返回值返回
  return effectFn()
}

function cleanup(effectFn){
  //遍历effectFn.deps数组
  for(let i = 0;i<effectFn.deps.length;i++){
    //deps是依赖集合
    const deps = effectFn.deps[i]
    //将effectFn从依赖集合中移除
    deps.delete(effectFn)
  }
  //最后需要重置effectFn.deps数组
  effectFn,deps.length = 0
}