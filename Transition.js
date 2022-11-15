const Transition = {
	name:'Transition',
	setup(props,{slots}){
		return () =>{
			//通过默认插槽获取需要过渡的元素
			const innerVNode = slots.default()

			//在过渡元素的VNode对象上添加transition相应的钩子函数
			innerVNode.transition = {
				beforeEnter(el){
					//设置初始状态：添加enter-form和enter-active类
					el.classList.add('enter-form')
					el.classList.add('enter-active')
				},
				enter(el){
					//在下一帧切换到技术状态
					nextFrame(()=>{
						//移除enter-form类，添加enter-to类
						el.classList.remove('enter-form')
						el.classList.add('enter-to')
						//监听transitionend事件完成收尾工作
						el.addEventListener('transitionend',()=>{
							el.classList.remove('enter-to')
							el.classList.remove('enter-active')
						})
					})
				},
				leave(el,performRemove){
					//设置离场过渡的初始状态：添加leave-form和leave-active类
					el.classList.add('leave-form')
					el.classList.add('leave-active')
					//强制reflow，使得初始状态生效
					document.body.offsetHeight
					//在下一帧修改状态
					nextFrame(()=>{
						//移除enter-form类，添加enter-to类
						el.classList.remove('leave-form')
						el.classList.add('leave-to')
						//监听transitionend事件完成收尾工作
						el.addEventListener('transitionend',()=>{
							el.classList.remove('leave-to')
							el.classList.remove('leave-active')
							//调用transition.leave钩子函数的第二个参数，完成DOM元素的卸载
							performRemove()
						})
					})
				}
			}
			//渲染需要过渡的元素
			return innerVNode
		}
	}
}