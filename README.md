## 使用说明

需要在所收集信息的项目中导入该模块，通过initMonitor初始化本地收集 参数说明

```
app_type： 应用名称
user_code：用户身份标识（可传字符串或者函数，函数返回值是用户标识）
app_version：所记录项目的版本号
```

```
import {initMonitor} from 'XXX'
initMonitor(app_type, user_code, app_version);
例：
initMonitor("O", "1234", "1.0.0");
```

向window暴露 [localLogBase](https://)：可以重置记录数据库和查看相关传参

## 配置说明：

本地日志记录默认开启状态，需要所监测项目配置 配置信息写到*localStorage* 的'localLogConfig'中 配置信息数据结构如下（每个字段对应一个监控模块）总开关字段：is_close http_black_list:
配置的http请求黑名单（不会监听名单的请求），填写字符路径例如：
['coupe.work/schema/','/api/xxx/xxx']

```
const CONFIG = {
   is_open: true,
   console_log: true,
   http_log: true,
   page_log: true,
   click_log: true,
   error_log: true,
   http_black_list: []
}
```

[飞书文档地址](https://huolala.feishu.cn/wiki/wikcn2kU2YKBEDGSXyIYxOGt9m0)

数据库名称：info_collect`<br/>`
表名称：all_log`<br/>`
索引字段：timeStamp，userId，logType

## 下载页说明

下载页地址：当前host + '/dashboard#downLoad' 例如OMS：https://xxxxxxxxxxxx/dashboard#downLoad

window暴露downLoadFile函数可以直接调用触发下载 window.downLoadFile 参数说明：

```
/**
 * downLoadFile
 * 文件下载
 * 参数说明
 * userCode: 用户code（不填时取当前登陆id||0）
 * startTime: 开始时间，可以通过new Date生成Date对象的字符串。可不填，此时导出至endTime
 * endTime: 结束时间，可以通过new Date生成Date对象的字符串。可不填，此时从startTime开始导出
 * startTime & endTime 均不填时，导出所有数据
 */
```

下载结果是excel表格

        // console.time('add10000')
        // let list = []
        // for (let i = 1; i < 10000; i++) {
        //     let behaviorInfo = new commonRecord();
        //     Object.assign(behaviorInfo.saveBase, {
        //         className: 'qw',
        //         tagName: 'qwer',
        //         innerText: 'qwer',
        //         logType: CLICK_LOG
        //     })
        //     stagList.push(behaviorInfo.saveBase)
        //     list.push(saveStag())
        // }
        // Promise.all(list).then(() => {
        //     console.timeEnd('add10000')
        // })

