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
		mode:TextModes.DATA,
		//advanceBy函数用来消费指定数量的字符，它接收一个数字作为参数
		advanceBy(num){
			//根据给定字符数num，截取位置num后的模板内容，并替换当前模板内容
			context.source = context.source.slice(num)
		},
		//无论是开始标签还是结束标签，都可能存在空白字符，例如<div  >
		advanceSpaces(){
			//匹配空白字符
			const match = /^[\t\r\n\f ]+/.exec(context.source)
			if(match){
				//调用advanceBy(match[0].length)
			}
		}
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

function parseElement(context,ancestors){
	//解析开始标签
	const element = parseTag(context)
	if(element.isSelfClosing) return element

	//切换到正确的文本模式
	if(element.tag === 'textarea' || element.tag === 'title'){
		//如果由parseTag解析的到的标签是<textarea>或<title>,则切换到RCDATA模式
		context.mode = TextModes.RCDATA
	}else if(/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)){
		//如果由parseTag解析得到的标签是：
		//<style><xmp><iframe><noembed><noframes><noscript>
		//则切换到RAWTEXT模式
		context.mode = TextModes.RAWTEXT
	}else{
		//否则切换到DATA模式
		context.mode = TextModes.DATA
	}

	ancestors.push(element)
	//这里递归地调用parseChildren函数进行<div>标签子节点的解析
	element.children = parseChildren(context,ancestors)
	ancestors.pop()

	if(context.source.startsWith(`</${element.tag}`)){
		//在次调用parseTag函数解析技术标签，传递了第二个参数：‘end’
		parseEndTag(context,'end')
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

function parseTag(context,type='start'){
	//从上下文对象中拿到advanceBy函数
	const { advanceBy,advanceSpaces } = context

	//处理开始标签和结束标签的正则表达式不同
	const match = type === 'start'
		//匹配开始标签
		？ /^<([a-z][^\t\r\n\f />]*)/i.exec(context.source)
		//匹配结束标签
		: /^<\/([a-z][^\t\r\n\f />]*)/i.exec(context.source)
	//匹配成功后，正则表达式的第一个捕获组的值就是标签名称
	const tag = match[1]
	//消费正则表达式匹配的全部内容，例如'<div'这段内容
	advanceBy(match[0].length)
	//消费标签中无用的空白字符
	advanceSpaces()
	//调用parseAttributes函数完成户型与指令的解析，并得到props数组
	//props数组是由指令节点与属性节点共同组成的数组
	const props = parseAttribute(context)
	//在消费匹配的内容后，如果字符串以'/>'开头，则说明这是一个自闭和标签
	const isSelfClosing = context.source.startsWith('/>')
	//如果是自闭和标签，则消费'/>',否则消费'>'
	advanceBy(isSelfClosing ? 2 : 1)

	//返回标签节点
	return {
		type:'Element',
		//标签名称
		tag,
		//标签的属性暂时留空
		props:[],
		//子节点留空
		children:[],
		//是否自闭和
		isSelfClosing
	}
}

function parseAttributes(context){
	//用来存储解析过程中产生的属性节点和指令节点
	const props = []

	//开启while循环，不带的消耗模板内容，直至遇到标签的结束部分为止
	while(!context.source.startsWith('>') && !context.source.startsWith('/>')){
		//该正则用于匹配属性名称
		const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
		//得到属性名称
		const name = match[0]
		//消费属性名称
		advanceBy(name.length)
		//消费属性名称与等于号之间的空白字符
		advanceSpaces()
		//消费等于号
		advanceBy(1)
		//消费等于号与属性值之间的空白字符
		advanceSpaces()

		//属性值
		let value = ''

		//获取当前模板内容的第一个字符
		const quote = context.source[0]
		//判断属性值是否被引号引用
		const isQuoted = quote === '"' || quote === "'"

		if(isQuoted){
			//属性值被引号引用，消费引号
			advanceBy(1)
			//获取下一个引号的索引
			const endQuoteIndex = context.source.indexOf(quote)
			if(endQuoteIndex > -1){
				//获取下一个引号之前的内容作为属性值
				value = context.source.slice(0,endQuoteIndex)
				//消费属性值
				advanceBy(value.length)
				//消费引号
				advanceBy(1)
			}else{
				//缺少引号错误
				console.error("缺少引号")
			}
		}else{
			//代码运行到这里，说明属性值没有被引号引用
			//下一个空白字符之前的内容全部作为属性值
			const match = /^[^\t\r\n\f >]+/.exec(context.source)
			//获取属性值
			value = match[0]
			//消费属性值
			advanceBy(value.length)
		}
		//消费属性值后面的空白字符
		advanceSpaces()

		//使用属性名称 + 属性值创建一个属性节点，添加到props数组中
		props.push({
			type: 'Attribute',
			name,
			value
		})
	}
	//将解析结果返回
	return props
}