// 后台运行的js


let daemonSwitch = false;
let dashboardId = 0;
let dashboardUrl = '';
let tryLoginTimes = 0;

let _isIninting = false;

// 道工时锁
let _tmpTestLock = true;

// 在接收端设置一个runtime.onMessage事件监听器来处理消息（请求，发件人，发送响应）
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// 选区对应的代码块进行执行
	switch (request.cmd) {
		case 'alert':
			console.log('alert:', request.message);
			alert(request.message);
			break;



			// 第一个被触发的是这个代码块
		case 'getBackgroundStatus':
			// _handaoAlert();
			break;

		default:
			console.log('未知命令', request.cmd);
	}

	// 发送响应
	sendResponse({
		daemonSwitch: daemonSwitch, //第一次返回的参数是false
		dashboardId: dashboardId, //第一次返回的编号是0
		dashboardUrl: dashboardUrl, //第一次返回的RUL是空
	})
});


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if (daemonSwitch) {
		if (dashboardUrl === '' || dashboardId === 0) {
			console.log('未初始化dashboard页面信息');
			return;
		}
		if ((changeInfo.status === 'complete') && (dashboardUrl === tab.url) && (dashboardId === tabId)) {
			setTimeoutByRefresh(function() {
				chrome.tabs.sendMessage(dashboardId, {
					cmd: 'restartFromBackground'
				});
			}, '10s后尝试重新初始化插件');
		} else if ((dashboardUrl !== tab.url) && (dashboardId === tabId)) {
			if ('http://grafana.iquanwai.work/login' === tab.url) {
				if (tryLoginTimes < 5) {
					setTimeoutByRefresh(function() {
						chrome.tabs.sendMessage(dashboardId, {
							cmd: 'login',
							tryLoginTimes: tryLoginTimes
						});
						tryLoginTimes++;
						console.log('尝试登录次数:', tryLoginTimes);
					}, '10s后尝试自动登录');
					return;
				}
				setTimeoutByRefresh(function() {
					alert({
						title: '登录信息失效，请重新登录',
						message: '0',
						voice: true,
					});
				}, '登录信息失效，请重新登录');
				return;
			}
			tryLoginTimes = 0;
			setTimeoutByRefresh(function() {
				chrome.tabs.update(tabId, {
					url: dashboardUrl,
				});
			}, '10s后尝试重新跳转页面');
		}
	}
});

chrome.tabs.onRemoved.addListener(function(tabId) {
	if (dashboardId === tabId) {
		if (daemonSwitch) {
			console.log('10s后尝试重新打开dashboard页面');
			setTimeout(function() {
				chrome.tabs.create({
					url: dashboardUrl,
				}, function(tab) {
					dashboardId = tab.id;
				});
			}, 10000);
		} else {

			daemonSwitch = false;
			dashboardId = 0;
			dashboardUrl = '';
			console.log('复原后台参数');
		}
	}
});

function alert(message) {
	chrome.notifications.create(null, {
		type: 'basic',
		iconUrl: 'icon.png',
		title: message.title,
		message: '报警次数：' + message.message
	});

	if (message.voice === true) {
		let audio = document.getElementById("alertMp3");
		audio.volume = 0.5;
		audio.play();
		setTimeout(function() {
			// window.speechSynthesis.cancel();
			let speechLine = new SpeechSynthesisUtterance(message.title);
			speechLine.rate = 0.9;
			window.speechSynthesis.speak(speechLine);
		}, 2000)
	}
}

function setTimeoutByRefresh(func = {}, logMsg = '') {
	if (!_isIninting) {
		console.log(logMsg);
		setTimeout(function() {
			func();
			_isIninting = false;
		}, 10000);
		_isIninting = true;
	}
}

function clock() {
	let nowHour = (new Date()).getHours();
	let nowMinute = (new Date()).getMinutes();
	if (_tmpTestLock && (nowHour === 18) && (nowMinute >= 10)) {
		_tmpTestAlert();
		_tmpTestLock = false;
	} else if (nowHour !== 18) {
		_tmpTestLock = true;
	}
	setTimeout(function() {
		clock();
	}, 1000 * 60 * 10);
}

function _handaoAlert() {
	let speechLine = new SpeechSynthesisUtterance("运维自动化报警");
	speechLine.rate = 0.9;
	speechLine.volume = 1;
	window.speechSynthesis.speak(speechLine);
	speechLine.text = "接口延时异常";
	speechLine.rate = 0.9;
	speechLine.volume = 1;
	window.speechSynthesis.speak(speechLine);
}
