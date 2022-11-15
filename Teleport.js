//Teleport组件的定义
const Teleport = {
	__isTeleport:true,
	process(n1,n2,container,anchor,internals){
		//通过internals参数取得渲染器的内部方法
		const {patch} = internals
		//如果存旧VNode n1 不存在，则是全新的挂载，否则执行更新
		if(!n1){
			//挂载
			//获取容器，即挂载点
			const target = tpeof n2.props.to === 'string' ? document.querySelector(n2.props.to) : n2.props.to
			//将n2.children渲染到指定挂载点即可
			n2.children.forEach(c => patch(null,c,target,anchor))
		}else{
			patchChildren(n1,n2,container)
			//如果新旧to参数的值不同，则需要对内容进行移动
			if(n2.props.to !=== n1.props.to){
				//获取新的容器
				const newTarget = tpeof n2.props.to === 'string' ? document.querySelector(n2.props.to) : n2.props.to
				//移动到新的容器
				n2.children.forEach(c => move(c,newTarget))
			}
		}
	}
}


function render(){
	return {
		type:Teleport,
		//以普通children的形式代表被Teleport的内容
		children:[
			{ type:'h1',children:'Title'},
			{ type:'p',chidlren:'content'}
		]
	}
}