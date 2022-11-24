function compile(template){
	//模板AST
	const ast = parse(template)
	//将模板AST转换为JavaScript AST
	transform(ast)
	//代码生成
	const code = generate(ast.jsNode)

	return code
}

function generate(node){
	const context = {
		//存储最终生成的渲染函数代码
		code:'',
		//在生成代码时，通过调用push函数完成代码的拼接
		push(code){
			context.code += code
		},
		//当前缩进的级别，初始值为0，即没有缩进
		currentIndent:0,
		//该函数用来换行，即在代码字符串的后面追加\n字符，
		//另外，换行时应该保持缩进，所以我们还要追加currentIndent * 2个空格
		newline(){
			context.code += '\n' + `  `.repeat(context.currentIndent)
		},
		//用啦缩进，即让currentIndent自增后，调用换行函数
		indent(){
			context.currentIndent++
			context.newline()
		},
		//取消缩进，即让currentIndent自减后，调用换行函数
		deIndent(){
			context.currentIndent--
			context.newline()
		},
	}

	//调用genNode函数完成代码生成的工作
	genNode(node,context)

	//返回渲染函数代码
	return context.code
}

function genNode(node,context){
	switch(node.type){
		case 'FunctionDecl':
			genFunctionDecl(node,context)
			break;
		case 'ReturnStatement':
			genReturnStatement(node,context)
			break;
		case 'CallExpression':
			genCallExpression(node,context)
			break;
		case 'StringLiteral':
			genStringLitral(node,context)
			break;
		case 'ArrayExpression':
			genArrayExpression(node,context)
			break;
	}
}

function genFunctionDecl(node,context){
	//从context对象中取出工具函数
	const {push,indent,deIndent} = context
	//node.id是一个标识符，用来描述函数的名称，即node.id.name
	push(`function ${node.id.name}`)
	push(`(`)
	//调用genNodeList为函数的参数生成代码
	genNodeList(node.params,context)
	push(`) `)
	push(`{`)
	//缩进
	indent()
	//为函数体生成代码，这里递归地调用了genNode函数
	node.body.forEach(n=>genNode(n,context))
	//取消缩进
	deIndent()
	push(`}`)
}

function genNodeList(nodes,context){
	const {push} = context
	for(let i =0;i<nodes.length;i++){
		const node = nodes[i]
		genNode(node,context)
		if(i<nodes.length - 1){
			push(', ')
		}
	}
}

function genArrayExpression(node,context){
	const {push} = context
	//追加方括号
	push('[')
	//调用genNodeList为数组元素生成代码
	genNodeList(node.elements,context)
	//补全方括号
	push(']')
}

function genReturnStatrment(node,context){
	const  {push} = context
	//住家return关键字和空格
	push(`return `)
	//调用genNode函数递归地生成返回值代码
	genNode(node,return,context)

}

function genStringLiteral(node,context){
	const  {push} = context
	//对于字符串字面量，只需要追加与node.value对应的字符串即可
	push(`'${node.value}'`)
}
function CallExpression(node,context){
	const { push } = context
	//取得被调用函数名称和参数列表
	const { callee,arguments:args} = node
	//生成函数调用代码
	push(`${callee.name}(`)
	//调用genNodeList生成参数代码
	genNodeList(args,context)
	//补全括号
	push(`)`)
}