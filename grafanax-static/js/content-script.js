//==========================
// 定义一些全局变量
//==========================
let globalPanelList = {
    monitoring_list: [],
    alertCount: 0,
};


let alertMaxNum = 10; //默认触发次数，后面会被其它函数修改
let interval = 30; //间隔时间30000毫秒，后面会被其它函数修改
let voice = true; //语音开关，后面会被其它函数修改
let isRunning = false; //是否运行，后面会被其它函数修改


//==========================
// 创建一个名为redCell的类
//==========================
class redCell {
    //属性
    oldNumber = 0; //老次数
    newNumber = 0; //新次数
    gapNumber = 0; //老新次数差
    index = [];
    title = '';
    defaultValue = "(200, x, x)";

    //构造器
    constructor() {
    }

    //运算（这里传进来的应该是一个数组）
    operation(listResult) {
        this.oldNumber = this.newNumber //老次数
        this.newNumber = listResult.length //新次数
        this.gapNumber = this.oldNumber - this.newNumber //老新次数差
        this.index = listResult //暂存list结果
    }

    //设置报警信息（这里传进来的应该是一个字符串）
    alertTitle(value) {
        this.title = value
    }

    //累加
    sumArr(arr) {
        return eval(arr.join("+"))
    }
}


//==========================
// 处理通信传过来的信息
//==========================
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

        // 选择要执行的代码块
        switch (message.cmd) {

            case 'getPanelObjects':
                init();
                break;

            case 'start':
                setContentStatus(message.options);
                start();
                break;

            case 'restart':
                setContentStatus(message.options);
                restart();
                break;

            case 'stop':
                setContentStatus(message.options);
                stop();
                break;

            case 'restartFromBackground':
                console.log('后台自动获取图表对象');
                init();
                console.log('后台自动启动监视', globalPanelList);
                start();
                break;

            case 'getContentStatus':
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
            panelList: globalPanelList,
        });
    }
)


//==========================
// 初始化函数
//==========================
function init() {
    let isData = globalPanelList.monitoring_list.length
    if (isData === 0) {
        let _panelHeaderList = $(".panel-header.grid-drag-handle");
        let _panelContentList = _panelHeaderList.next();
        let _panelTitleList = $(".panel-title-text", _panelHeaderList);
        for (let i = 0; i < _panelContentList.length; i++) {
            let _redCellObject = new redCell()
            _redCellObject.alertTitle(_panelTitleList[i].innerHTML)
            globalPanelList.monitoring_list.push(_redCellObject)
        }
        getColor()
    } else {
        console.log("队列非空，不再重新初始化")
    }
}


//==========================
// 获取面板颜色
//==========================
function getColor() {
    let _getPanelHeaderList = $(".panel-header.grid-drag-handle");
    let _getPanelContentList = _getPanelHeaderList.next();
    _getPanelContentList.each(function (_panelIndex) {
        if ($(this).find("div[role='row']").length > 1) {
            let _cellList = $(this).find("div[role='cell']")
            let _onePanelMonitoringList = []
            _cellList.each(function () {
                let _oneCellColor = $(this).css("background-image")
                if (_oneCellColor === "none") {
                } else {
                    if (isMonitoring(_oneCellColor)) {
                        _onePanelMonitoringList.push(1)
                    } else {
                    }
                }
            })
            let _onePanelMonitoringObject = globalPanelList.monitoring_list[_panelIndex]
            _onePanelMonitoringObject.operation(_onePanelMonitoringList)
        } else {
            console.log($(this) + "不是一个Table类型的图表")
        }
    })
}


//==========================
// 判断传入进来的颜色是否能触发报警
//==========================
function isMonitoring(this_color) {
    let _colorSplitList = this_color.match(/(\d)+/g);
    return _colorSplitList[1] >= 200 && _colorSplitList[4] >= 200
}


//==========================
// 启动监控报警
//==========================
function start() {
    isRunning = true;
    setTimeout(
        function () {
            look()
        },
        interval * 1000
    );
}


//==========================
// 重启按钮
//==========================
function restart() {
    isRunning = true;
    look();
}


//==========================
// 停止报警
//==========================
function stop() {
    isRunning = false;
}


//==========================
// 设置各项参数
//==========================
function setContentStatus(options) {
    alertMaxNum = options.alertMaxNum;
    interval = options.interval;
    voice = options.voice;
}


//==========================
// 报警触发
//==========================
function look() {
    getColor()
    let _alertPanelList = [];
    _alertPanelList = _alertPanelList.concat(panelCompare(globalPanelList.monitoring_list));
    if (globalPanelList.alertCount >= alertMaxNum) {
        let title = '';
        let _length = _alertPanelList.length;
        for (let i = 0; i < _length; i++) {
            title += _alertPanelList[i].title + '，';
        }
        console.log("==========人工语音报警被触发==========当前alertCount值为：", globalPanelList.alertCount)
        chrome.runtime.sendMessage({
            cmd: "alert",
            message: {
                title: title,
                message: globalPanelList.alertCount,
                voice: voice
            }
        });
        globalPanelList.monitoring_list = []
        globalPanelList.alertCount = 0
        init()
    }

    if (isRunning === true) {
        setTimeout("look()", interval * 1000);
    }
}


//==========================
// 仪表板比对
//==========================
function panelCompare(monitoring_list) {
    let _length = monitoring_list.length;
    let _alertPanel = [];
    for (let i = 0; i < _length; i++) {
        let _thisPanel = monitoring_list[i];
        if (_thisPanel === null) {
            continue;
        }
        try {
            let date = new Date();
            console.log('时间:' + date.toLocaleTimeString() + ' 仪表盘:' + _thisPanel.title + ' 值为:[' + _thisPanel.index + '] 本轮触发次数:' + _thisPanel.newNumber);
            if (_thisPanel.newNumber > 0) {
                _alertPanel.push(_thisPanel)
                globalPanelList.alertCount += _thisPanel.newNumber;
            } else {
                globalPanelList.alertCount += _thisPanel.oldNumber - _thisPanel.newNumber;
            }
        } catch (e) {
            console.log('数据获取异常，对象信息为：', _thisPanel, e);
        }
    }
    return _alertPanel;
}