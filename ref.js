//封装一个ref函数
function ref(val){
	//在ref函数内部创建包裹对象
	const wrapper = {
		value:val
	}
	//使用Object.defineProperty在wrapper对象上定义一个不可枚举的属性__v_isRef，并且值为true
	Object.defineProperty(wrapper,'__v_isRef',{
		value:true
	})
	//将包裹对象变成响应式数据
	return reactive(wrapper)
}