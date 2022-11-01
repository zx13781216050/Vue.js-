//定义一个Map实例，存储原始对象到代理对象的映射
const reactiveMap = new Map()
const arrayInstrumentations = {}
;['includes','indexOf','lastIndexOf'].forEach(method =>{
	const originMethod = Array.prototype[method]
	arrayInstrumentations[method] = function(...args){
		//this是代理对象，先在代理对象中查找，将结果存储到res中
		let res = originMethod.apply(this,args)

		if(res === false){
			//res为false说明没找到，通过this.raw拿到原始数组，再去其中查找并更新res值
			res = originMethod.apply(this.raw,args)
		}
		//返回最终结果
		return res
	}
})
let shouldTrack = true 
//重写数组额push、pop、shift、unshift以及splice方法
;['pop','push','shift','unshift','splice'].forEach(method =>{
	const originMethod = Array.prototype[method]
	arrayInstrumentations[method] = function(...args){
		shouldTrack = false
		let res = originMethod.apply(this.args)
		shouldTrack = true
		return res
	}
})
//定义一个对象，将自定义的add方法定义到该对象下
const mutableInstrumentations = {
	add(key){
		//this仍然指向的是代理对象，通过raw属性获取原始数据对象
		const target = this.raw
		//先判断值是否已经存在
		const hadKey = target.has(key)
		if(!hadKey){
			//通过原始数据对象执行add方法删除具体的值，
			//注意，这里不再需要.bind	了，因为是直接通过targt调用并执行的
			const res = target.add(key)
			//调用trigger 函数触发响应，并指定操作类型为ADD
			trigger(target,key,'ADD')
		}
		//返回操作结果
		return res
	}
	delete(key){
		//this仍然指向的是代理对象，通过raw属性获取原始数据对象
		const target = this.raw
		//先判断值是否已经存在
		const hadKey = target.has(key)
		const res = target.delete(key)
		//当要删除的值确实存在，才触发响应
		if(hadKey){
			trigger(target,key,'DELETE')
		}
		//返回操作结果
		return res
	}
	get(key){
		//this仍然指向的是代理对象，通过raw属性获取原始数据对象
		const target = this.raw
		//先判断值是否已经存在
		const had = target.has(key)
		//追踪依赖，建立响应联系
		track(target,key)
		//如果存在，则返回结果，这里要注意，如果的到的res仍然是可代理的数据
		//则要使用reactive包装后的响应式数据
		if(had){
			const res = target.get(key)
			return typeof res === 'object' ? reactive(res) : res
		}
	}
	set(key,value){
		const target = this.raw
		const had = target.has(key)
		//获取旧值
		const oldValue = target.get(key)
		//获取原始数据，由于value本身可能已经是原始数据，所以此时value.raw不存在，则直接使用value
		const rowValue = value.raw || value
		target.set(key,rawValue)
		//设置新值
		target.set(key,value)
		//如果不存在，则说明是ADD类型的操作，意味着新增
		if(!had){
			trigger(target,key,'ADD')
		}else if(oldValue !== value || (oldValue === oldValue && value === value)){
			//如果不存在，并且值变了，则是SET类型的操作，意味着修改
			trigger(target,key,'SET')
		}
	}
	forEach(callback,thisArg){
		//wrap函数用来把可代理的值转化为响应式数据
		const wrap = (val) => typeof val === 'object' ? reactive(val) : val
		const target = this.raw
		track(target,ITERATE_KEY)

		target.forEach((v,k)=>{
			//通过 .call调用callback,并传递thisArg
			callback.call(thisArg,wrap(v),wrap(k),this)
		})
	}
	//公用iterationMethod方法
	[Symbol.iterator]:iterationMethod,
	entries:iterationMethod,
	values:valuesIterationMethod,
	keys:keysIterationMethod
}
//抽离为独立的函数，便于复用
function iterationMethod(){
	//获取原始数据对象target
	const target = this.raw
	//获取原始迭代器方法
	const itr = target[Symbol.iterator]()
	//wrap函数用来把可代理的值转化为响应式数据
	const wrap = (val) => typeof val === 'object' ? reactive(val) : val
	//调用track函数建立响应联系
	track(target,ITERATE_KEY)

	//返回自定义的迭代器
	return {
		next(){
			//调用原始迭代器的next方法获取value和done
			const {value,done} = itr.next()
			return {
				//如果value不是undefined，则对其进行包裹
				value:value ? [wrap(value[0]),wrap(value[1])]:value,
				done
			}
		}
		//实现可迭代协议
		[Symbol.iterator](){
			return this
		}
	}
}
function valuesIterationMethod(){
	//获取原始数据对象target
	const target = this.raw
	//获取原始迭代器方法
	const itr = target.values()
	//wrap函数用来把可代理的值转化为响应式数据
	const wrap = (val) => typeof val === 'object' ? reactive(val) : val
	//调用track函数建立响应联系
	track(target,ITERATE_KEY)

	//返回自定义的迭代器
	return {
		next(){
			//调用原始迭代器的next方法获取value和done
			const {value,done} = itr.next()
			return {
				//如果value不是undefined，则对其进行包裹
				value:wrap(value)
				done
			}
		}
		//实现可迭代协议
		[Symbol.iterator](){
			return this
		}
	}
}
function keysIterationMethod(){
	//获取原始数据对象target
	const target = this.raw
	//获取原始迭代器方法
	const itr = target.keys()
	//wrap函数用来把可代理的值转化为响应式数据
	const wrap = (val) => typeof val === 'object' ? reactive(val) : val
	//调用track函数追踪依赖，在副作用函数与MAP_KEY_ITERATE_KEY之间建立响应联系
	track(target,MAP_KEY_ITERATE_KEY)

	//返回自定义的迭代器
	return {
		next(){
			//调用原始迭代器的next方法获取value和done
			const {value,done} = itr.next()
			return {
				//如果value不是undefined，则对其进行包裹
				value:wrap(value)
				done
			}
		}
		//实现可迭代协议
		[Symbol.iterator](){
			return this
		}
	}
}
//封装createReactive函数，接受一个参数isShallow，代表是否为签相应，默认为false，即非浅响应
//第三个参数isReadonly,代表是否只读，默认false，即非只读
function createReactive(obj,isShallow  = false,isReadonly = false){
	return new Proxy(obj,{
	  //拦截读取操作,接受第三个参数receiver
	  get(target,key,receiver){
	    //代理对象可以通过raw属性访问原始数据
	    if(key === 'raw'){
	      return target
	    }

	    //如果操作的目标独享是数组，并且key存在于arrayInstrumentations上，
	    //那么返回定义在arrayInstrumentations上的值
	    if(Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)){
	    	return Reflect.get(arrayInstrumentations,key,receiver)
	    }
	    //非只读的时候才需要建立响应联系
	    //添加判断，如果key的类型是symbol，则不进行追踪
	    if(!isReadonly && typeof key !== 'symbol'){
	    	//将副作用函数activeEffect添加到存储副作用函数的桶中
	    	track(target,key)
	    }
	    //得到原始值结果
	    const res =  Reflect.get(target,key,receiver)
	    //如果是浅响应，则直接返回原始值
	    if(isShallow){
	    	return res
	    }

	    if(typeof res == 'object' && res !== null){
	      //调用reactive将结果包装成响应式数据并返回
	      //如果数据为只读，则调用readonly对值进行包装
	      return  isReadonly ? readonly(res) : reactive(res)
	    }
	    //返回res
	    if(key === 'size'){
	    	//调用track函数建立响应联系
	    	track(target ,ITERATE_KEY)
	    	return res
	    }
	    return mutableInstrumentations[key]
	  },
	  //拦截设置操作
	  set(targe,key,newVal,receiver){
	  	//如果是只读的，则打印警告信息并返回
	  	if(isReadonly){
	  		console.warn(`属性${key}是只读的`)
	  		return true
	  	}
	    //先获取旧值
	    const oldVal = target[key]
	    //如果属性不存在，则说明是在添加新属性，否则是设置已有属性
	    //如果代理目标是数组，则检测被设置的索引值是否小于数组长度，
	    //如果是，则视作SET操作，否则是ADD操作
	    const type = Array.isArray(target) ? Number(key) < target.length ? 'SET':'ADD' 
	    :  Object.prototype.hasOwnProperty.call(target,key) ? 'SET':'ADD'
	    //设置属性值
	    const res = Reflect.set(target,key,newVal,receiver)
	    //target === receiver.raw说明rceiver 就是target的代理对象
	    if(target === receiver.raw){
	      //比较新值与旧值，只要当不全等，并且都不是NaN的时候才触发响应
	      if(oldVal !== newVal && （oldVal === oldVal || newVal === newVal){
	        //把副作用函数从桶中取出并执行
	        //增加第四个参数，即触发响应的新值
	        trigger(target,key,type,newVal)
	      }
	    }
	    
	    return res
	  },
	  deleteProperty(target,key){
	  	//如果是只读的，则打印警告信息并返回
	  	if(isReadonly){
	  		console.warn(`属性${key}是只读的`)
	  		return true
	  	}
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
	    //如果操作目标target是数组，则使用length属性作为key并建立响应联系
	    track(target,Array.isArray(target) ? 'length':ITERATE_KEY)
	    return Reflect.ownKeys(target)
	  }
	})
}

function reactive(obj){
	//优先通过原始对象obj寻找之前创建的代理对象，如果找到了，直接返回已有的代理对象
	const existionProxy = reactiveMap.get(obj)
	if(existionProxy) return existionProxy

	//否则，创建新的代理对象
	const proxy = createReactive(obj)
	//存储到Map中，从而帮忙重复创建
	reactiveMap.set(obj,proxy)
	return proxy
}

function shallowReactive(obj){
	return createReactive(obj,true)
}

function readonly(obj){
	return createReactive(obj,false,true)
}

function shallowReadonly(obj){
	return createReactive(obj,true,true)
}

