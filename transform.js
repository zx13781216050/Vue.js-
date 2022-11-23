function dump(node,indent = 0){
	//节点的类型
	const type = node.type
	//节点的描述，如果是根节点，则没有描述
	//如果是Element类型的节点，则使用node.tag作为节点的描述
	//如果是Text类型的节点，则使用node.content作为节点的描述
	const desc = node.type === 'Root' ? '' :node.type === 'Element'
	? node.tag : node.content
	//打印节点的类型和描述信息
	console.log(`${'-'.repeat(indent)}${type}:${desc}`)

	//递归地打印子节点
	if(node.children){
		node.children.forEach(n => dump(n,indent + 2))
	}
}
function traverseNode(ast,context){
	//设置当前转换的节点信息context.currentNode
	context.currentNode = ast
	//1.增加退出阶段的回调函数数组
	const exitFns = []
	//context.nodeTransforms是一个数组，其中每一个元素都是一个函数
	const transforms = context.nodeTransforms
	for(let i = 0;i<transforms.length;i++){
		//2.转换函数可以返回另外一个函数，该函数即作为退出阶段的回调函数
		//将当前节点currentNode和context都传递给nodeTransforms中注册的回调函数
		const onExit = transforms[i](context.currentNode,context)
		if(onExit){
			//将退出阶段的回调函数添加到exitFns数组中
			exitFns.push(onExit)
		}
		//由于任何转换函数都可能移除当前绩点，因此每个转换函数执行完毕后，
		//都应该检查当前节点是否已经被移除，如果移除了，直接返回即可
		if(!context.currentNode) return
	}

	const children = context.currentNode.children
	if(children){
		for(let i = 0; i< children.length;i++){
			//递归地调用traverseNode转换节点之前，将当前节点设置为父节点
			context.parent = context.currentNode
			//设置位置索引
			context.childIndex = i
			//递归地调用时，将context透传
			traverseNode(children[i],context)
		}
	}
	//在节点处理的最后阶段执行缓存到exitFns中的回调函数
	//注意，这里我们要反序执行
	let i = exitFns.length
	while(i--){
		exitFns[i]()
	}
}
function transform(ast){
	//在transform函数内创建context对象
	const context = {
		//增加currentNode，用来存储当前正在转换的节点
		currentNode:null,
		//增加childINDEX，用来存储当前节点在父节点的children中的位置索引
		childIndex:0,
		//增加parent,用来存储当前转换节点的父节点
		parent:null,
		//用于替换节点的函数，接受新节点作为参数
		replaceNode(node){
			//为了替换接单，我们需要修改AST
			//找到当前节点在父节点的children中的位置：context.childrenIndex
			//然后使用新节点替换即可
			context.parent.children[context.childIndex] = node
			//由于当前几点呢已经被新节点替换掉了，因此我们需要将currentNode更新为新节点
			context.currentNode = node
		},
		//用于删除当前节点
		removeNode(){
			if(context.parent){
				//调用数组的splice方法，根据当前绩点的索引删除当前绩点
				context.parent.children.splice(context.childIndex,1)
				//将context.currentNode置空
				context.currentNode = null
			}
		},
		//注册nodeTransforms数组
		nodeTransforms:[
			transformElement,//transformElement函数用来转换标签节点
			transformText,//transformText函数用来转换文本节点
		]
	}
	//调用traverseNode完成转换
	traverseNode(ast,context)
	//打印AST信心
	console.log(dump(ast))
}
function transformElement(node){
	//将转换代码编写在退出阶段的回调函数中，
	//这样可以保证该标签节点的子节点全部被处理完毕
	return() =>{
		//如果被转换的节点不是元素节点，则什么都不做
		if(node.type !== 'Element'){
			return
		}

		//1.创建h函数调用语句
		//h函数调用的第一个参数是标签名称，因此我们以node.tag来创建一个字符串字面量节点
		//作为第一个参数
		const callExp = createCallExpression('h',[
			createStringLiteral(node.tag)
		])
		//2.处理h函数调用的参数
		node.children.length === 1
		//如果当前标签绩点只有一个子节点，则直接使用子节点的jsNode作为参数
			? callExp.arguments.push(node.children[0],jsNode)
			//如果当前标签节点有多个子节点，则创建一个ArrayExpression节点作为参数
			: callExp.arguments.push(
				//数组的每个元素都是子节点的jsNode
				createArrayExpression(node.children,map(c => c.jsNode))
			)
		//3.将当前标签节点对应的JaveScript AST添加到jsNode属性下
		node.jsNode = callExp
	}
}
function transformText(node){
	//如果不是文本节点，则什么也不做
	if(node.type === 'Text'){
		return
	}
	//文本节点对应的JavaScript AST节点其实就是一个字符串字面量，
	//因此只需要使用node.content创建一个StringLiteral类型的节点即可
	//最后将文本节点对应的JavaScript AST节点添加到node.jsNode属性下
	node.jsNode = createStringLiteral(node.content)
}
//转换Root根节点
function transformRoot(node){
	//将逻辑写在退出阶段的回调函数中，保证子节点全部处理完毕
	return ()=>{
		//如果不是根节点，则什么都不做
		if(node.type !== 'Root'){
			return
		}
		//node是根节点，根节点的第一个子节点就是模板的根节点，
		//当然，这里我们暂时不考虑模板存在多个根节点的情况
		const vnodeJSAST = node.children[0].jsNode
		//创建render函数的声明语句节点，将vnodeJSAST作为render函数体的返回语句
		node.jsNode={
			type: 'FunctionDecl',
			id:{type:'Identifier',name:'render'},
			params:[],
			body:[
				{
					type:'ReturnStatement',
					return:vnodeJSAST
				}
			]
		}
	}
}
//用来创建StringLiteral节点
function createStringLiteral(value){
	return{
		type: 'StringLiteral',
		value
	}
}
//用来创建Identifier节点
function createIdentifier(name){
	return{
		type: 'Identifier',
		name
	}
}
//用来创建ArrayExpression节点
function createArrayExpression(elements){
	return{
		type: 'ArrayExpression',
		elements
	}
}
//用来创建CallExpression节点
function createCallExpression(callee,arguments){
	return{
		type: 'CallExpression',
		callee:createIdentifier(callee),
		arguments
	}
}