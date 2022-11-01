//在get拦截函数内调用tarck函数追踪变化
function track(target,key){
    //没有activeEffect直接返回
    if(!activeEffect || !shouldTrack) return
    //根据target从“桶”中取得depsMap，它也是一个Map类型：key --->effects
    let depsMap = bucket.get(target)
    //如果不存在depsMap，那么新建一个Map并与之target关联
    if(!depsMap){
      bucket.set(target,(depsMap = new Map()))
    }
    //再根据key从depsMap中取得deps，它是一个Set类型，
    //里面存储着所有与当前key相关联的副作用函数：effects
    let deps = depsMap.get(key)
    //如果deps不存在，同样新建一个Set并与key关联
    if(!deps){
      depsMap.set(key,(deps = new Set()))
    }
    //最后将当前激活的副作用函数添加到“桶”里
    deps.add(activeEffect)
        //deps就是一个与当前副作用函数存在联系的依赖集合
    //将其添加到activeEffect.deps数组中
    activeEffect.deps.push(deps)
}