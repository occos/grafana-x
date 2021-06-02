let dashboardId = 0;
let dashboardUrl = '';


// 在接收端设置一个runtime.onMessage事件监听器来处理消息（请求，发件人，发送响应）
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // 选区对应的代码块进行执行
    switch (request.cmd) {

        case 'alert':
            console.log('alert:', request.message);
            alert(request.message);
            break;

        case 'getBackgroundStatus':
            // _testAlert();
            break;

        default:
            console.log('未知命令', request.cmd);
    }

    sendResponse({
        dashboardId: dashboardId, //第一次返回的编号是0
        dashboardUrl: dashboardUrl, //第一次返回的RUL是空
    })
});

function _testAlert() {
    let speechLine = new SpeechSynthesisUtterance("运维自动化报警");
    speechLine.rate = 0.9;
    speechLine.volume = 1;
    window.speechSynthesis.speak(speechLine);
    speechLine.text = "接口延时异常";
    speechLine.rate = 0.9;
    speechLine.volume = 1;
    window.speechSynthesis.speak(speechLine);
}

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



