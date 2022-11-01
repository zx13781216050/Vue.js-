function computed(getter){
  //value用来缓存上一次计算的值
  let value
  //dirty标志，用来标识是否需要重新计算值，为true则意味着“脏”，需要计算
  let dirty = true
  //把getter作为副作用函数，创建一个lazy的effect
  const effectFn = effect(getter,{
    lazy:true,
    //添加调度器，在调度器中将dirty重置为true
    scheduler(){
      dirty= true
      //当计算属性依赖的响应式数据变化时，手动调用trigger函数触发响应
      trigger(obj,'value')
    }
  })
  const obj = {
    //当读取value时才执行effectFn
    get value(){
      //只有“脏”时才计算值，并将得到的值缓存到value中
      if(dirty){
        value = effectFn()
        //将dirty设置为false，下一次访问直接使用缓存到value中的值
        dirty = false
      }
      //当读取value时，手动调用track函数进行追踪
      track(obj,'value')
      return value
    }
  }
  return obj
}