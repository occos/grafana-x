//==========================
// 通信监听
//==========================
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.cmd) {

        case 'alert':
            console.log('alert:', request.message);
            alert(request.message);
            break;

        case 'getBackgroundStatus':
            // _testAlert();
            break;

        case "getTabsMetadata":
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                let _tabMetadata = {
                    "tabId": tabs[0].id,
                    "tabUrl": tabs[0].url,
                    "tabIndex": tabs[0].index,
                    "tabWindowId": tabs[0].windowId,
                    "tabHighlighted": tabs[0].highlighted,
                    "tabActive": tabs[0].active,
                    "tabTitle": tabs[0].title,
                    "tabStatus": tabs[0].status
                }
                chrome.tabs.sendMessage(_tabMetadata.tabId, {cmd: "getMetadata", metadata: _tabMetadata}, function (response) {
                    // console.log(response)
                })
            })
            break;

        default:
            console.log('未知命令', request.cmd);
    }
    sendResponse({
        status: "ok"
    })
})


//==========================
// 测试报警
//==========================
function _testAlert() {
    console.log("_testAlert()函数被调用。。。")
    let speechLine = new SpeechSynthesisUtterance("运维自动化报警");
    speechLine.lang = "zh-TW";
    speechLine.rate = 0.9;
    speechLine.volume = 1;
    window.speechSynthesis.speak(speechLine);
    speechLine.text = "接口延时异常";
    speechLine.rate = 0.9;
    speechLine.volume = 1;
    window.speechSynthesis.speak(speechLine);
}


//==========================
// 正式报警
//==========================
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
            speechLine.lang = "zh-TW";
            speechLine.rate = 0.9;
            window.speechSynthesis.speak(speechLine);
        }, 2000)
    }
}