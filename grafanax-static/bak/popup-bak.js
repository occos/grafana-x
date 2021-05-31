

let panelList = {};
let contentStatus = {};
let backgroundStatus = {};
let dashboardId = 0;
let dashboardUrl = '';

let $message_btn = $('#message_btn');
let $init_btn = $('#init_btn');
let $restart_btn = $('#restart_btn');
let $start_btn = $('#start_btn');

let _getContentStatusFinish = false;
let _getBackgroundStatusFinish = false;
let _waitCount = 0;

// 查询chrome当前标签页的信息
chrome.tabs.query({
	active: true,
	currentWindow: true
}, function(tabs) {
	let reg = /^http:\/\/grafana.iquanwai.work\/d\/.*/;

	if (reg.test(tabs[0].url)) {
		dashboardId = tabs[0].id; //标签页的标识符
		dashboardUrl = tabs[0].url; //标签页中显示的URL
		getContentStatus('getPanelObjects'); //如果连接到指定标签页的过程中发生错误，将不传递参数调用回调函数，并将 runtime.lastError 设置为错误消息。
		getBackgroundStatus(); //获取背景状态
		init();
	} else {
		$init_btn.css('display', 'none');
		$message_btn.html('不是grafana页面').css('display', 'inline-block');
	}
});

// 初始化函数
function init() {
	// 内容状态与背景状态同时就绪
	if (_getBackgroundStatusFinish && _getContentStatusFinish) {
		if (contentStatus.isRunning) {
			$init_btn.css('display', 'none'); //init_btn按钮不显示
			$restart_btn.css('display', 'inline-block'); //init_btn按钮显示为块
			popupWindow();
		} else if (backgroundStatus.daemonSwitch) {
			$init_btn.css('display', 'none');
			let message = '正在尝试重启';
			if (backgroundStatus.dashboardId !== dashboardId) {
				message = '目前只支持单个dashboard';
			}
			$message_btn.html(message).css('display', 'inline-block');
		}
	} else if (_waitCount < 5) {
		console.log('等待次数:', _waitCount++);
		setTimeout(function() {
			init();
		}, 200);
	}
}

// init_btn按钮点击事件
$init_btn.click(function() {
	popupWindow();
	$(this).css('display', 'none');
	$start_btn.css('display', 'inline-block');
});

// start_btn按钮点击事件
$start_btn.click(function() {
	if (dashboardId === 0) {
		console.log('dashboard页面异常');
		return;
	}
	let options = getOptions();
	getContentStatus('start', options);
	getBackgroundStatus('setBackgroundStatus', options);
	$(this).css('display', 'none');
	$restart_btn.css('display', 'inline-block');
});

// restart_btn按钮点击事件
$restart_btn.click(function() {
	let options = getOptions();
	getContentStatus('restart', options);
	getBackgroundStatus('setBackgroundStatus', options);
});

// 获取内容状态
function getContentStatus(cmd = 'getContentStatus', options = {}) {
	console.log(cmd, dashboardId);
	chrome.tabs.sendMessage(dashboardId, {
		cmd: cmd,
		options: options
	}, function(message) {
		contentStatus = message;
		_getContentStatusFinish = true;
		console.log('contentStatus', contentStatus);
	});
}

// 获取背景状态
function getBackgroundStatus(cmd = 'getBackgroundStatus', options = {}) {
	chrome.runtime.sendMessage({
		cmd: cmd,
		options: options
	}, function(message) {
		backgroundStatus = message;
		_getBackgroundStatusFinish = true;
		console.log('backgroundStatus', backgroundStatus);
	});
}

// 弹出窗口
function popupWindow() {
	$('#interval').val(contentStatus.interval);
	$('#limit').val(contentStatus.alertMaxNum);
	$('#voice').attr("checked", contentStatus.voice);
	$('#chandaoSwitch').attr("checked", backgroundStatus.chandaoSwitch);
	$('#daemonSwitch').attr("checked", backgroundStatus.daemonSwitch);

	let tableList = '';
	for (let key in contentStatus.panelList) {
		tableList += _tableContent(contentStatus.panelList[key], key)
	}
	$("body").css("width", "500px");
	$("#tableList").html(tableList);
	$("#form").css('display', 'inline');
}

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

// 获取选项
function getOptions() {
	let options = {};
	options.interval = $('#interval').val(); //获取监视间隔的值
	options.alertMaxNum = $('#limit').val(); //获取报警边界的值
	options.voice = $('#voice').is(':checked'); //获取声音开关的状态（返回布尔类型）
	options.chandaoSwitch = $('#chandaoSwitch').is(':checked'); //获取禅道开关状态（返回布尔类型）
	options.daemonSwitch = $('#daemonSwitch').is(':checked'); //获取后台守护进程的状态（返回布尔类型）
	options.dashboardId = dashboardId; //获取仪表盘ID，默认为空值，在之前的某个函数中会被赋值
	options.dashboardUrl = dashboardUrl; //获取仪表盘URL，默认为空值，在之前的某个函数中会被赋值
	_setPanelListValue(); //执行这个函数，给panelList进行赋值，panelList是一个全局变量，已在上文中声明完成
	options.panelList = panelList; //panelList应该会在之前的某个地方被赋值
	return options;
}

// 给panelList变量进行赋值
function _setPanelListValue() {
	for (let key in panelList) {
		if (panelList.hasOwnProperty(key)) { //判断panelList中是否存在‘key’这个属性
			let length = panelList[key].length; //获取长度
			for (let i = 0; i < length; i++) {
				panelList[key][i] = $("#panel_value_" + key + i).val();
				if ($("#panel_" + key + i).is(':checked') === false) {
					panelList[key][i] = null;
				}
			}
		}
	}
}
