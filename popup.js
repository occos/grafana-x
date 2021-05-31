let panelList = {};
let contentStatus = {};
let backgroundStatus = {};
let dashboardId = 0;
let dashboardUrl = '';

let $message_btn = $('#message_btn');
let $init_btn = $('#init_btn');
let $restart_btn = $('#restart_btn');
let $start_btn = $('#start_btn');

let _getContentStatusFinish = false;
let _getBackgroundStatusFinish = false;
let _waitCount = 0;


chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    let reg = /^http:\/\/grafana.iquanwai.work\/d\/.*/;

    if (reg.test(tabs[0].url)) {
        dashboardId = tabs[0].id;
        dashboardUrl = tabs[0].url;
        getContentStatus('getPanelObjects');
        getBackgroundStatus();
        init();
    } else {
        $init_btn.css('display', 'none');
        $message_btn.html('不是grafana页面').css('display', 'inline-block');
    }
});


function init() {
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
        setTimeout(function () {
            init();
        }, 200);
    }
}


$init_btn.click(function () {
    popupWindow();
    $(this).css('display', 'none');
    $start_btn.css('display', 'inline-block');
});

$start_btn.click(function () {
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

$restart_btn.click(function () {
    let options = getOptions();
    getContentStatus('restart', options);
    getBackgroundStatus('setBackgroundStatus', options);
});

function getContentStatus(cmd = 'getContentStatus', options = {}) {
    console.log(cmd, dashboardId);
    chrome.tabs.sendMessage(dashboardId, {cmd: cmd, options: options}, function (message) {
        contentStatus = message;
        _getContentStatusFinish = true;
        console.log('contentStatus', contentStatus);
    });
}

function getBackgroundStatus(cmd = 'getBackgroundStatus', options = {}) {
    chrome.runtime.sendMessage({cmd: cmd, options: options}, function (message) {
        backgroundStatus = message;
        _getBackgroundStatusFinish = true;
        console.log('backgroundStatus', backgroundStatus);
    });
}

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
