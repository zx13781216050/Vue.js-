//全局变量，存储当前正在被初始化的组件实例
let currentInstance = null
//该方法接收组件实例作为参数，并将该实例设置为currentInstance
function setCurrentInstance(instance){
	cunrrentInstance = instance
}
//在创建renderer时传入配置项
const renderer = createRenderer({
	//用于创建元素
	createElement(tag){
		return document.createElement(tag)
	},
	//用于设置元素的文本节点
	setElementText(el,text){
		el.textContent = text
	},
	//用于在给定的parent下添加指定元素
	insert(el,parent,anchor = null){
		parent.insertBefore(el,anchor)
	},
	createText(text){
		return document.createTextNode(text)
	},
	setText(el,text){
		el.nodeValue = text
	},
	//将属性设置相关操作封装到patchProps函数中，并作为渲染器选项传递
	patchProps(el,key,prevValue,nextValue){
		if(/^on/.test(key)){
			//定义el._vei为一个对象，存在事件名称到事件处理函数的映射
			const invokers = el._vei || (el._vei ={})
			//根据事件名称获取invoker
			let invoker = invokers[key]
			const name = key.slice(2).toLowerCase()
			if(nextValue){
				if(!invoker){
					//如果没有invoker ，则将一个伪造的invoker缓存到el._vei中
					//vei是vue event invoker 的缩写
					//将事件处理函数缓存到el._vei[key]下，避免覆盖
					invoker = el._vei[key] = (e)=>{
						//e.timeStamp是事件发生的时间
						//如果事件发生的时间早于事件处理函数绑定的时间，则不执行事件处理函数
						if(e.timeStamp < invoker.attached) return
						//如果invoker.value是数组，则遍历它并逐个调用事件处理函数
						if(Array.isArray(invoker.value)){
							invoker.vaue.forEach(fn => fn(e))
						}else{
							//当伪造的事件处理函数执行时，会执行真正的事件处理函数
							invoker.value(e)
						}
					}
					//将真正的事件处理函数赋值给invoker.value
					invoker.value = nextValue
					//添加invoker.attached属性，存储事件处理函数被绑定的时间
					invoker.attached = performance.now()
					//绑定invoker作为事件处理函数
					el.addEventListener(name,invoker)
				}else{
					//如果invoker 存在，意味着更新，并且只需要更新invoker.value的值即可
					invoker.value = nextValue
				}
			}else if(invoker){
				//新的事件绑定函数不存在，且之前绑定的 invoker 存在，则移除绑定
				el.removeEventListener(name,invoker)
			}
		}else if(key === 'class'){
			el.className = nextValue || ''
		}else if(shouldSetAsProps(el,key,nextValue)){
			//获取该DOM Properties的类型
			const type = typeof el[key]
			//如果是布尔类型，并且value是空字符串，则将值矫正为true
			if(type === 'boolean' && nextValue === ''){
				el[key] = true
			}else{
				el[key] = nextValue
			}
		}else{
			//如果要设置的属性没有对应的DOM Properties,则使用setAttribute函数设置属性
			el.setAttribute(key,nextValue)
		}
	}
})

function shouldSetAsProps(el,key,value){
	//特殊处理
	if(key === 'form' && el.tagName === 'INPUT') return false
	//兜底
	return key in el
}

function createRenderer(options){
	//通过options督导操作DOM的API
	const{ createElement,insert,setElementText,patchProps} = options

	function mountElement(vnode,container,anchor){
		//调用createElement函数创建元素
		//让vnode.el引用真实DOM元素
		const el = vnode.el = createElement(vnode.type)
		//处理子节点，如果子节点是字符串，代表元素具有文本节点
		if(typeof vnode.children == 'string'){
			//调用setElementText设置元素的文本节点
			setElementText(el,vnode.children)
		}else if(Array.isArray(vnode.children)){
			//如果children是数组，则遍历每一个子节点，并调用patch函数挂载它们
			vnode.children.forEach(child =>{
				patch(null,child,el)
			})
		}
		if(vnode.props){
			//遍历vnode.props
			for(const key in vnode.props){
				//调用patchProps函数即可
				patchProps(el,key,null,vnode.props[key])
			}
		}
		//判断一个VNode是否需要过渡
		const needTransition = vnode.needTransition
		if(needTransition){
			//调用transition.beforeEnter钩子，并将DOM元素作为参数传递
			vnode.transition.beforeEnter(el)
		}
		//调用insert函数将元素插入到容器内
		insert(el,container,anchor)
		if(needTransition){
			//调用transitio.enter钩子函数，并将DOM元素作为参数传递
			vnode.transition.enter(el)
		}
	}
	function patch(n1,n2,container,anchor){
		//如果n1存在，则对比n1和n2的类型
		if(n1&&n1.type !== n2.type){
			//如果新旧vnode的类型不同，则直接将旧vnode卸载
			unmount(n1)
			n1  = null
		}
		//代码运行到这里，证明n1和n2所描述的内容相同
		const {type} = n2
		//如果n2.type的值是字符串，则它描述的是普通标签元素
		if(typeof type === 'string'){
			if(!n1){
				//挂载时将锚点元素作为第三个参数传递给mountElement函数
				mountElement(n2,container,anchor)
			}else{
				patchElement(n1,n2)
			}
		}else if(type === Text){//如果新vnode的类型是Text,则说明该vnode描述的是文本节点
			//如果没有旧节点，则进行挂载
			if(!n1){
				//调用createText函数创建文本节点
				const el = n2.el = createText(n2.children)
				//将文本节点插入容器
				insert(el,container)
			}else{
				//如果旧vnode存在，只需要使用新文本节点的文本内容更新旧文本节点即可
				const el = n2.el = n1.el
				if(n2.children !== n1.children){
					//调用setTetxt函数更新文本节点的内容
					setText(el,n2.children)
			}
		}else if(type === Fragment){//处理Fragment类型的vnode
			if(!n1){
				//如果旧vnode不存在,则只需要将Fragment的children逐个挂载即可
				n2.children.forEach(c => patch(null,c,container))
			}else{
				//如果旧vnode存在，则只需要更新Fragment的children即可
				patchChildren(n1,n2,container)
			}
		}else if(typeof type === 'object' && type.__isTeleport){
			//组件选项中如果存在__isTeleport标识，则它是Teleport组件
			//调用Teleport组件选项中的process函数将控制权交接出去
			//传递给process函数的第五个参数是渲染器的一些内部方法
			type.process(n1,n2,container,anchor,{
				patch,patchChildren,unmount,move(vnode,container,anchor){
					insert(vnode.component ? vnode.component.subTree.el : vnode.el,container,anchor)
				}
			})
		}else if(//type是对象 -->有状态组件
			//type是函数 -->函数式组件
			typeof type === 'object' || typeof type === 'function'){
			//vnode.type 的值是选项对象，作为组件来处理
			if(!n1){
				//如果该组件已经被KeepAlive，则不会重新挂载它，二是会调用_activate来激活它
				if(n2.keptAlive){
					n2.keepAliveInstance._activate(n2,container,anchor)
				}else{
					//挂载组件
					mountComponent(n2,container,anchor)
				}
				
			}else{
				//更新组件
				patchComponent(n1,n2,anchor)
			}
		}
	}
	function render(vnode,container){
		if(vnode){
			//新vnode存在，将其与旧vnode一起传递给patch函数，进行打补丁
			patch(cntainer._vnode,vnode,container)
		}else{
			if(container._vnode){
				//调用unmount函数卸载vnode
				unmount(container._vnode)
			}
		}
		//把vnode存储到conainer._vnode下，即后续渲染中的旧vnode
		container._vnode = vnode
	}
	function patchElement(n1,n2){
		const el = n2.el = n1.el
		const oldProps = n1.props
		const newProps = n2.props
		//第一步：更新props
		for(const key in newProps){
			if(newProps[key] !== oldProps[key]){
				patchProps(el,key,oldProps[key],newProps[key])
			}
		}
		for(const key in oldProps){
			if(!(key in newProps)){
				patchProps(el,key,oldProps[key],null)
			}
		}
		//第二步：更新children
		patchChildren(n1,n2,el)
	}
	function patchChildren(n1,n2,container){
		//判断新子节点的类型是否是文本节点
		if(typeof n2.children === 'string'){
			//旧子节点的类型有三种可能：没有子节点、文本子节点以及一组子节点
			//只有当旧子节点为一组子节点时，才要逐个卸载，其他情况什么都不需要做
			if(Array.isArray(n1.children)){
				n1.children.forEach((c) => unmount(c))
			}
			//最后将新的文本节点内容设置给容器元素
			setElementText(container,n2.children)
		}else if(Array.isArray(n2.children)){
			//封装patchKeyedChildren函数处理两组子节点
			patchKeyedChildren(n1,n2,container)
		}else{
			//代码运行到这里，说明新子节点不存在
			//旧子节点是一组子节点，秩序逐个卸载即可
			if(Array.isArray(n1.children)){
				n1.children.forEach(c => unmount(c))
			}else if(typeof n1.children === 'string'){
				//旧子节点是文本子节点，清空内容即可
				setElementText(container,'')
			}
			//如果也没有子节点，那么什么也不做
		}
	}
	// function patchKeyedChildren(n1,n2,container){
	// 	const oldChildren = n1.children
	// 	const newChildren = n2.children
	// 	//四个索引值
	// 	let oldStartIdx = 0
	// 	let oldEndIdx = oldChildren.length - 1
	// 	let newStartIdx = 0
	// 	let newEndIdx = newChildren.length - 1
	// 	//四个索引指向的vnode节点
	// 	let oldStartVNode = oldChildren[oldStartIdx]
	// 	let oldEndVNode = oldChildren[oldEndIdx]
	// 	let newStarVNode = newChildren[newStartIdx]
	// 	let newEndVNode = newChildren[newEndIdx]
	// 	while(oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx){
	// 		//增加两个分支判断，如果头尾部节点为undefined，则说明该节点已经被处理过了，直接跳到下一个位置
	// 		if(!oldStartVNode){
	// 			oldStartVNode = oldChildren[++oldStartIdx]
	// 		}else if(!oldEndVNode){
	// 			oldEndVNode = oldChildren[--oldEndIdx]
	// 		}else if(oldStartVNode.key === newStartVNode.key){
	// 			//步骤一：oldStartVNode和newStartVNode比较
	// 			//调用patch函数在oldStartVNode和newStartVNode之间打补丁
	// 			patch(oldStartVNode,newStartVNode,container)
	// 			//更新相关索引，指向下一个位置
	// 			oldStartVNode = oldChildren[++oldStartIdx]
	// 			newStartVNode = newChildren[++newStartIdx]
	// 		}else if(oldEndVNode.key === newEndVNode.key){
	// 			//步骤二：oldEndVNode和newEndVNode比较
	// 			//节点在新的顺序中仍然处于尾部，不需要移动，但仍需打补丁
	// 			patch(oldEndVNode,newEndVNode,container)
	// 			//更新索引和头尾部节点变动
	// 			oldEndVNode = oldChildren[--oldEndIdx]
	// 			newEndVNode = newChildren[--newEndIdx]
	// 		}else if(oldStartVNode.key === newEndVNode.key){
	// 			//步骤三：oldStartVNode和newEndVNode比较
	// 			//调用patch函数在oldStartVNode和newEndVNode之间打补丁
	// 			patch(oldStartVNode,newEndVNode,container)
	// 			//将旧的一组子节点的头部节点对应的真实DOM节点oldStartVNod.el移动到
	// 			//旧的一组子节点的尾部节点对应的真实DOM节点后面
	// 			insert(oldStartVNode.el,container,oldEndVNode.el.nextSibling)
	// 			//更新相关索引到下一个位置
	// 			oldStartVNode = oldChildren[++oldStartIdx]
	// 			newEndVNode = newChildren[--newEndIdx]
	// 		}else if(oldEndVNode.key === newStartVNode.key){
	// 			//步骤四：oldEndVNode和newStartVNode比较
	// 			//仍然需要调用patch函数进行打补丁
	// 			patch(oldEndVNode,newStartVNode,container)
	// 			//移动DOM操作
	// 			//oldEndVNode.el移动到oldStartVNode.el前面
	// 			insert(oldEndVNode.el,container,oldStartVNode.el)

	// 			//移动DOM完成后，更新索引值，并指向下一个位置
	// 			oldEndVNode = oldChildren[--oldEndIdx]
	// 			newStartVNode = newChildren[++newStartIdx]
	// 		}else{
	// 			//遍历旧的一组子节点、试图寻找与newStartVNode拥有相同key值的节点
	// 			//idxInOld就是新的一组子节点的头部节点在旧的一组子节点中的索引
	// 			const idxInOld = oldChildren.findIndex(
	// 				node => node.key === newStartVNode.key
	// 			)
	// 			//idxInOld 大于 0 说明找到了可复用的节点，并且需要将其对应的真实DOM移动到头部
	// 			if(idxInOld > 0){
	// 				//idxInOld位置对应的vnode就是需要移动的节点
	// 				const vnodeToMove = oldChildren[idxInOld]
	// 				//不要忘记除移除操作外还需要打补丁
	// 				patch(vnodeToMove,newStartVNode,container)
	// 				//将vnodeToMove.el移动到头部节点oldStartVNode.el之前，因此使用后者作为锚点
	// 				insert(vnodeToMove.el,container，oldStartVNode.el)
	// 				//由于位置idxInOld处的节点所对应的真实DOM已经移动到了别处，因此将其设置为undefined
	// 				oldChildren[idxInOld] = undefined
	// 				//最后更新newStartIdx到下一个位置
	// 				newStartVNode = newChildren[++newStartIdx]
	// 			}else{
	// 				//将newStartVNode作为新节点挂载到头部，使用当前头部节点oldStartVNode.el作为锚点
	// 				patch(null,newStartVNode,container,oldStartVNode.el)
	// 			}
	// 			newStartVNode = newChildren[++newStartIdx]
	// 		}
	// 	}
	// 	//循环结束后检查检索引值的情况
	// 	if(oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx){
	// 		//如果满足条件，则说明有新的节点遗留，需要挂载它们
	// 		for(let i = newStartIdx;i<=newEndIdx;i++){
	// 			patch(null,newChildren[i],container,oldStartVNode.el)
	// 		}
	// 	}else if(newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx){
	// 		//移除操作
	// 		for(let i = oldStartIdx;i <= oldEndIdx;i++){
	// 			unmount(oldChildren[i])
	// 		}
	// 	}
	// }
	function patchKeyedChildren(n1,n2,container){
		const oldChildren = n1.children
		const newChildren = n2.children
		//处理相同的前置节点
		//索引j指向新旧两组子节点的开头
		let j =0
		let oldVNode = oldChildren[j]
		let newVNode = oldChildren[j]
		//while循环向后遍历，直到遇到拥有不同key值的节点为止
		while(oldVNode.key === newVNode.key){
			//调用patch函数进行更新
			patch(oldVNode,newVNode,container)
			//更细索引j，让其递增
			j++
			oldVNode = oldChildren[j]
			newVNode = newChildren[j]
		}

		//更新相同的后置节点
		//索引oldEnd指向旧的一组子节点的最后一个节点
		let oldEnd = oldChildren.length - 1
		//索引newEnd指向新的一组子节点的最后一个节点
		let newEnd = newChildren[newEnd]

		//while循环从后向前遍历，直达遇到拥有不同key值的节点为止
		while(oldVNode.key === newVNode.key){
			//调用patch函数进行更新
			patch(oldVNode,newVNode,container)
			//递减oldEnd和newEnd
			oldEnd--
			newEnd--
			oldVNode = oldChildren[oldEnd]
			newVNode = newChildren[newEnd]
		}

		//预处理完毕后，如果满足如下条件，则说明从j --》 nextEnd 之间的节点应作为新节点插入
		if(j>oldEnd && j<=newEnd){
			//锚点的索引
			const anchorIndex = newEnd + 1
			//锚点元素
			const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
			//采用while循环，调用patch函数逐个挂载新增节点
			while(j <= newEnd){
				patch(null,newChildren[j++],container,anchor)
			}
		}else if(j > newEnd && j <= oldEnd){
			//j -> oldEnd 之间的节点应该被卸载
			while(j <= oldEnd){
				unmount(oldChildren[j++])
			}
		}else{
			//构造source数组
			//新的一组子节点中剩余未处理节点的数量
			const count = newEnd - j + 1
			const source = new Array(count)
			source.fill(-1)

			//oldStart 和 newStart 分别为起始索引，即j
			const oldStart = j
			const newStart = j
			const moved = false
			const pos = 0
			//构建索引表
			const keyIndex = {}
			for(let i = newStart;i<=newEnd;i++){
				keyIndex[newChildren[i].key] = i
			}
			//新增patched变量，代表更新过的节点数量
			let patched = 0
			//遍历旧的一组子节点中剩余未处理的节点
			for(let i = oldStart;i<=oldEnd;i++){
				oldVNode = oldChildren[i]
				//如果更新过的节点数量小于等于需要更新的节点数量，则执行更新
				if(patched <= count){
					//通过索引表快速找到新的一组子节点中具有相同key值的节点位置
					const k = keyIndex[oldVNode.key]
					if(typeof k !== 'undefined'){
						newVNode = newChildren[i]
						//调用patch函数完成更新
						patch(oldVNode,newVNode,container)
						//填充source数组
						source[k - newStart] = i
						//判断节点是否需要引动
						if(k < pos){
							moved = true
						}else{
							pos = k
						}
					}else{
					//没找到
					unmount(oldVNode)
					}	
				}else{
					//r如果更新的节点数量大于需要更新的节点数量，则卸载多余的节点
					unmount(oldVNode)
				}		
			}

			if(moved){
				const seq = lis(sources)

				//s指向最长递增子序列的最后一个元素
				let s = seq.length - 1
				//i指向新的一组子节点的最后一个元素
				let i = count - 1
				//for循环使得i递减，即按照图11-24中箭头的方向移动
				for(i;i>=0;i--){
					if( source[i] === -1){
						//说明索引为i的节点时全新的节点，应该将其挂载
						//该节点在新的children中的真实位置索引
						const pos = i + newStart
						const newVNode = newChildren[pos]
						//该节点的下一个节点的位置索引
						const nextPos = pos + 1
						//锚点
						const anchor = nextPos < newChildren.length ？ newChildren[nextPos].el : null
						//挂载
						patch(null,newVNode,container,anchor)
					}else if(i !== seq[s]){
						//如果节点的索引i不等于seq[s]的值，说明该节点需要移动
						//该节点在新的一组子节点中的真实位置索引
						const pos = i + newStart
						const newVNode = newChildren[pos]
						//该节点的下一个节点的位置索引
						const nextPos = pos + 1
						//锚点
						const anchor = nextPos < newChildren.length ？ newChildren[nextPos].el : null
						//移动
						insert(newVNode.el,container,anchor)
					}else{
						//当i===seq[s]时，说明该位置的节点不需要移动
						//只需要让s指向下一个位置
						s--
					}
				}
			}
		}
	}
	function mountComponent(vnode,container,anchor){
		//检查是否是函数式组件
		const isFunctional = typeof vnode.type === 'function'
		//通过vnode获取组件的选项对象，即vnode.type
		let componentOptions = vnode.type
		if(isFunctional){
			//如果是函数式组件，则将vnode.type作为渲染函数，将vnode.type.props作为props选项定义即可
			componentOptions = {
				render:vnode.type,
				props: vnode.type.props
			}
		}
		//获取组件的渲染函数render
		const { render,data,props:propsOption,setup } = componentOptions
		//调用data函数得到原始数据，并调用reactive函数将其包装为响应式数据
		const state = reactive(data())
		//调用resolveProps函数解析除最终的props数据与attrs数据
		const [props,attrs] = resolveProps(propsOptions,vnode.props)
		//直接使用编译好的vnode.children对象作为slots对象即可
		const slots = vnode.children || {}
		
		//定义组件实例，一个组件实例本质上就是一个对象，它包含与组件有关的状态信息
		const instance = {
			//组件自身的状态数据，即data
			state,
			//将解析出的props数据包装为shalloReactive并定义到组件实例上
			props:shallowReactive(props),
			//一个布尔值，用来表示组件是否已经被挂载，初始值为false
			isMounted:false,
			//组件所渲染的内容,即子树（subTree）
			subTree:null,
			//将插槽添加到组件实例上
			slots,
			//在组件实例中添加mounted数组，用来存储通过onMounted函数注册的生命周期钩子函数
			mounted:[],
			//只有KeepAlive组件的实例下会有keepAliveCtx属性
			keepAliveCtx:null
		}

		//检查当前要挂载的组件是否是KeepAlive组件
		const isKeepAlive = vnode.type.__isKeepAlive
		if(isKeepAlive){
			//在KeepAlive组件实例上添加keepAliveCtx对象
			instance.keepAliveCtx = {
				//move函数用来移动一段vnode
				move(vnode,container,anchor){
					//本质上将组件渲染的内容移动到指定容器中，即隐藏容器中
					insert(vnode.component.subTree.el,container,anchor)
				},
				createElement
			}
		}

		//定义emit函数，它接受两个参数
		//event:事件名称
		//payload:传递给事件处理函数的参数
		function emit(event,...payload){
			//根据约定对事件名称进行处理，例如change --> onChange
			const eventName = `on${event[0].toUpperCse()+event.slice(1)}`
			//根据处理后的事件名称去props中寻找对应的事件处理函数
			const handler = instance.props[eventName]
			if(handler){
				//调用事件处理函数并传递参数
				handler(...payload)
			}else{
				console.log('事件不存在')
			}
		}
		
		const setupContext = { attrs,emit,slots}
		//在调用seup函数前，设置当前组件实例
		setCurrentInstance(instance)
		//调用setup函数，将只读版本的props作为第一个参数传递，避免用户意外地修改props的值，
		//将setupContext作为第二个参数传递
		const setupResult = setup(shallowReadonly(instance.props),setupContext)
		//在setup函数执行完毕后，重置当前组件实例
		setCurrentInstance(null)
		//setupState用来存储有setup返回的数据
		let setupState = null
		//如果setup函数的返回值是函数，则将其作为渲染函数
		if(typeof setupResult === 'function'){
			//报告冲突
			if(render) console.error('setup函数返回渲染函数，render选项将被忽略')
			//将setupResult函数作为渲染函数
			render = setupResult
		}else{
			//如果setup的返回值不是函数，作为数据状态赋值给setupState
			setupState = setupResult
		}
		
		//将组件实例设置到vnode上，用于后续更新
		vnode.component = instance

		//创建渲染上下文对象，本质上是组件实例的代理
		const renderContext = new Proxy(instance,{
			get(t,k,r){
				//取得组件自身状态与props数据
				const { state,props,slots }= t
				//当k的值为$slots时，直接返回组件实例上的slots
				if(k === '$slots') return slots
				//先尝试读取自身状态数据
				if(state && k in state){
					return state[k]
				}else if(k in props){//如果组件自身没有该数据，则尝试从props中读取
					return props[k]
				}else if(setupState && k in setupState){
					//渲染上下文需要增加对setupState的支持
					return setupState[k]
				}else{
					console.error('不存在')
				}
			},
			set(t,k,v,r){
				const {state,props} = typeof
				if(state && k in state){
					state[k] = v
				}else if(k in props){
					props[k] = v
				}else if(setupState && k in setupState){
					//渲染上下文需要增加对setupState的支持
					setupState[k] = v
				}else{
					console.error('不存在')
				}
			}
		})
		//生命周期函数调用时要绑定渲染上下文对象
		created && created.all(renderContext)
		//将组件的render函数调用包装到effect内
		effect(()=>{
			//调用组件的渲染函数，获得子树
			const subTree = render.call(state,state)
			//检查组件是否已经被挂载
			if(!instance.isMounted){
				beforeMount && beforeMount.call(state)
				//初次挂载，调用patch函数第一个参数传递null
				patch(null,subTree,container,anchor)
				//重点：将组件实例的isMounted设置为true，这样当更新发生时就不会再次进行挂载操作
				//而是会执行更新
				instance.isMounted = true
				//遍历instance.mounted数组并逐个执行即可
				instance.mounted && instance.mounted.forEach(hook => hook.call(renderContext))
			}else{
				beforeUpdate && beforeUpdate.call(state)
				//当isMounted为true时，说明组件已经被挂载，只需要完成自更新即可，
				//所以在调用patch函数时，第一个参数为组件上一次渲染的子树
				//意思是，使用新的子树与上一次渲染的子树进行打补丁操作
				patch(instance.subTree,subTree,container,anchor)
				updated && updated.call(state)
			}
			//更新组件实例的子树
			instance.subTree = subTree
		},{
			//指定该副作用函数的调度器为queueJob即可
			scheduler:queueJob
		})
	}
	//resolveProps函数用于解析组件props和attrs数据
	function resolveProps(options,propsData){
		const props = {}
		const attrs = {}
		//遍历为组件传递的props数据
		for(const key in propsData){
			//以字符串on开头的props，无论是否显式地声明，都将其添加到props数据中，而不是attrs中
			if(key in options || key.starWith('on')){
				//如果为组件传递的props数据在组件自身的props选项中有定义，则将其视为合法的props
				props[key] = propsData[key]
			}else{
				//否则将其作为attrs
				attrs[key] = propsData[key]
			}
		}
		//最后返回props与attrs数据
		return [props,attrs]
	}
	function patchComponent(n1,n2,anchor){
		//获取组件实例，即n1.component,同时让新的组件虚拟节点n2.component也指向组件实例
		const instance = (n2.component = n1.component)
		//获取当前的props数据
		const {props} = instance
		//调用hasPropsChanged检测为子组件传递的props是否发生变化,如果没有变化，则不需要更新
		if(hasPropsChanged(n1.props,n2.props)){
			//调用resolveProps函数重新获取props数据
			const [nextProps] = resolveProps(n2.type.props,n2.props)
			//更新props
			for(const k in nextProps){
				props[k] = nextProps[k]
			}
			//删除不存在的props
			for(const k in props){
				if(!k in nextProps) delete props[k]
			}
		}
	}
	function hasPropsChanged(prevProps,nextProps){
		const nextKeys = Object.keys(nextProps)
		//如果新旧props的数量变了，则说明有变化
		if(nextKeys.length !== Object.keys(prevProps).length){
			return true
		}
		for(let i = 0;i<nextKeys.length;i++){
			const key = nextKeys[i]
			//有不相等的props，则说明有变化
			if(nextProps[key] !== prevProps[key]) return true
		}
		return false
	}
	function onMounted(fn){
		if(currentInstance){
			//将生命周期函数添加到instance.mounted数组中
			currentInstance.mounted.push(fn)
		}else{
			console.error('onMounted函数只能在setup中调用')
		}
	}
	
	return {
		render
	}
}

function unmount(vnode){
	//判断VNode是否需要过渡处理
	const needTransition = vnode.transition
	//在卸载时，如果卸载的vnode类型为Fragment,则只需要卸载其children
	if(vnode.type === Fragment){
		vnode.children.forEach(c => unmount(c))
		return
	}else if(typeof vnode.type == 'object'){
		//vnode.shouldKeepAlive是一个布尔值，用来标识该组件是否应该被KeepAlive
		if(vnode.shouldKeepAlive){
			//对于需要被KeepAlive的组件，我们不应该真的卸载它，而应调用该组件的父组件，
			//即KeepAlive组件的_deActivate函数使其失活
			vnode.keepAliveInstance._deActivate(vnode)
		}else{
			//对于组件的卸载，本质上是要卸载组件所渲染的内容，即subTree
			unmount(vnode.component.subTree)
		}
		
		return
	}
	//获取el的父元素
	const parent = vnode.el.parentNode
	//调用removeChild移除元素
	if(parent){
		//将卸载动作封装到performRemove函数中
		const performRemove = () => parent.removeChild(vnode.el)
		if(needTransition){
			//如果需要过渡处理，则调用transition.leave钩子
			//同时将DOM元素和performRemove函数作为参数传递
			vnode.transition.leave(vnode.el,performRemove)
		}else{
			//如果不需要过渡处理，则直接执行卸载操作
			performRemove()
		}
	}
}

const MyComponent = {
	//组件名称，可选
	name:'MyComponent',
	//用data函数来定义组件自身的状态
	data(){
		return {
			foo:'hello world'
		}
	}
	//组件的渲染函数，其返回值必须为虚拟DOM
	render(){
		//返回虚拟DOM
		return{
			type:'div',
			children:'foo的值是：${this.foo}' //在渲染函数内使用组件状态
		}
	}
}
//用来描述组件的VNode对象，type属性值为组件的选项对象
const CompVNode = {
	type:MyComponent
}
//调用渲染器来渲染组件
renderer.render(CompVNode,document.querySelector('#app'))

//任务缓存队列，用一个Set数据结构来表示，这样就可以自动对任务进行去重
const queue = new Set()
//一个标志，代表是否正在刷新任务队列
let isFlushing = false
//创建一个立即resolve的Promise实例
const p = Promise.resolve()

//调度器的主要函数，用来将一个任务添加到缓冲队列中，并开始刷新队列
function queueJob(job){
	//将job添加到任务队列queue中
	queue.add(job)
	//如果还没有开始刷新队列，则刷新之
	if(!isFlushing){
		//将该标志设置为true以避免重新刷新
		isFlushing = true
		//在微任务中刷新缓冲队列
		p.then(()=>{
			try{
				//执行任务队列中的任务
				queue.forEach(job => job())
			}finally{
				//重置状态
				isFlushing = false
				queue.length = 0
			}
		})
	}
}