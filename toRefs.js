function toRefs(obj){
	const ret = {}
	//使用for...in循环遍历对象
	for(const key in obj){
		//逐个调用toRef完成转换
		ret[key] = toRef(obj,key)
	}
	return ret
}

function proxyRefs(target){
	return new Proxy(target,{
		get(target,key,receiver){
			const value = Reflect.get(target,key,receiver)
			//自动脱ref实现：如果读取的值是ref，则返回它的value属性值
			return value.__v_isRef ? value.value : value
		},
		set(target,key,newValue,receiver){
			//通过target读取真实值
			const value = target[key]
			//如果值是Ref，则设置其对应的value属性值
			if(value.__v_isRef){
				value.value = newValue
				return true
			}
			return Reflect.set(target,key,newValue,receiver)
		}
	})
}

//调用proxyRefs函数创建代理
const newObj = proxyRefs({...toRefs(obj)})