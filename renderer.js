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
		//调用insert函数将元素插入到容器内
		insert(el,container,anchor)
	}
	function patch(n1,n2,container){
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
	function unmount(vnode){
		//在卸载时，如果卸载的vnode类型为Fragment,则只需要卸载其children
		if(vnode.type === Fragment){
			vnode.children.forEach(c => unmount(c))
			return
		}
		//获取el的父元素
		const parent = vnode.el.parentNode
		//调用removeChild移除元素
		if(parent) parent.removeChild(vnode.el)
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
	function patchKeyedChildren(n1,n2,container){
		const oldChildren = n1.children
		const newChildren = n2.children
		//四个索引值
		let oldStartIdx = 0
		let oldEndIdx = oldChildren.length - 1
		let newStartIdx = 0
		let newEndIdx = newChildren.length - 1
		//四个索引指向的vnode节点
		let oldStartVNode = oldChildren[oldStartIdx]
		let oldEndVNode = oldChildren[oldEndIdx]
		let newStarVNode = newChildren[newStartIdx]
		let newEndVNode = newChildren[newEndIdx]
		while(oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx){
			//增加两个分支判断，如果头尾部节点为undefined，则说明该节点已经被处理过了，直接跳到下一个位置
			if(!oldStartVNode){
				oldStartVNode = oldChildren[++oldStartIdx]
			}else if(!oldEndVNode){
				oldEndVNode = oldChildren[--oldEndIdx]
			}else if(oldStartVNode.key === newStartVNode.key){
				//步骤一：oldStartVNode和newStartVNode比较
				//调用patch函数在oldStartVNode和newStartVNode之间打补丁
				patch(oldStartVNode,newStartVNode,container)
				//更新相关索引，指向下一个位置
				oldStartVNode = oldChildren[++oldStartIdx]
				newStartVNode = newChildren[++newStartIdx]
			}else if(oldEndVNode.key === newEndVNode.key){
				//步骤二：oldEndVNode和newEndVNode比较
				//节点在新的顺序中仍然处于尾部，不需要移动，但仍需打补丁
				patch(oldEndVNode,newEndVNode,container)
				//更新索引和头尾部节点变动
				oldEndVNode = oldChildren[--oldEndIdx]
				newEndVNode = newChildren[--newEndIdx]
			}else if(oldStartVNode.key === newEndVNode.key){
				//步骤三：oldStartVNode和newEndVNode比较
				//调用patch函数在oldStartVNode和newEndVNode之间打补丁
				patch(oldStartVNode,newEndVNode,container)
				//将旧的一组子节点的头部节点对应的真实DOM节点oldStartVNod.el移动到
				//旧的一组子节点的尾部节点对应的真实DOM节点后面
				insert(oldStartVNode.el,container,oldEndVNode.el.nextSibling)
				//更新相关索引到下一个位置
				oldStartVNode = oldChildren[++oldStartIdx]
				newEndVNode = newChildren[--newEndIdx]
			}else if(oldEndVNode.key === newStartVNode.key){
				//步骤四：oldEndVNode和newStartVNode比较
				//仍然需要调用patch函数进行打补丁
				patch(oldEndVNode,newStartVNode,container)
				//移动DOM操作
				//oldEndVNode.el移动到oldStartVNode.el前面
				insert(oldEndVNode.el,container,oldStartVNode.el)

				//移动DOM完成后，更新索引值，并指向下一个位置
				oldEndVNode = oldChildren[--oldEndIdx]
				newStartVNode = newChildren[++newStartIdx]
			}else{
				//遍历旧的一组子节点、试图寻找与newStartVNode拥有相同key值的节点
				//idxInOld就是新的一组子节点的头部节点在旧的一组子节点中的索引
				const idxInOld = oldChildren.findIndex(
					node => node.key === newStartVNode.key
				)
				//idxInOld 大于 0 说明找到了可复用的节点，并且需要将其对应的真实DOM移动到头部
				if(idxInOld > 0){
					//idxInOld位置对应的vnode就是需要移动的节点
					const vnodeToMove = oldChildren[idxInOld]
					//不要忘记除移除操作外还需要打补丁
					patch(vnodeToMove,newStartVNode,container)
					//将vnodeToMove.el移动到头部节点oldStartVNode.el之前，因此使用后者作为锚点
					insert(vnodeToMove.el,container，oldStartVNode.el)
					//由于位置idxInOld处的节点所对应的真实DOM已经移动到了别处，因此将其设置为undefined
					oldChildren[idxInOld] = undefined
					//最后更新newStartIdx到下一个位置
					newStartVNode = newChildren[++newStartIdx]
				}else{
					//将newStartVNode作为新节点挂载到头部，使用当前头部节点oldStartVNode.el作为锚点
					patch(null,newStartVNode,container,oldStartVNode.el)
				}
				newStartVNode = newChildren[++newStartIdx]
			}
		}
		//循环结束后检查检索引值的情况
		if(oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx){
			//如果满足条件，则说明有新的节点遗留，需要挂载它们
			for(let i = newStartIdx;i<=newEndIdx;i++){
				patch(null,newChildren[i],container,oldStartVNode.el)
			}
		}else if(newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx){
			//移除操作
			for(let i = oldStartIdx;i <= oldEndIdx;i++){
				unmount(oldChildren[i])
			}
		}
	}
	return {
		render
	}
}

