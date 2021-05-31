//向页面中注入的js

// 创建一个名为panel的类（仪表板）
class panel {
	// 属性
	title = '';
	defaultValue = '';
	alertNum = 0;
	nowValue = '';
	selector = '';
	valueSelector = '';
	compareValue = '';

	// 构造器
	constructor(title, defaultValue, selector, valueSelector, compareValue) {
		this.title = title;
		this.defaultValue = defaultValue;
		this.selector = selector;
		this.valueSelector = valueSelector;
		this.compareValue = compareValue;
	}

}

// 定义一个空的列表
let panelList = {
	table_panel_container_list: [],
	// singlestat_panel_color_list: [],
	// singlestat_panel_num_list: [],
	// panel_alert_list_list: [],
};

// 触发次数
let alertMaxNum = 1;

// 间隔时间：毫秒
let interval = 10000;

// 语音开关
let voice = true;

// 是否运行
let isRunning = false;

// 私有变量
let _panelHeader = []; //表头
let _panelContent = []; //表内容
let _panelTitle = []; //表标题
let _errorCount = 0; //错误数量



// 事件监听器来处理前端传过来的信息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

	// 选择要执行的代码块
	switch (message.cmd) {
		// 第一个被调用的代码块
		case 'getPanelObjects':
			init();
			break;

		case 'start':
			setContentStatus(message.options); //设置和更新面板数据（这是第二次设置面板的数据，相当于修改初始数据了）
			console.log('开始监视', panelList);
			start(); //开始运行
			break;

		case 'restart':
			setContentStatus(message.options);
			console.log('重启监视', message.options);
			restart();
			break;

		case 'restartFromBackground':
			console.log('后台自动获取图表对象');
			init();
			console.log('后台自动启动监视', panelList);
			start();
			break;

		case 'getContentStatus':
			// 兜底的默认值，什么也不做
			break;

		case 'login':
			console.log('尝试重新登录');
			login(message.tryLoginTimes);
			break;

		default:
			console.log('未知命令', message.cmd);
	}

	// 返回响应
	sendResponse({
		isRunning: isRunning,
		alertMaxNum: alertMaxNum,
		interval: interval,
		voice: voice,
		panelList: panelList,
	});
});

// 初始化函数
function init() {
	_panelHeader = $(".panel-header.grid-drag-handle"); //找到Header元素
	_panelContent = _panelHeader.next(); //找到Header元素的下一个元素，也就是Content元素
	_panelTitle = $(".panel-title-text", _panelHeader); //找到title元素或Header元素
	panelList = {
		table_panel_container_list: [], //table面板内容的list
		// singlestat_panel_color_list: [],
		// singlestat_panel_num_list: [],
		// panel_alert_list_list: [],
	};

	// console.log(_panelHeader);
	// console.log(_panelContent);

	// 识别图表对象
	// setAllPanelAndDefaultColor();

	// 获取这个数组的长度
	let length = _panelHeader.length;

	// 遍历数组
	for (let i = 0; i < length; i++) {
		// 从多个_panelContent中取到其中的一个对象
		let PS = _panelContent[i];

		// 判断这个对象中是否有多个行
		if (PS.innerHTML.indexOf('<div role="row"') > 0) {
			let VS = $("[role='row']:eq(1) [role='cell']:last").css("background-color"); //第一行的颜色
			let ZS = $("[role='row']:eq(-1) [role='cell']:last").css("background-color"); //最后一行的颜色

			// 避免第一条就是红色或者空的情况
			let colorList = VS.match(/(\d)+/g);
			if (VS === undefined || colorList[0] >= 200) {
				VS = '';
			};

			// 颜色比较和识别
			// let compare = function() {
			// 	// 判断颜色不等于空，同时不等于默认值
			// 	if (VS !== undefined && VS !== this.defaultValue) {
			// 		// 调用识别颜色的函数
			// 		return _colorRecognition(VS);
			// 	} else {
			// 		console.log("没有进入到颜色识别里面================================")
			// 	}
			// 	return false;
			// };

			let compare = function() {
				// 判断颜色不等于空，同时不等于默认值
				if (VS !== undefined && VS !== this.defaultValue) {
					// 调用识别颜色的函数
					return _colorRecognition(VS);
				} else {
					console.log("没有进入到颜色识别里面================================")
				}
				return false;
			};

			let this_title = _panelTitle[i].innerHTML;
			let this_defaultValue = ZS;
			let this_selector = PS;
			let this_valueSelector = VS;
			let this_compareValue = compare;

			let this_panel = new panel(this_title, this_defaultValue, this_selector, this_valueSelector,
				this_compareValue);

			panelList.table_panel_container_list.push(this_panel)

			// panelList.table_panel_container_list.push(new panel(_panelTitle[i].innerHTML, //标题
			// 	color, //颜色
			// 	panelSelector, //这是一个对象
			// 	valueSelector, //这是顶行的数值选择器
			// 	compare
			// ));
		} else {
			console.log("无法选取DOM元素");
		}
	}
}

// 如果颜色不相同，则开始对颜色进行识别
function _colorRecognition(color) {
	let colorList = color.match(/(\d)+/g);
	console.log("很顺利，进入到颜色识别里面了================");
	if ((colorList.length > 3) && (colorList[3] === 0)) {
		return false;
	}
	return ((colorList[0] > 50) && (Math.abs(colorList[1] - colorList[2]) < 200));
}


// 初始化各个图表对象
function setAllPanelAndDefaultColor() {
	console.log('开始初始化');

	console.log(length);



	// 控制台打印日志
	console.log({
		isRunning: isRunning,
		alertMaxNum: alertMaxNum,
		interval: interval,
		voice: voice,
		panelList: panelList,
	}, '结束初始化');
}
//=========================
//抓取dom的函数到此结束
//=========================

// 启动监控报警
function start() {
	isRunning = true; //设置为开始状态
	// 定时器：参数一：函数或代码段，参数二：间隔时间interval
	setTimeout(function() {
			// 报警触发函数
			look();
		},
		// 定时器时间间隔
		interval
	);
}



// 报警触发
function look() {
	let alertPanel = []; //一个空的list，用来存放报警面板信息
	for (let key in panelList) {
		try {
			// 这里得到的事一个报警面板的list，然后经过concat方法的合并，最终得到一个更大的list然后赋值给alertPanel
			alertPanel = alertPanel.concat(compare(panelList[key])); //concat方法，合并两个或多个数组，此方法不会更改现有数据，而是返回一个新的数组
		} catch (e) {
			console.log(e, '累计异常次数:' + _errorCount);
			if (_errorCount >= alertMaxNum) {
				chrome.runtime.sendMessage({
					cmd: "alert",
					message: {
						title: '未知异常',
						message: _errorCount,
						voice: voice
					}
				});
				_errorCount = 0;
			} else {
				_errorCount++;
			}
		}
	} //for循环结束

	let length = alertPanel.length; //获取大号的报警面板长度
	let alertCount = 0; //新增变量报警计数0

	for (let i = 0; i < length; i++) {
		alertCount += alertPanel[i].alertNum; //报警计数加等于所有报警面板中积攒的数字
	}

	// 如果报警总计数大于报警分界线
	if (alertCount >= alertMaxNum) {
		console.log('累计告警次数:' + alertCount);
		let title = '';
		for (let i = 0; i < length; i++) {
			alertPanel[i].alertNum = -alertMaxNum * 30;
			title += alertPanel[i].title + '，';
		}

		// panelList.table_panel_container_list.title;

		// 通信
		chrome.runtime.sendMessage({
			cmd: "alert",
			message: {
				title: title,
				message: "测试报警",
				voice: voice
			}
		});
	}

	if (isRunning === true) {
		setTimeout("look()", interval);
	}
}

// 图表对象比对
function compare(panelList) {
	let length = panelList.length; //获取面板集合的长度
	let alertPanel = []; //声明一个空的list，存放报警面板信息

	for (let i = 0; i < length; i++) {
		let panel = panelList[i]; //从list中拿到一个面板
		if (panel === null) { //如果当前面板信息为空
			continue; //则仅终止当前一次循环
		}
		try {
			// 面板的现在值等于panel对象的VS值
			panel.nowValue = panel.valueSelector();

			// 调用panel对象的compareValue()方法，返回值应该是一个布尔
			if (panel.compareValue()) {
				if (panel.alertNum > 0) { //判断报警次数是否大于零
					alertPanel.push(panel); //如果报警次数大于零，就在报警面板的list中追加一个面板对象
				}
				panel.alertNum++; //然后再panel对象的报警次数上+1
				let date = new Date();
				console.log('时间:' + date.toLocaleTimeString() + ' 仪表盘:' + panel.title + ' 值为:' + panel.nowValue +
					' 累计次数:' + panel.alertNum);
			} else {
				// 如果panel对象的compareValue()方法返回的事false，则把报警次数强制修改为0
				panel.alertNum = 0;
			}
		} catch (e) {
			if (panel.alertNum > 0) {
				alertPanel.push(panel);
			}
			panel.alertNum++;
			console.log('数据获取异常：', panel.alertNum, e);
		}
	}
	// 但会一个报警面板的list
	return alertPanel;
}

// 设置各项参数
function setContentStatus(options) {
	alertMaxNum = options.alertMaxNum;
	interval = options.interval;
	voice = options.voice;
	_updatePanelList(options.panelList);
}

// 更新面板数据（单独的面板数据）
function _updatePanelList(newPanelList) {
	for (let key in newPanelList) {
		if (newPanelList.hasOwnProperty(key)) {
			let length = newPanelList[key].length;
			for (let i = 0; i < length; i++) {
				if (newPanelList[key][i] === null) {
					panelList[key][i] = null;
				} else {
					panelList[key][i].defaultValue = newPanelList[key][i];
				}
			}
		}
	}
}



function login(tryLoginTimes) {
	if (2 > tryLoginTimes) {
		$('button', $("input[name='password']").parent().next()).click();
	} else {
		$.post({
			url: "/login",
			async: true,
			data: {
				user: "readonly",
				email: "",
				password: "readonly"
			},
			done: function(data) {
				console.log(data);

			}
		});
	}
	setTimeout(function() {
		location.reload();
	}, 5000);
}


function restart() {
	isRunning = true;
	look();
}
