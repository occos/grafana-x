let panelList = {};
let contentStatus = {};
let backgroundStatus = {};
let dashboardId = 0;
let dashboardUrl = '';

let $message_btn = $('#message_btn');
let $init_btn = $('#init_btn');
let $restart_btn = $('#restart_btn');
let $start_btn = $('#start_btn');

// 获取内容状态完成的变量
let _getContentStatusFinish = false;
let _getBackgroundStatusFinish = false;
let _waitCount = 0;


// 通信
chrome.tabs.query({
	active: true,
	currentWindow: true
}, function(tabs) {
	let reg = /^http:\/\/grafana.iquanwai.work\/d\/.*/;

	// if (reg.test(tabs[0].url)) {
	if (true) {
		dashboardId = tabs[0].id; //106
		dashboardUrl = tabs[0].url; //"http://grafana.iquanwai.work/d/4y_eIZeMz/testmian-ban?orgId=1"

		// console.log(tabs);
		// console.log(tabs[0]);
		// console.log("123");

		// 卡在这一步
		getContentStatus('getPanelObjects');

		// 还没到这一步
		getBackgroundStatus();
		init();
	} else {
		$init_btn.css('display', 'none');
		$message_btn.html('不是grafana页面').css('display', 'inline-block');
	}
});



// 获取内容状态----getPanelObjects
function getContentStatus(cmd = 'getContentStatus', options = {}) {
	// 这里打印出来的是标签ID
	// console.log(cmd, dashboardId);
	// 向指定标签页中的内容脚本发送一个消息，当发回响应时执行一个可选的回调函数。当前扩展程序在指定标签页中的每一个内容脚本都会收到 runtime.onMessage 事件。
	// tabID、any message、funciton
	chrome.tabs.sendMessage(dashboardId, {
		cmd: cmd,
		options: options
	}, function(message) {
		// 在向content-script中完成通讯后得到的返回值，赋值给contentStatus，此时isRuning应该=false
		contentStatus = message;
		_getContentStatusFinish = true;
		console.log('contentStatus', contentStatus);
	});
}

// 获取后台状态
function getBackgroundStatus(cmd = 'getBackgroundStatus', options = {}) {
	// 向扩展程序发送一个简单的消息，并可选的获得一个回应
	chrome.runtime.sendMessage({
		cmd: cmd,
		options: options
	}, function(message) {
		backgroundStatus = message;
		_getBackgroundStatusFinish = true;
		console.log('backgroundStatus', backgroundStatus);
	});
}

// 初始化函数
function init() {
	// 这两个变量在getContentStatus()与getBackgroundStatus()函数中会被改写为true；
	if (_getBackgroundStatusFinish && _getContentStatusFinish) {
		if (contentStatus.isRunning) {
			$init_btn.css('display', 'none');
			$restart_btn.css('display', 'inline-block');
			popupWindow();
		} else if (backgroundStatus.daemonSwitch) {
			$init_btn.css('display', 'none');
			let message = '正在尝试重启';
			if (backgroundStatus.dashboardId !== dashboardId) {
				message = '目前只支持单个dashboard';
			}
			$message_btn.html(message).css('display', 'inline-block');
		} else {
			console.log("如果守护进程也没开，就什么都不做");
		}
	} else if (_waitCount < 5) {
		console.log('等待次数:', _waitCount++);
		setTimeout(function() {
			init();
		}, 200);
	}
}

// 点击初始化监控
$init_btn.click(function() {
	popupWindow();
	$(this).css('display', 'none'); //初始化监控按钮隐藏
	$start_btn.css('display', 'inline-block'); //开始运行按钮显示为块
});

// 弹出窗口（显示运行之前的设置面板）
function popupWindow() {
	$('#interval').val(contentStatus.interval); //默认值是10000毫秒，直接设置到DOM中
	$('#limit').val(contentStatus.alertMaxNum); //触发次数，默认值是1，写入到报警触发边界中
	$('#voice').attr("checked", contentStatus.voice); //语音开关是true，直接设置到DOM中
	// $('#chandaoSwitch').attr("checked", backgroundStatus.chandaoSwitch);
	$('#daemonSwitch').attr("checked", backgroundStatus.daemonSwitch); //守护进程开关默认是false，直接设置到DOM中

	let tableList = '';
	console.log("444--------------------------");
	console.log(contentStatus.panelList);
	for (let key in contentStatus.panelList) { //内容状态中给出的返回值里包含panelList
		console.log(key);
		tableList += _tableContent(contentStatus.panelList[key], key);
	}
	$("body").css("width", "500px");
	$("#tableList").html(tableList);
	$("#form").css('display', 'inline');
}
// 弹出窗口运行，到此结束，剩下的动作就需要其它按钮来触发了


// 形成表格
function _tableContent(panelList, type) {
	let length = panelList.length;
	let table = `<table id="#` + type + `" class="table table-striped">
        <thead>
        <tr>
            <th scope="col">#</th>
            <th scope="col">title</th>
            <th scope="col">value</th>
        </tr>
        </thead>
        <tbody id="panel_info_` + type + `">`;
	for (let i = 0; i < length; i++) {
		if (panelList[i] === null) {
			continue;
		}
		table += _trContent(i, panelList[i].title, panelList[i].defaultValue, type);
	}
	table += `</tbody></table>`;

	return table;
}

// 形成表格
function _trContent(tableNum, title, value, type) {
	return `<tr>
            <td>
                <input type="checkbox" id="panel_` + type + tableNum + `" checked>
            </td>
            <td>` + title + `</td>
            <td>
                <input type="text" class="form-control" value="` + value + `" id="panel_value_` + type + tableNum + `">
            </td>
        </tr>`;
}

// ========================================================
// ========================================================
// ========================================================


// 确认并开始监控
$start_btn.click(function() {
	// ID异常时，强制终止运行
	if (dashboardId === 0) {
		console.log('dashboard页面异常');
		return;
	}
	let options = getOptions(); //得到一个字典对象
	getContentStatus('start', options); //发起一个后端通讯，这一次携带的参数不一样
	getBackgroundStatus('setBackgroundStatus', options);
	$(this).css('display', 'none');
	$restart_btn.css('display', 'inline-block');
});

$restart_btn.click(function() {
	let options = getOptions();
	getContentStatus('restart', options);
	getBackgroundStatus('setBackgroundStatus', options);
});




// 获取运行参数，这些参数都是之前各个环境中拼接好的，直接获取即可
function getOptions() {
	let options = {}; //声明一个空的字典
	options.interval = $('#interval').val(); //间隔时间
	options.alertMaxNum = $('#limit').val(); //触发边界
	options.voice = $('#voice').is(':checked'); //语音开关
	// options.chandaoSwitch = $('#chandaoSwitch').is(':checked');
	options.daemonSwitch = $('#daemonSwitch').is(':checked'); //后台开关
	options.dashboardId = dashboardId; //仪表盘ID
	options.dashboardUrl = dashboardUrl; //仪表盘URL
	_setPanelListValue(); 
	options.panelList = panelList; //面板集合
	return options; //返回一个字典对象
}

// 面板详情数据（list数据）
function _setPanelListValue() {
	for (let key in panelList) { //遍历面板集合
		if (panelList.hasOwnProperty(key)) { //判断面板集合中是否有指定的键
			let length = panelList[key].length; //获取单个面板的长度
			for (let i = 0; i < length; i++) { //遍历面板的子集对象
				panelList[key][i] = $("#panel_value_" + key + i).val(); //给文本框里赋值
				if ($("#panel_" + key + i).is(':checked') === false) {
					panelList[key][i] = null;
				}
			}
		}
	}
}
