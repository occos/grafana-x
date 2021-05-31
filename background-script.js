let chandaoSwitch = false;
let daemonSwitch = false;
let dashboardId = 0;
let dashboardUrl = '';
let tryLoginTimes = 0;

let _isIninting = false;
// 蝉道工时锁
let _chandaoLock = true;


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.cmd) {
        case 'alert':
            console.log('alert:', request.message);
            alert(request.message);
            break;
        case 'setBackgroundStatus':
            console.log('setBackgroundStatus:', request.options);
            chandaoSwitch = request.options.chandaoSwitch;
            daemonSwitch = request.options.daemonSwitch;
            dashboardId = request.options.dashboardId;
            dashboardUrl = request.options.dashboardUrl;
            if (chandaoSwitch) {
                clock();
            }
            break;
        case 'getBackgroundStatus':
            console.log('getBackgroundStatus:', {
                daemonSwitch: daemonSwitch,
                chandaoSwitch: chandaoSwitch,
                dashboardId: dashboardId,
                dashboardUrl: dashboardUrl,
            });
            break;
        default:
            console.log('未知命令', request.cmd);
    }

    sendResponse({
        daemonSwitch: daemonSwitch,
        chandaoSwitch: chandaoSwitch,
        dashboardId: dashboardId,
        dashboardUrl: dashboardUrl,
    })
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (daemonSwitch) {
        if (dashboardUrl === '' || dashboardId === 0) {
            console.log('未初始化dashboard页面信息');
            return;
        }
        if ((changeInfo.status === 'complete') && (dashboardUrl === tab.url) && (dashboardId === tabId)) {
            setTimeoutByRefresh(function () {
                chrome.tabs.sendMessage(dashboardId, {cmd: 'restartFromBackground'});
            }, '10s后尝试重新初始化插件');
        } else if ((dashboardUrl !== tab.url) && (dashboardId === tabId)) {
            if ('http://grafana.iquanwai.work/login' === tab.url) {
                if (tryLoginTimes < 5) {
                    setTimeoutByRefresh(function () {
                        chrome.tabs.sendMessage(dashboardId, {cmd: 'login', tryLoginTimes: tryLoginTimes});
                        tryLoginTimes++;
                        console.log('尝试登录次数:', tryLoginTimes);
                    }, '10s后尝试自动登录');
                    return;
                }
                setTimeoutByRefresh(function () {
                    alert({
                        title: '登录信息失效，请重新登录',
                        message: '0',
                        voice: true,
                    });
                }, '登录信息失效，请重新登录');
                return;
            }
            tryLoginTimes = 0;
            setTimeoutByRefresh(function () {
                chrome.tabs.update(tabId, {
                    url: dashboardUrl,
                });
            }, '10s后尝试重新跳转页面');
        }
    }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
    if (dashboardId === tabId) {
        if (daemonSwitch) {
            console.log('10s后尝试重新打开dashboard页面');
            setTimeout(function () {
                chrome.tabs.create({
                    url: dashboardUrl,
                }, function (tab) {
                    dashboardId = tab.id;
                });
            }, 10000);
        } else {
            chandaoSwitch = false;
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
        setTimeout(function () {
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
        setTimeout(function () {
            func();
            _isIninting = false;
        }, 10000);
        _isIninting = true;
    }
}

function clock() {
    if (!chandaoSwitch) {
        console.log('蝉道提醒为关闭状态');
        return;
    }
    let nowHour = (new Date()).getHours();
    let nowMinute = (new Date()).getMinutes();
    if (_chandaoLock && (nowHour === 18) && (nowMinute >= 10)) {
        _chandaoAlert();
        _chandaoLock = false;
    } else if (nowHour !== 18) {
        _chandaoLock = true;
    }
    setTimeout(function () {
        clock();
    }, 1000 * 60 * 10);
}

function _chandaoAlert() {
    let speechLine = new SpeechSynthesisUtterance("欧拉欧拉欧拉欧拉欧拉欧拉欧辣");
    speechLine.rate = 3.5;
    speechLine.volume = 0.5;
    window.speechSynthesis.speak(speechLine);
    speechLine.text = "谷歌娘温馨提示您要填工时啦";
    speechLine.rate = 0.9;
    speechLine.volume = 1;
    window.speechSynthesis.speak(speechLine);
}
