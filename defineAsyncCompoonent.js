const AsyncComp = defineAsyncComponent({
	loader:()=>import('CompA.vue'),
	timeout:2000,//超时时长，单位为ms
	errorComponent:MyErrorComp//指定出错时要渲染的组件
})
//defineAsyncComponent函数用于定义一个异步组件，接受一个异步组件加载器作为参数
function defineAsyncComponent(options){
	//options可以是配置项，也可以是加载器
	if(typeof options === 'function'){
		//如果options是加载器，则将其格式化为配置项形式
		options = {
			loader:options
		}
	}
	const { loader } = options
	//一个变量，用来存储异步加载的组件
	let InnerComp = null
	//返回一个包装组件
	return {
		name:'AsyncComponentWrapper',
		setup(){
			//异步组件是否加载成功
			const loaded = ref(false)
			//定义error,当错误发生时，用来存储错误对象
			const error = shallowRef(null)

			//执行加载器函数，返回一个promise实例
			//加载成功后，将加载成功的组件赋值给InnerComp，并将loaded标记为true，代表加载成功
			loader().then(c => {
				InnerComp = c
				loaded.value = true
			}).catch((err)=> erpr.value = err)

			let timer = null
			if(options.timeout){
				//如果指定了超时时长，则开启一个定时器计时
				timer = setTimeout(()=>{
					//超时后创建一个错误对象，并复制给error.value
					const err = new Error(`Async component timed out after ${options.timeout}ms.`)
					error.value = err
				},options.timeout)
			}
			//包装组件被卸载是清除定时器
			onUnmounted(()=>clearTimeout(timer))

			//占位内容
			const placeholder = { type:Text, children:'' }

			return ()=>{
				if(loaded.value){
					//如果异步组件加载成功，则渲染被加载的组件
					return { type: InnerComp }
				}else if(error.value && options.errorComponent){
					//只有当错误存在且用户配置了errorComponent时才展示Error组件，同时将error作为props传递
					return  { type: options.errorComponent,props: {error:error.value}}
				}
				return placeholder
			}
		}
	}
}