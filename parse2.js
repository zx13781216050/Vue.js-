//定义文本模式，作为一个状态表
const TextModes = {
	DATA:'DATA',
	RCDATA:'RCDATA',
	RAWTEXT:'RAWTEXT',
	CDATA:'CDATA'
}

//解析器函数，接受模板作为参数
function parse(str){
	//定义上下文对象
	const context = {
		//source 是模板内容，用于在解析过程中进行消费
		source:str,
		//解析器当前处于文本模式，初始模式为DATA
		mode:TextModes.DATA
	}
	//调用parseChildren函数开始进行解析，他返回解析后得到的子节点
	//parseChildren函数接受两个参数
	//第一个参数是由上下文对象context
	//第二个参数是由父代节点构成的节点栈，初始时栈为空
	const nodes = parseChildren(context,[])

	//解析器返回Root根节点
	return {
		type:'Root',
		//使用nodes作为根节点的children
		children:nodes
	}
}

function parseChilren(context,ancestors){
	//定义nodes数组存储子节点，它将作为最终的返回值
	let nodes = []
	//从上下文对象中取得当前状态，包括模式mode和模板内容source
	const {mode,source} = context
	//开启while循环，只要满足条件就会一会对字符串进行解析
	while(!isEnd(context,ancestors)){
		let node 
		//只有DATA模式和RCDATA模式才支持插值节点的解析
		if(mode === TextModes.DATA || mode === TextModes.RCDATA){
			//只有DATA模式才支持标签节点的解析
			if(mode === TextModes.DATA && source[0] === '<'){
				if(source[1] === '!'){
					//注释
					node = parseComment(context)
				}else if(source.startsWith('<![CDATA[')){
					//CDATA
					node = parseCDATA(context,ancestors)
				}
			}else if(source[1] === '/'){
				//状态机遭遇了闭合标签，此时应该抛出错误，因为它缺少与之对应的开始标签
				console.error('无效的技术标签')
			}else if(/[a-z]/i.test(source[1])){
				//标签
				node = parseElement(context,ancestors)
			}
		}else if(source.startsWith('{{')){
			//解析插值
			node = parseInterpolation(context)
		}
	}

	//node不存在，说明处于其他模式，即非DATA模式且非RCDATA模式
	//这时一切内容都作为文本处理
	if(!node){
		//解析文本节点
		node = parseText(context)
	}

	//将节点添加到nodes数组中
	nodes.push(node)

	//当while循环停止后，说明子节点解析完毕，返回子节点
	return nodes
}

function parseElement(){
	//解析开始标签
	const element = parseTag()
	if(element.isSelfClosing) return element

	ancestors.push(element)
	//这里递归地调用parseChildren函数进行<div>标签子节点的解析
	element.children = parseChildren(context,ancestors)
	ancestors.pop()

	if(context.source.startsWith(`</${element.tag}`)){
		//解析结束标签
		parseEndTag()
	}else{
		//缺少闭合标签
		console.error(`${element.tag} 标签缺少闭合标签`)
	}

	return element
}

function isEnd(context,ancestors){
	//当模板内容解析完毕后，停止
	if(!context.source) return true
	//与父级节点栈内中的所有节点做比较
	for(let i = ancestors.length - 1;i >= 0;--i){
		//只要栈中存在与当前结束标签同名的节点，就停止状态机
		if(context.source.startsWith(`</${ancestors[i].tag}`)){
			return true
		}
	}
}