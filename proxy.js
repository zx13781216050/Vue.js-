//存储副作用函数的桶
const bucket = new WeakMap()
//原始数据
const data = {/*......*/}
//对数据对象的代理
const p = new Proxy(data,{
  //拦截读取操作,接受第三个参数receiver
  get(target,key,receiver){
    //代理对象可以通过raw属性访问原始数据
    if(key === 'raw'){
      return target
    }
    //将副作用函数activeEffect添加到存储副作用函数的桶中
    track(target,key)
    //得到原始值结果
    const res =  Reflect.get(target,key,receiver)
    if(typeof res == 'object' && res !== null){
      //调用reactive将结果包装成响应式数据并返回
      return reactive(res)
    }
    //返回res
    return res
  },
  //拦截设置操作
  set(targe,key,newVal){
    //先获取旧值
    const oldVal = target[key]
    //如果属性不存在，则说明是在添加新属性，否则是设置已有属性
    const type = Object.prototype.hasOwnProperty.call(target,key) ? 'SET':'ADD'
    //设置属性值
    const res = Reflect.set(target,key,newVal,receiver)
    //target === receiver.raw说明rceiver 就是target的代理对象
    if(target === receiver.raw){
      //比较新值与旧值，只要当不全等，并且都不是NaN的时候才触发响应
      if(oldVal !== newVal && （oldVal === oldVal || newVal === newVal){
        //把副作用函数从桶中取出并执行
        trigger(target,key,type)
      }
    }
    
    return res
  },
  deleteProperty(target,key){
    //检查被操作属性是否是对象自己的属性
    const hadKey = Object.prototype.hasOwnProperty.call(target,key)
    //使用Reflect.deleteProperty完成属性的删除
    const res = Reflect.deleteProperty(target,key)
    if(res&&hadKey){
      //只有删当被删除的属性对象自己的属性并且成功删除时，才触发更新
      trigger(target,key,'DELETE')
    }
    return res
  },
  has(target,key){
    track(target,key)
    return Reflect.has(target,key)
  },
  ownKeys(target){
    //将副作用函数与ITERATE_KEY关联
    track(target,ITERATE_KEY)
    return Reflect.ownKeys(target)
  }
})