//在set拦截函数内调用trigger函数触发变化
function trigger(target,key,type,newVal){
    //根据target从桶中取得depsMap，它是key--->effects
    const depsMap = bucket.get(target)
    if(!depsMap) return
    //根据key取得所有副作用函数effects
    const effects = depsMap.get(key)
    //取得与ITERATE_KEY相关联的副作用函数
    const iterateEffects = depsMap.get(ITERATE_KEY)
    //执行副作用函数
	//防止遍历Set时因cleanup出现无限循环问题
	const effectsToRun = new Set(effects)
	effects && effects.forEach(effectFn =>{
		//如果trigger触发执行的副作用函数与当前正在执行的副作用函数相同，则不触发执行
		if(effectFn !== activeEffect){
			effectsToRun.add(effectFn)
		}
	})
	//只有当操作类型为‘ADD’或DELETE时，才触发与ITERATE_KEY相关联的副作用函数重新执行
	//如果操作类型是SET，并且目标对象是Map类型的数据，也应该触发那些与ITERATE_KEY相关联的副作用函数重新执行
	if(type === 'ADD'||type=== 'DELETE' || (type === 'Set' && Object.prototype.toString.call(target) === '[object Map]')){
		//将于ITERATE_KEY相关联的副作用函数也添加到effectsToRun
		iterateEffects = depsMap.get() && iterateEffects.forEach(effectFn => {
			if(effectFn !== activeEffect){
				effectsToRun.add(effectFn)
			}
		})
	}
	if((type === 'ADD'||type=== 'DELETE') && Object.prototype.toString.call(target) === '[object Map]'){
		//取出那些与MAP_KEY_ITERATE_KEY相关联的副作用函数并执行
		const iterateEffects = depsMap.get(MAP_KEY_ITERATE_KEY)
		iterateEffects = depsMap.get() && iterateEffects.forEach(effectFn => {
			if(effectFn !== activeEffect){
				effectsToRun.add(effectFn)
			}
		})
	}
	//当操作类型为ADD并且目标对象是数组时，应该取出并执行那些与length属性相关练得副作用函数
	if(type==='ADD'&&Array.isArray(target)){
		//取出与length相关联的副作用函数
		const lengthEffects = depsMap.get('length')
		//将这些副作用函数添加到effectsToRun中，待执行
		lengthEffects && lengthEffects.forEach(effectFn=>{
			if(effectFn !== activeEffect){
				effectsToRun.add(effectFn)
			}
		})
	}
	//如果操作目标为数组，并且修改了数组的length属性
	if(Array.isArray(target)&&key==='length'){
		//对于索引大于或等于新的length值的元素。需要把所有相关联的副作用函数取出并添加到effectsToRun中执行
		depsMap.forEach((effects,key)=>{
			if(key >= newVal){
				effects.forEach(effectFn=>{
					if(effectFn !== activeEffect){
						effectsToRun.add(effectFn)
					}
				})
			}
		})
	}
	effectsToRun.forEach(effectFn => {
		//如果一个副作用函数存在调度器，则调用该调度器，并将副作用函数作为参数传递
		if(effectFn.options.scheduler){
			effectFn.options.scheduler(effectFn)
		}else{
			//否则直接执行副作用函数
			effectFn()
		}
	})
    //effects && effects.forEach(fn => fn())
}