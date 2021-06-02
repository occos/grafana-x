
### 原作者

该插件原始作者为辛鑫同学，本仓库是在他的开发基础上进行了小部分的改动

### 插件作用

- 这是一个Chrome插件，可以用来对接grafana仪表盘上的Table类型图表变化，然后发出人工语音报警提醒
- master分支只兼容grafana7.x版，grafana6.x版本的插件请参见当前仓库的grafana-6.x分支

<hr/>

## grafana自动监视插件

### 目的

* 由于grafana自带的报警只支持graph，而且对zabbix数据源不支持报警查询
* 在忙其他事情时可能会错过报警，但总是盯着屏幕看状态好麻烦啊

### 方案

利用chrome提供的API，监控table的颜色变化与singlestat的颜色或数值的变化，在达到制定次数后，通过系统弹窗提示用户查看页面报警详情

* table：应用启动时获取到某表格中最后一条的background-color数据，并以其为标准，检测该表格第一条的background-color，如果不同则说明表格中至少一个Metric异常
* singlestat（无guage）：应用启动时获取到某singlestat中数据的color，并以其为标准，检测该singlestat中数据的color，如果不同则说明出现异常
* singlestat（有guage）：应用启动时获取到某singlestat中数据的第一个临界值，并以其为标准，检测该singlestat中数据，如果超过该临界值则说明出现异常

### 使用方法

直接启用chrome开发者模式，加载该文件夹，打开想要监控的grafana大屏，选择开始监控即可，如果要停止监控，刷新页面即可

待补充...
