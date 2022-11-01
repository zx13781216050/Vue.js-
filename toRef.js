function toRef(obj,key){
	const wrapper = {
		get value(){
			return obj[key]
		},
		//允许设置值
		set value(val){
			obj[key]=val
		}
	}
	//定义__v_isRef属性
	Object.defineProperty(wrapper,'__v_isRef',{
		value:true
	})
	return wrapper
}