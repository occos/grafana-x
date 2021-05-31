let panelList = {
    table_panel_container_list: [],
    singlestat_panel_color_list: [],
    singlestat_panel_num_list: [],
    panel_alert_list_list: [],
};

let alertMaxNum = 7;
let interval = 10000;
let voice = true;
let isRunning = false;

let _panelHeader = [];
let _panelContent = [];
let _panelTitle = [];
let _errorCount = 0;

class panel {
    title = '';
    defaultValue = '';
    alertNum = 0;
    nowValue = '';
    selector = '';
    valueSelector = '';
    compareValue = '';

    constructor(title, defaultValue, selector, valueSelector, compareValue) {
        this.title = title;
        this.defaultValue = defaultValue;
        this.selector = selector;
        this.valueSelector = valueSelector;
        this.compareValue = compareValue;
    }

}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.cmd) {
        case 'getPanelObjects':
            console.log('获取图表对象');
            init();
            break;
        case 'start':
            setContentStatus(message.options);
            console.log('开始监视', panelList);
            start();
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
            console.log('getContentStatus', {
                isRunning: isRunning,
                alertMaxNum: alertMaxNum,
                interval: interval,
                voice: voice,
                panelList: panelList,
            });
            break;
        case 'login':
            console.log('尝试重新登录');
            login(message.tryLoginTimes);
            break;
        default:
            console.log('未知命令', message.cmd);
    }

    sendResponse({
        isRunning: isRunning,
        alertMaxNum: alertMaxNum,
        interval: interval,
        voice: voice,
        panelList: panelList,
    });
});

function init() {
    _panelHeader = $(".panel-header.grid-drag-handle");
    _panelContent = _panelHeader.next();
    _panelTitle = $(".panel-title-text", _panelHeader);
    panelList = {
        table_panel_container_list: [],
        singlestat_panel_color_list: [],
        singlestat_panel_num_list: [],
        panel_alert_list_list: [],
    };

    setAllPanelAndDefaultColor();
}

function start() {
    isRunning = true;
    setTimeout(function () {
        look();
    }, interval);
}

function restart() {
    isRunning = true;
    look();
}

// 初始化各个图表对象
function setAllPanelAndDefaultColor() {
    console.log('开始初始化');
	// 获取这个数组的长度
    let length = _panelHeader.length;
	// 遍历数组
    for (let i = 0; i < length; i++) {
		// 返回一个对象
        let panelSelector = function () {
            return _panelContent[i];
        };
        // if (panelSelector().innerHTML.indexOf('<div class="table-panel-container">') > 0) {
        if (panelSelector().innerHTML.indexOf('<div class="panel-container panel-container--absolute">') > 0) {
            let valueSelector = function () {
                return $("tbody tr:first", panelSelector()).css("background-color");
            };
            let color = $("tbody tr:last", panelSelector()).css("background-color");
            // 避免第一条就是红色或者空的情况
            if (color === undefined || 'rgba(245, 54, 54, 0.9)' === color) {
                color = '';
            }

            let compare = function () {
                let color = this.valueSelector();
                if ((color !== undefined) && color !== this.defaultValue) {
                    return _colorRecognition(color);
                }
                return false;
            };

            panelList.table_panel_container_list.push(new panel(_panelTitle[i].innerHTML, color, panelSelector, valueSelector, compare));
        } else if (panelSelector().innerHTML.indexOf('<div class="singlestat-panel">') > 0) {
            // 颜色类型
            let valueSelector = function () {
                return $(".singlestat-panel-value-container span span", panelSelector()).css("color");
            };
            let color = valueSelector();

            if ((valueSelector() === undefined) && ($(".singlestat-panel-value-container span", panelSelector()).html() !== "N/A")) {
                // 数值类型
                let numSpanSelector = $("#flotGagueThresholdValue0_1", panelSelector())[0];
                if (numSpanSelector === undefined) {
                    continue;
                }
                let num = numSpanSelector.innerHTML;
                let numSelector = function () {
                    return $("#flotGagueValue0", panelSelector())[0].innerHTML;
                };
                let compare = function () {
                    let num = (this.valueSelector()).match(/(\d)+/);
                    if (num !== null) {
                        let nowValue = num[0];
                        return ((nowValue - this.defaultValue) > 0);
                    }
                    return false;
                };
                panelList.singlestat_panel_num_list.push(new panel(_panelTitle[i].innerHTML, num, panelSelector, numSelector, compare));
            } else {
                let compare = function () {
                    let color = this.valueSelector();
                    if ((color !== undefined) && (color !== this.defaultValue)) {
                        return _colorRecognition(color);
                    }
                    return false;
                };
                panelList.singlestat_panel_color_list.push(new panel(_panelTitle[i].innerHTML, color, panelSelector, valueSelector, compare));
            }
        } else if (panelSelector().innerHTML.indexOf('<ol class="alert-rule-list">') > 0) {
            let valueSelector = function () {
                let alertList = $("li", panelSelector());
                for (let i = 0; i < alertList.length; i++) {
                    if ($(".alert-state-critical", alertList[i]).length > 0) {
                        this.title = $("a", alertList[i])[0].innerText;
                        return this.title;
                    }
                }
                return false;
            };
            let color = '';
            let compare = function () {
                return this.valueSelector();
            };
            panelList.panel_alert_list_list.push(new panel(_panelTitle[i].innerHTML, color, panelSelector, valueSelector, compare));
        }
    }
    console.log({
        isRunning: isRunning,
        alertMaxNum: alertMaxNum,
        interval: interval,
        voice: voice,
        panelList: panelList,
    }, '结束初始化');
}

// 监控
function look() {
    let alertPanel = [];
    for (let key in panelList) {
        try {
            alertPanel = alertPanel.concat(compare(panelList[key]));
        } catch (e) {
            console.log(e, '累计异常次数:' + _errorCount);
            if (_errorCount >= alertMaxNum) {
                chrome.runtime.sendMessage({
                    cmd: "alert",
                    message: {title: '未知异常', message: _errorCount, voice: voice}
                });
                _errorCount = 0;
            } else {
                _errorCount++;
            }
        }
    }
    let length = alertPanel.length;
    let alertCount = 0;

    for (let i = 0; i < length; i++) {
        alertCount += alertPanel[i].alertNum;
    }
    if (alertCount >= alertMaxNum) {
        console.log('累计告警次数:' + alertCount);
        let title = '';
        for (let i = 0; i < length; i++) {
            alertPanel[i].alertNum = -alertMaxNum * 30;
            title += alertPanel[i].title + '，';
        }
        chrome.runtime.sendMessage({cmd: "alert", message: {title: title, message: alertCount, voice: voice}});
    }

    if (isRunning === true) {
        setTimeout("look()", interval);
    }
}

// 图表对象比对
function compare(panelList) {
    let length = panelList.length;
    let alertPanel = [];

    for (let i = 0; i < length; i++) {
        let panel = panelList[i];
        if (panel === null) {
            continue;
        }
        try {
            panel.nowValue = panel.valueSelector();
            if (panel.compareValue()) {
                if (panel.alertNum > 0) {
                    alertPanel.push(panel);
                }
                panel.alertNum++;
                let date = new Date();
                console.log('时间:' + date.toLocaleTimeString() + ' 仪表盘:' + panel.title + ' 值为:' + panel.nowValue + ' 累计次数:' + panel.alertNum);
            } else {
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
    return alertPanel;
}

// 设置各项参数
function setContentStatus(options) {
    alertMaxNum = options.alertMaxNum;
    interval = options.interval;
    voice = options.voice;
    _updatePanelList(options.panelList);
}

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

function _colorRecognition(color) {
    let colorList = color.match(/(\d)+/g);
    if ((colorList.length > 3) && (colorList[3] === 0)) {
        return false;
    }
    return ((colorList[0] > 200) && (Math.abs(colorList[1] - colorList[2]) < 50));
}

function login(tryLoginTimes) {
    if (2 > tryLoginTimes) {
        $('button', $("input[name='password']").parent().next()).click();
    } else {
        $.post({
            url: "/login",
            async: true,
            data: {user: "readonly", email: "", password: "readonly"},
            done: function (data) {
                console.log(data);

            }
        });
    }
    setTimeout(function () {
        location.reload();
    }, 5000);
}