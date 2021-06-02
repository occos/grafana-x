// 定义一个空的列表
let globalPanelList = {
    table_panel_container_list: [],
};

let alertMaxNum = 7; // 触发次数
let interval = 10000; // 间隔时间：毫秒
let voice = true; // 语音开关
let isRunning = false; // 是否运行


// ==========================
// 创建一个名为panel的类
// ==========================
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

// 事件监听器来处理前端传过来的信息
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

    // 选择要执行的代码块
    switch (message.cmd) {

        case 'getPanelObjects':
            init();
            break;

        case 'start':
            setContentStatus(message.options); //设置和更新面板数据（这是第二次设置面板的数据，相当于修改初始数据了）
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
        isRunning: isRunning, //第一次返回的时候依然还是false
        alertMaxNum: alertMaxNum, //第一返回的时候出发次数是7
        interval: interval, //第一次返回的时候，时间是10000
        voice: voice, //第一次返回的时候，结果是true
        panelList: globalPanelList, //第一次返回的时候，是一个panelList.table_panel_container_list里装满new_panel对象的结果集
    });
});

// 初始化函数
function init() {
    let isData = globalPanelList.table_panel_container_list.length;
    if (isData === 0) {
        let _panelHeaderList = $(".panel-header.grid-drag-handle"); //找到拥有这个类选择器的所有元素，结果是一个list
        let _panelContentList = _panelHeaderList.next(); //找到这些Header元素的下一个元素，也就是Content元素，结果也是一个list类型
        let _panelTitleList = $(".panel-title-text", _panelHeaderList); //找到Header元素汇总的title元素


        // 获取这个数组的长度
        let length = _panelHeaderList.length;

        // 遍历数组
        for (let i = 0; i < length; i++) {
            // 从多个_panelContent中取到其中的一个对象
            let _onePanelContent = _panelContentList[i];

            let _firstBackgroundColor = 'notRed'; //行首背景色
            let _lastBackgroundColor = 'notRed'; //行末背景色
            let _compareResult = false;

            // 判断这个对象中是否有多个行
            if (_onePanelContent.innerHTML.indexOf('<div role="row"') > 0) {
                // let _firstCellColor = $("[role='row']:eq(1) [role='cell']:last").css("background-color"); //第一行的cell颜色，且只找到table类型的图表
                // let _lastCellColor = $("[role='row']:eq(-1) [role='cell']:last").css("background-color"); //最后一行的cell颜色，且只知道table类型的图表

                let _firstCellColor = $("[role='row']:eq(1) [role='cell']:last").css("background-image"); //第一行的cell颜色，且只找到table类型的图表
                let _lastCellColor = $("[role='row']:eq(-1) [role='cell']:last").css("background-image"); //最后一行的cell颜色，且只知道table类型的图表


                // 靠前格子的颜色
                let _colorFirstList = _firstCellColor.match(/(\d)+/g);
                if (_colorFirstList[1] >= 200 && _colorFirstList[4] >= 200) {
                    _firstBackgroundColor = 'red';
                } else {
                    _firstBackgroundColor = 'notRed';
                }

                // 靠后格子的颜色
                let _colorLastList = _lastCellColor.match(/(\d)+/g);
                if (_colorLastList[1] >= 200 && _colorLastList[4] >= 200) {
                    _lastBackgroundColor = 'red';
                } else {
                    _lastBackgroundColor = 'notRed'
                }

                if (_firstBackgroundColor !== _lastBackgroundColor) {
                    _compareResult = true
                } else {
                    _compareResult = false
                }

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

                // 比较结果，结果应该是一个布尔类型
                // let _compareResult = function () {
                //     let _compareResult = false
                //
                //     // 判断颜色不等于空，同时不等于默认值
                //     if (_firstBackgroundColor !== _lastBackgroundColor) {
                //         // 把颜色切割成数组
                //         let this_colorList = _firstCellColor.match(/(\d)+/g);
                //         console.log("很顺利，进入到颜色识别里面了================");
                //         if (this_colorList.length >= 3) {
                //             _compareResult = true;
                //         }
                //     } else {
                //         // 如果颜色与默认值相同，或者颜色为空，则返回false
                //         console.log("没有进入到颜色识别里面================================")
                //         _compareResult = false
                //     }
                // }


                let this_title = _panelTitleList[i].innerHTML; //字符串
                let this_defaultValue = _lastBackgroundColor; //初始颜色
                let this_selector = _onePanelContent; //一个对象
                let this_valueSelector = _firstBackgroundColor; //现在颜色
                let new_panel = new panel(this_title, this_defaultValue, this_selector, this_valueSelector, _compareResult);
                console.log("当前面板对象：", new_panel)
                globalPanelList.table_panel_container_list.push(new_panel)
                // 继续下一轮循环
                // 经过多次循环panelList里面就会装满东西，具体装在：panelList.table_panel_container_list中，里面的每一个对象都是一个字典类型
            }
        }
    } else {
        console.log("队列非空，跳过初始化")
    }
}

// 如果颜色不相同，则开始对颜色进行识别
// function _colorRecognition(color) {
//     let colorList = color.match(/(\d)+/g);
//     console.log("很顺利，进入到颜色识别里面了================");
//     if ((colorList.length > 3) && (colorList[3] === 0)) {
//         return false;
//     }
//     return ((colorList[0] > 50) && (Math.abs(colorList[1] - colorList[2]) < 200));
// }


// 启动监控报警
function start() {
    isRunning = true; //设置为开始状态
    setTimeout(function () {
        look();
    }, interval);
}

// 重启按钮
function restart() {
    isRunning = true;
    look();
}

// 停止报警
function stop() {
    isRunning = false;
    // look();
}


// 报警触发
function look() {
    let _alertPanelList = []; //一个空的list，用来存放报警面板信息
    let _errorCount = 0; //错误数量
    for (let i in globalPanelList) {
        try {
            console.log(i)
            // 这里得到的事一个报警面板的list，然后经过concat方法的合并，最终得到一个更大的list
            _alertPanelList = _alertPanelList.concat(panelCompare(globalPanelList[i])); //concat方法，合并两个或多个数组，此方法不会更改现有数据，而是返回一个新的数组
        } catch (e) {
            console.log(e, '累计异常次数:' + _errorCount);
            if (_errorCount >= alertMaxNum) {
                // 向后台进程发起通信
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
    }
    //for循环结束

    let length = _alertPanelList.length; //获取报警队列的长度
    let alertCount = 0; //新增变量用来进行报警计数
    for (let i = 0; i < length; i++) {
        alertCount += _alertPanelList[i].alertNum; //报警计数加等于所有报警面板中积攒的数字
        //最后得到《报警队列》中所有单个面板的报警次数的统计只和
    }

    // 报警次数累计只和如果大于我们认为设定的报警边界
    if (alertCount >= alertMaxNum) {
        console.log('累计告警次数:' + alertCount);
        let title = '';

        for (let i = 0; i < length; i++) {
            //重新把单个面板中报警的次数设置为一个负数，算作是报警的缓冲静默期
            _alertPanelList[i].alertNum = -alertMaxNum * 30;
            //然后把所有报警面板的标题追加到同一个变量中
            title += _alertPanelList[i].title + '，';
        }

        // 向后台进程发起通信触发报警
        chrome.runtime.sendMessage({
            cmd: "alert",
            message: {
                title: title,
                message: alertCount,
                voice: voice
            }
        });
    }


    if (isRunning === true) {
        setTimeout("look()", interval);
    }
}

// 仪表板比对
function panelCompare(table_panel_container_list) {
    let _length = table_panel_container_list.length; //获取面板集合的长度
    let _alertPanel = []; //声明一个空的list，存放报警面板信息

    for (let i = 0; i < _length; i++) {
        let _thisPanel = table_panel_container_list[i]; //从list中拿到一个面板
        console.log("拿到一个面板详情信息")
        console.log(_thisPanel)
        if (_thisPanel === null) { //如果当前面板信息为空
            continue; //则仅终止当前一次循环
        }
        try {
            // 让面板对象中的最新颜色值等于valueSelector的值
            _thisPanel.nowValue = _thisPanel.valueSelector;
            // console.log(_thisPanel.nowValue)
            // console.log(_thisPanel.compareValue)

            // 判断面板对象中存放的比较结果
            if (_thisPanel.compareValue) {
                //且如果面板对象中的报警次数大于0
                if (_thisPanel.alertNum > 0) { //判断报警次数是否大于零
                    //则把该面板对象添加到报警队列中
                    _alertPanel.push(_thisPanel); //如果报警次数大于零，就在报警面板的list中追加一个面板对象
                }
                //否则仅仅只把该面板对象的报警次数+1
                _thisPanel.alertNum++;

                //获取当前时间，然后打印日志到控制台
                let date = new Date();
                console.log('时间:' + date.toLocaleTimeString() + ' 仪表盘:' + _thisPanel.title + ' 值为:' + _thisPanel.nowValue + ' 累计次数:' + _thisPanel.alertNum);

            } else {

                // 如果面板对象的compareValue值为false，则把报警次数强制修改为0
                _thisPanel.alertNum = 0;
            }
        } catch (e) {
            //异常处理
            if (_thisPanel.alertNum > 0) {
                _alertPanel.push(_thisPanel);
            }
            _thisPanel.alertNum++;
            console.log('数据获取异常，对象信息为：', _thisPanel, e);
        }
    }
    // 返回一个报警队列
    return _alertPanel;
}

// 设置各项参数
function setContentStatus(options) {
    alertMaxNum = options.alertMaxNum;
    interval = options.interval;
    voice = options.voice;
    // _updatePanelList(options.panelList);
}

// 更新面板数据（单独的面板数据）
// function _updatePanelList(newPanelList) {
//     for (let key in newPanelList) {
//         if (newPanelList.hasOwnProperty(key)) {
//             let length = newPanelList[key].length;
//             for (let i = 0; i < length; i++) {
//                 if (newPanelList[key][i] === null) {
//                     globalPanelList[key][i] = null;
//                 } else {
//                     globalPanelList[key][i].defaultValue = newPanelList[key][i];
//                 }
//             }
//         }
//     }
// }

