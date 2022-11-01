//watch函数接收两个参数，source是响应式数据，cb是回调函数
function watch(source,cb){
  //定义getter
  let getter
  //如果source是函数，说明用户传递的是getter，所以直接把source赋值给getter
  if(typeof source === 'function'){
    getter= source
  }else{
    //否则按照原来的实现调用traverse递归地读取
    getter =()=>traverse(source)
  }
  //定义新值和旧值
  let oldValue,newValue
  //cleanup用来存储用户注册的过期回调
  let cleanup
  //定义onInvalidate函数
  function onInvalidate(fn){
    //将过期回调存储到cleanup
    cleanup = fn
  }

  const job = ()=>{
    //在scheduler中重新执行副作用函数，得到的是新值
    newValue = effectFn()
    //调用回调函数cb之前，先调用过期回调
    if(cleanup){
      leanup()
    }
    //将onInvalidate作为回调函数的第三个参数，以便用户使用
    cb(oldValue,newValue,onInvalidate)
    //更新旧值，不然下一次会得到错误的旧值
    oldValue = newValue
  }
  //使用effect注册副作用函数时，开启lazy选项，并把返回值存储在effectFn中以便后续手动调用
  const effectFn = effect(
    //调用traverse递归地读取
    ()=>getter(),
    {
      lazy:true,
      scheduler:()=>{
        //在调度函数中判断flush是否为'post'，如果是，将其放在微任务队列中执行
        if(options.flush === 'post'){
          const p = Promise.resolve()
          p.then(job)
        }else{
          job()
        }
      }
    }
  )
  if(options.immediate){
    job()
  }else{
    //手动调用作用函数，拿到的值就是旧值
    oldValue = effectFn()
  }
}

function traverse(value,seen=new Set()){
  //如果要读取的数据是原始值，或者已经被读取过了，那什么都不做
  if(typeof value !== 'object' || value === null || seen.has(value)) return
  //将数据添加到seen中，代表遍历地读取过了，避免循环引起的死循环
  seen.add(value)
  //暂时不考虑数组等其他结构
  //假设value就是一个对象，使用for...in读取对象的每一个值，并递归地调用traverse进行处理
  for(const k in value){
    traverse(value[k],seen)
  }
  return value
}