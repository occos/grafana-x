//==========================
// 定义一些全局变量
//==========================
let globalPanelObjectList = []


//==========================
// 创建一个名为redCell的类
//==========================
class redCell {
    tabMetadata = {}
    alertList = []
    alertTitle = ""
    alertTime = ""

    constructor() {
        //构造器，此处不做任何构造处理
    }

    setAlertTitle(alertText) {
        this.alertTitle = alertText
    }

    setMetadata(_tabMetadata) {
        this.tabMetadata = _tabMetadata
    }

    setAlertList(alertList) {
        this.alertList = alertList
    }

    setAlertTime(alertTime) {
        this.alertTime = alertTime
    }
}


//==========================
// 向background发起通信
//==========================
chrome.runtime.sendMessage({cmd: "getTabsMetadata"});


//==========================
// 监听来自于popup与background的通信请求
//==========================
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.cmd) {
        case "getMetadata":
            let _pageStatus = message.metadata.tabStatus
            if (_pageStatus === "complete") {
                init()
                getMetadata(message.metadata)
            } else {
                chrome.runtime.sendMessage({cmd: "getTabsMetadata"})
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
function getMetadata(_tabMetadata) {
    for (let i = 0; i < globalPanelObjectList.length; i++) {
        let _panelObject = globalPanelObjectList[i]
        _panelObject.setMetadata(_tabMetadata)
    }
    console.log(globalPanelObjectList)
}

