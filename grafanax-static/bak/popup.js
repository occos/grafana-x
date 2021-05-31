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



chrome.tabs.query({
	active: true,
	currentWindow: true
}, function(tabs) {
	let reg = /^http:\/\/grafana.iquanwai.work\/d\/.*/;
	// let reg = /^http:\/\/.;
	// let reg = "*";

	// 判断reg中是否包含tabs[0].url的字符串
	// if (reg.test(tabs[0].url)) {
	if (true) {
		dashboardId = tabs[0].id; //106
		dashboardUrl = tabs[0].url; //"http://grafana.iquanwai.work/d/4y_eIZeMz/testmian-ban?orgId=1"

		// console.log(tabs);
		// console.log(tabs[0]);
		// console.log("123");

		getContentStatus('getPanelObjects');
		getBackgroundStatus();
		init();
	} else {
		$init_btn.css('display', 'none');
		$message_btn.html('不是grafana页面').css('display', 'inline-block');
	}
});



// 获取内容状态
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

// 获取背景色的状态
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
		}
	} else if (_waitCount < 5) {
		console.log('等待次数:', _waitCount++);
		setTimeout(function() {
			init();
		}, 200);
	}
}

// 单击事件
$init_btn.click(function() {
	popupWindow();
	$(this).css('display', 'none');
	$start_btn.css('display', 'inline-block');
});

// ========================================================
// ========================================================
// ========================================================



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

$restart_btn.click(function() {
	let options = getOptions();
	getContentStatus('restart', options);
	getBackgroundStatus('setBackgroundStatus', options);
});


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

function getOptions() {
	let options = {};
	options.interval = $('#interval').val();
	options.alertMaxNum = $('#limit').val();
	options.voice = $('#voice').is(':checked');
	options.chandaoSwitch = $('#chandaoSwitch').is(':checked');
	options.daemonSwitch = $('#daemonSwitch').is(':checked');
	options.dashboardId = dashboardId;
	options.dashboardUrl = dashboardUrl;
	_setPanelListValue();
	options.panelList = panelList;
	return options;
}

function _setPanelListValue() {
	for (let key in panelList) {
		if (panelList.hasOwnProperty(key)) {
			let length = panelList[key].length;
			for (let i = 0; i < length; i++) {
				panelList[key][i] = $("#panel_value_" + key + i).val();
				if ($("#panel_" + key + i).is(':checked') === false) {
					panelList[key][i] = null;
				}
			}
		}
	}
}
