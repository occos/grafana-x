//==========================
// 定义一些全局变量
//==========================
let globalPanelObjectList = []
let globalSettings = {
    interval: 10, //采集及报警间隔默认值
    monitoringColor: 230, //报警色数值默认值
    isRunning: true, //运行状态默认值
}


//==========================
// 创建一个名为redCell的类
//==========================
class redCell {
    tabMetadata = {} //标签页的元数据信息
    cellColorList = [] //单元格的颜色集合
    cellAlertList = [] //单元格的报警集合
    alertTitle = ""  //面板的标题
    alertTime = "" //报警的时间

    constructor() {
        //构造器，此处不做任何构造处理
    }

    setTabMetadata(_tabMetadata) {
        this.tabMetadata = _tabMetadata
    }

    setAlertTime(alertTime) {
        this.alertTime = alertTime
    }

    setAlertTitle(alertText) {
        this.alertTitle = alertText
    }

    setCellColorList(cellColorList) {
        this.cellColorList = cellColorList
    }

    setCellAlertList(cellAlertList) {
        this.cellAlertList = cellAlertList
    }


}


//==========================
// 向background发起通信
//==========================
chrome.runtime.sendMessage({cmd: "getTabMetadata"});


//==========================
// 监听来自于popup与background的通信请求
//==========================
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.cmd) {
        case "initPage":
            let _pageStatus = message.metadata.tabStatus
            if (_pageStatus === "complete") {
                init()
                getThisTabMetadata(message.metadata)
                setInterval(function () {
                    getColor()
                    runMonitoring()
                    // console.log(globalPanelObjectList)
                    console.log("当前报警间隔：" + globalSettings.interval + "秒")
                }, globalSettings.interval * 1000)
            } else {
                chrome.runtime.sendMessage({cmd: "getTabMetadata"})
            }
            break;
        default:
            console.log('未知命令', message.cmd);
    }
    sendResponse({
        status: "ok"
    })
})


//==========================
// 通过redCell类初始化出指定数量的对象
//==========================
function init() {
    let _getPanelHeaderList = $(".panel-header.grid-drag-handle");
    let _getPanelContentList = _getPanelHeaderList.next();
    let _getPanelTitleList = $(".panel-title-text", _getPanelHeaderList);
    for (let i = 0; i < _getPanelContentList.length; i++) {
        let _redCellObject = new redCell()
        _redCellObject.setAlertTitle(_getPanelTitleList[i].innerHTML)
        globalPanelObjectList.push(_redCellObject)
    }
}


//==========================
// 获取标签页的元数据
//==========================
function getThisTabMetadata(_tabMetadata) {
    for (let i = 0; i < globalPanelObjectList.length; i++) {
        let _panelObject = globalPanelObjectList[i]
        _panelObject.setTabMetadata(_tabMetadata)
    }
    console.log("标签页的元数据信息打印：", globalPanelObjectList)
}


//==========================
// 获取面板颜色
//==========================
function getColor() {
    let _getPanelHeaderList = $(".panel-header.grid-drag-handle");
    let _getPanelContentList = _getPanelHeaderList.next();
    //遍历所有面板对象，并逐一获取当前对象的属性
    _getPanelContentList.each(function (_panelIndex) {
        //判断当前对象是否是table类型的面板（根据是否包含row来判断）
        if ($(this).find("div[role='row']").length > 1) {
            //获取当前面板内所有的单元格，这是一个list
            let _cellList = $(this).find("div[role='cell']")
            //声明一个的空的list，便于下文填充内容
            let _onePanelColorList = []
            //遍历所有的单元格，并逐一获取当前对象的颜色
            _cellList.each(function () {
                //获取对象的渐变色
                let _oneCellColor = $(this).css("background-image")
                if (_oneCellColor === "none") {
                    //如果颜色为空则什么也不做
                } else {
                    //如果颜色不为空，则解析好后，一股脑全都添加到临时list中
                    let _colorSplitList = _oneCellColor.match(/(\d)+/g);
                    _onePanelColorList.push(_colorSplitList)
                }
            })
            let _onePanelObject = globalPanelObjectList[_panelIndex]
            _onePanelObject.setCellColorList(_onePanelColorList)
        } else {
            console.log($(this) + "不是一个Table类型的图表")
        }
    })
}


//==========================
// 实时读取全局配置，每一次都是新的读取（全局监控设置、全局报警设置）
//==========================
function getGlobalSetting() {
    //获取全局监控配置（每一次都实时获取）
    chrome.runtime.sendMessage({cmd: "getGlobalMonitoringSetting"}, function (result) {

    });
    //获取全局报警配置（每一次都实时获取）
    chrome.runtime.sendMessage({cmd: "getGlobalAlertSetting"}, function (result) {

    });
}


//==========================
// 运行监控模块
//==========================
function runMonitoring() {
    //判断全局运行状态，默认为True
    if (globalSettings.isRunning) {
        for (let i = 0; i < globalPanelObjectList.length; i++) {
            let _panelObject = globalPanelObjectList[i]
            if (lookColor(_panelObject)) {
                //此处触发报警，需要向后端推送信息
                console.log("触发报警：", _panelObject)
            } else {
                //此处没有触发报警，什么也不做
                console.log("没有触发报警：", _panelObject)
            }
        }
    } else {
        //停止监控模块的运转
    }
}


//==========================
// 判断颜色是否触发报警
//==========================
function lookColor(_panelObject) {
    //报警表
    let mList = []
    //报警色
    let mColor = globalSettings.monitoringColor
    //单元格颜色list
    let _thisCellColorList = _panelObject.cellColorList
    //遍历单元格颜色的list
    for (let i = 0; i < _thisCellColorList.length; i++) {
        let _thisCellColor = _thisCellColorList[i]
        //如果当前单元格的颜色大于报警色
        if (_thisCellColor[1] >= mColor && _thisCellColor[4] >= mColor) {
            //则往报警表里追加一个元素
            mList.push(1)
        }
    }
    //如果报警表不为空
    if (mList.length >= 1) {
        //则为当前对象赋值，并返回true
        _panelObject.setCellAlertList(mList)
        _panelObject.setAlertTime(new Date().getTime())
        return true
    } else {
        return false
    }
}

//==========================
// 接下来该写向后端的推送信息推送模块了
//==========================

