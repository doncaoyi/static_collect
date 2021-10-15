import {MonitorUtils, CONFIG} from './utils'

const utils = new MonitorUtils()
const
    PAGE_LOG = 'PAGE_LOG'

    // 接口日志类型
    , HTTP_LOG = 'HTTP_LOG'

    // js报错日志类型
    , ERROR_LOG = 'ERROR_LOG'

    // 用户的行为类型
    , CLICK_LOG = 'CLICK_LOG'

    // 控制台信息
    , CONSOLE_LOG = 'CONSOLE_LOG'

const DEL_COUNT = 1000

/**
 * 参数说明
 * app_type：应用类型
 * user_code: 用户code,可传函数
 * app_version: 所监测应用的版本号
 * config: 配置开关
 */
export function initMonitor(app_type, user_code, app_version, oriConfig = CONFIG) {
    if (!indexedDB) {
        console.log('indexedDB不支持')
        return;
    }
    const config = utils.getConfig()
    if (!(config.is_open && oriConfig.is_open)) {
        return
    } 
    utils.initIndexDB()

    let { http_black_list } = oriConfig
    if (!Array.isArray(http_black_list)) {
        http_black_list = [http_black_list]
    }
    if (typeof user_code !== 'function') {
        const copyVal = user_code
        user_code = () => {
            return copyVal
        }
    }
    // let
    // 屏幕截图字符串
    // tempScreenShot = ""
    // 页面加载对象属性
    // , timingObj = performance && performance.timing
    // 获取页面加载的具体属性
    // , resourcesObj = (function () {
    //     if (performance && typeof performance.getEntries === 'function') {
    //         return performance.getEntries();
    //     }
    //     return null;
    // })();

    /** 常量 **/
    let
        // 判断是http或是https的项目
        // , WEB_HTTP_TYPE = window.location.href.indexOf('https') === -1 ? 'http://' : 'https://'

        // 本地IP, 用于区分本地开发环境
        // , WEB_LOCAL_IP = 'localhost'

        // 截屏类型
        SCREEN_SHOT = 'SCREEN_SHOT'

        // 静态资源类型
        , RESOURCE_LOAD = 'RESOURCE_LOAD'

        // 浏览器信息
        , BROWSER_INFO = window.navigator.userAgent

        // 设备信息
        , DEVICE_INFO = utils.getDevice()

    // 设置日志对象类的通用属性和操作
    function commonRecord() {
        this.saveBase = {
            logTime: utils.format(new Date(), 'yyyy-MM-dd hh:mm:ss'),// 日志发生时间
            timeStamp: new Date().getTime(),
            href: window.location.href, // 页面的url
            userId: user_code() || "",
            deviceInfo: DEVICE_INFO,
            app_version: app_version || '',
            logType: ''
        }
    }

    let stagList = []

    const stagCount = 10

    function saveStag(flag) {
        if ((stagList.length && stagList.length >= stagCount) || flag) {
            const cpStagList = stagList
            stagList = []
            return utils.addData(cpStagList).catch(() => {
                stagList.push(...cpStagList)
            })
        }
    }

    /**
     * 页面性能信息模块
     */
    //            setTimeout(function () {
    //                 if (resourcesObj) {
    //                     let loadType = "load";
    //                     if (resourcesObj[0] && resourcesObj[0].type === 'navigate') {
    //                         loadType = "load";
    //                     } else {
    //                         loadType = "reload";
    //                     }
    //
    //                     let t = timingObj;
    //                     let loadPageInfo = new LoadPageInfo(LOAD_PAGE);
    //                     // 页面加载类型， 区分第一次load还是reload
    //                     loadPageInfo.loadType = loadType;
    //
    //                     //【重要】页面加载完成的时间
    //                     //【原因】这几乎代表了用户等待页面可用的时间
    //                     loadPageInfo.loadPage = t.loadEventEnd - t.navigationStart;
    //
    //                     //【重要】解析 DOM 树结构的时间
    //                     //【原因】反省下你的 DOM 树嵌套是不是太多了！
    //                     loadPageInfo.domReady = t.domComplete - t.responseEnd;
    //
    //                     //【重要】重定向的时间
    //                     //【原因】拒绝重定向！比如，http://example.com/ 就不该写成 http://example.com
    //                     loadPageInfo.redirect = t.redirectEnd - t.redirectStart;
    //
    //                     //【重要】DNS 查询时间
    //                     //【原因】DNS 预加载做了么？页面内是不是使用了太多不同的域名导致域名查询的时间太长？
    //                     // 可使用 HTML5 Prefetch 预查询 DNS ，见：[HTML5 prefetch](http://segmentfault.com/a/1190000000633364)
    //                     loadPageInfo.lookupDomain = t.domainLookupEnd - t.domainLookupStart;
    //
    //                     //【重要】读取页面第一个字节的时间
    //                     //【原因】这可以理解为用户拿到你的资源占用的时间，加异地机房了么，加CDN 处理了么？加带宽了么？加 CPU 运算速度了么？
    //                     // TTFB 即 Time To First Byte 的意思
    //                     // 维基百科：https://en.wikipedia.org/wiki/Time_To_First_Byte
    //                     loadPageInfo.ttfb = t.responseStart - t.navigationStart;
    //
    //                     //【重要】内容加载完成的时间
    //                     //【原因】页面内容经过 gzip 压缩了么，静态资源 css/js 等压缩了么？
    //                     loadPageInfo.request = t.responseEnd - t.requestStart;
    //
    //                     //【重要】执行 onload 回调函数的时间
    //                     //【原因】是否太多不必要的操作都放到 onload 回调函数里执行了，考虑过延迟加载、按需加载的策略么？
    //                     loadPageInfo.loadEvent = t.loadEventEnd - t.loadEventStart;
    //
    //                     // DNS 缓存时间
    //                     loadPageInfo.appcache = t.domainLookupStart - t.fetchStart;
    //
    //                     // 卸载页面的时间
    //                     loadPageInfo.unloadEvent = t.unloadEventEnd - t.unloadEventStart;
    //
    //                     // TCP 建立连接完成握手的时间
    //                     loadPageInfo.connect = t.connectEnd - t.connectStart;
    //
    //                     loadPageInfo.handleLogInfo(LOAD_PAGE, loadPageInfo);
    //                 }
    //                 console.log('recordLoadPage')
    //                 // 此方法有漏洞，暂时先注释掉
    //                 // performanceGetEntries();
    //             }, 1000);

    /**
     * 用户加载页面信息监控
     * @param project 项目详情
     */
    function recordLoadPage() {
        let beforePage = ''
        window.addEventListener('DOMContentLoaded', function () {
            console.log('DOMContentLoaded')
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                afterPage: location.origin,
                beforePage: document.referrer || window.opener,
                pageType: 'DOMContentLoaded',
                title: document.title,
                logType: PAGE_LOG
            })
            stagList.push(common.saveBase)
            saveStag()
            beforePage = location.pathname + location.hash
        })
        // hash方式，同时可以可以监测到参数
        // window.onhashchange = function (e) {
        //     console.log('onhashchange',e)
        //     let common = new commonRecord();
        //     Object.assign(common.saveBase, {
        //         afterPage: e.newURL,
        //         beforePage: e.oldURL || '',
        //         pageType: e.type,
        //         title: document.title,
        //         logType: PAGE_LOG
        //     })
        //     common.monitorBase().then()
        //     afterPage = location.pathname + location.hash
        // };
        window.addEventListener('popstate', (e) => {
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                afterPage: location.pathname || '',
                beforePage,
                title: document.title,
                pageType: e.type,
                logType: PAGE_LOG
            })
            stagList.push(common.saveBase)
            saveStag()
            beforePage = location.pathname + location.hash
            if (location.pathname === '/dashboard' && location.hash === '#downLoad') {
                writeHtml()
            }
        })
        // history模式的路由监控
        history.pushState = coverHistory('pushState');
        history.replaceState = coverHistory('replaceState');
        window.addEventListener('pushState', (e) => {
            beforePage = (e.arguments && e.arguments[2]) || '',
                setState(e)
        })
        window.addEventListener('replaceState', (e) => {
            beforePage = (e.arguments && e.arguments[2]) || '',
                setState(e)
        })
    }

    function setState(e) {
        let common = new commonRecord();
        Object.assign(common.saveBase, {
            afterPage: (e.arguments && e.arguments[2]) || '',
            beforePage: location.pathname || '',
            title: document.title,
            pageType: e.type,
            logType: PAGE_LOG
        })
        stagList.push(common.saveBase)
        saveStag()
    }

    function coverHistory(type) {
        let ori = history[type];
        return function () {
            let e = new Event(type);
            e.arguments = arguments;
            window.dispatchEvent(e);
            return ori.apply(this, arguments);
        }
    }

    /**
     * 页面JS错误监控
     */
    function recordJavaScriptError() {
        // 重写 error 进行jsError的监听
        window.addEventListener('error', function (e) {
            let typeName = e.target.localName;
            let sourceUrl = "";
            if (typeName === "link") {
                sourceUrl = e.target.href;
            } else if (typeName === "script" || typeName === "img") {
                sourceUrl = e.target.src;
            }
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                stack: e?.error?.stack,
                message: e?.error?.message,
                errorType: e.type,
                filename: e.filename,
                typeName,
                sourceUrl,
                logType: ERROR_LOG
            })
            stagList.push(common.saveBase)
            saveStag()
        }, true);
        window.onunhandledrejection = function (e) {
            let errorMsg = "";
            let errorStack = "";
            if (typeof e.reason === "object") {
                errorMsg = e?.reason?.message;
                errorStack = e?.reason?.stack;
            } else {
                errorMsg = e.reason;
                errorStack = "";
            }
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                stack: errorStack,
                message: errorMsg,
                errorType: e.type,
                logType: ERROR_LOG
            })
            stagList.push(common.saveBase)
            saveStag()
        }
    };

    function recordConsole() {
        // 覆盖console的方法, 可以捕获更全面的提示信息
        coverConsole('log')
        coverConsole('error')
        coverConsole('info')
        coverConsole('warn')
    }

    function coverConsole(type) {
        let old = console[type];
        console[type] = function () {
            let common = new commonRecord();
            const argument = {
                ...arguments
            }
            Object.assign(common.saveBase, {
                consoleType: type,
                msg: JSON.stringify(argument),
                logType: CONSOLE_LOG
            })
            stagList.push(common.saveBase)
            saveStag()
            return old.apply(this, arguments)
        }
    }


    /**
     * 页面接口请求监控
     */
    function recordHttpLog() {
        // 监听ajax的状态
        function ajaxEventTrigger(event) {
            let ajaxEvent = new CustomEvent(event, {
                detail: this
            });
            window.dispatchEvent(ajaxEvent);
        }

        let oldXHR = window.XMLHttpRequest;


        function newXHR() {
            const realXHR = new oldXHR();
            const oldOpen = realXHR.open;
            const oldSend = realXHR.send;
            realXHR.SAVEINFO = {}
            realXHR.open = function () {
                realXHR.SAVEINFO.method = arguments && (arguments[0] || '')
                realXHR.SAVEINFO.url = arguments && (arguments[1] || '')
                return oldOpen.apply(this, arguments)
            }
            realXHR.send = function () {
                const saveInfo = this.SAVEINFO
                if (saveInfo.method.toLowerCase() === 'get') {
                    const list = saveInfo.url.split('?') || []
                    saveInfo.url = list[0] || ''
                    saveInfo.params = list[1] || ''
                } else {
                    saveInfo.params = arguments && (arguments[0] || '')
                }
                return oldSend.apply(this, arguments)
            }
            // // 中止事件
            // realXHR.addEventListener('abort', function () {
            //     ajaxEventTrigger.call(this, 'ajaxAbort');
            // }, false);
            // 发生错误事件
            // realXHR.addEventListener('error', function () {
            //     ajaxEventTrigger.call(this, 'ajaxError');
            // }, false);
            // 加载时事件
            // realXHR.addEventListener('load', function () {
            //     ajaxEventTrigger.call(this, 'ajaxLoad');
            // }, false);
            // 开始加载事件
            realXHR.addEventListener('loadstart', function () {
                realXHR.SAVEINFO.startTime = new Date().getTime();
                ajaxEventTrigger.call(this, 'ajaxLoadStart');
            }, false);
            // 浏览器正在取
            // realXHR.addEventListener('progress', function () {
            //     ajaxEventTrigger.call(this, 'ajaxProgress');
            // }, false);
            // 时间超出时间
            // realXHR.addEventListener('timeout', function () {
            //     ajaxEventTrigger.call(this, 'ajaxTimeout');
            // }, false);
            // 加载完事件
            realXHR.addEventListener('loadend', function () {
                ajaxEventTrigger.call(this, 'ajaxLoadEnd');
            }, false);
            // 就绪状态（ready-state）改变时
            // realXHR.addEventListener('readystatechange', function () {
            //     ajaxEventTrigger.call(this, 'ajaxReadyStateChange');
            // }, false);
            return realXHR;
        }

        window.XMLHttpRequest = newXHR;

        window.addEventListener('ajaxLoadStart', function (e) {
            const detail = e.detail.SAVEINFO;
            if (http_black_list.some((item) => {
                try {
                    return detail.url.includes(item)
                } catch (e) {
                    return false
                }
            })) {
                return
            }
            const common = new commonRecord();
            Object.assign(common.saveBase, {
                startTimeStr: utils.format(new Date(detail.startTime), 'yyyy-MM-dd hh:mm:ss'),
                ...detail,
                desc: detail.startTime + '发起请求',
                httpType: e.type,
                logType: HTTP_LOG
            })
            stagList.push(common.saveBase)
            saveStag()
        })
        window.addEventListener('ajaxLoadEnd', function (e) {
            const detail = e.detail.SAVEINFO;
            if (http_black_list.some((item) => {
                try {
                    return detail.url.includes(item)
                } catch (e) {
                    return false
                }
            })) {
                return
            }
            let currentTime = new Date().getTime()
            let url = e.detail.responseURL;
            let responseText = e.detail.responseText;
            let status = e.detail.status;
            let statusText = e.detail.statusText;
            let loadTime = currentTime - detail.startTime;
            let common = new commonRecord();
            if (status === 200) {
                responseText = responseText.slice(0, 100)
            }
            Object.assign(common.saveBase, {
                startTimeStr: utils.format(new Date(detail.startTime), 'yyyy-MM-dd hh:mm:ss'),
                endTimeStr: utils.format(new Date(currentTime), 'yyyy-MM-dd hh:mm:ss'),
                loadTime,
                statusCode: status,
                ...detail,
                httpType: e.type,
                url,
                responseText,
                statusText,
                desc: detail.startTime + '请求结束',
                logType: HTTP_LOG
            })
            stagList.push(common.saveBase)
            saveStag()
        });
    }

    /**
     * 用户行为记录监控
     */
    function recordBehavior() {
        // 记录用户点击元素的行为数据
        document.addEventListener('click', function (e) {
            let className = "";
            let tagName = e.target.tagName;
            let innerText = "";
            if (e.target.tagName !== "svg" && e.target.tagName !== "use") {
                className = e.target.className;
                innerText = e.target.innerText ? e.target.innerText.replace(/\s*/g, "") : "";
                // 如果点击的内容过长，就截取上传
                if (innerText.length > 200) innerText = innerText.substring(0, 100) + "... ..." + innerText.substring(innerText.length - 99, innerText.length - 1);
                innerText = innerText.replace(/\s/g, '');
            }

            let behaviorInfo = new commonRecord();
            Object.assign(behaviorInfo.saveBase, {
                className,
                tagName,
                innerText,
                logType: CLICK_LOG
            })
            stagList.push(behaviorInfo.saveBase)
            saveStag()
        }, true)
    };

    // 暴露主动操作接口
    window.localLogBase = {
        localInfo: {
            app_type, user_code: user_code, app_version, config: config, paramsConfig: oriConfig
        },
        reInitDB: function () {
            if (confirm('确定重新初始化本地日志记录吗？（确认之后之前的历史记录将被清除）')) {
                utils.deleteDb(utils.initIndexDB)
            }
        }
    };

    // polyFile 如果不支持 window.CustomEvent
    (function () {
        if (typeof window.CustomEvent === "function") return false;

        function CustomEvent(event, params) {
            params = params || {bubbles: false, cancelable: false, detail: undefined};
            let evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
    })();

    function deleteHistory() {
        window.addEventListener('DOMContentLoaded', function () {
            const time = new Date().getTime() - 7 * 24 * 60 * 60 * 1000
            utils.findData({index: 'timeStamp', query: IDBKeyRange.upperBound(time)}).then((list) => {
                const pList = []
                for (let i = 0; i < list.length; i += DEL_COUNT) {
                    pList.push(utils.deleteDataById(list.slice(i, i + DEL_COUNT)))
                }
                Promise.all(pList).catch((res) => {
                    console.log(res)
                })
            }).catch((res) => {
                console.log(res)
            })
            window.onbeforeunload = function () {
                saveStag(true)
            }
            if (location.pathname === '/dashboard' && location.hash === '#downLoad') {
                // const parent = document.querySelector('body')
                // if (!Vue) {
                //     const vueNode = document.createElement('script')
                //     vueNode.src = '//s-oms.huolala.cn/static/cdn/js/vue.min.js'
                //     vueNode.onload = function () {
                //
                //     }
                //     parent.appendChild(vueNode)
                // } else {
                // const node = document.createElement("div");
                // node.setAttribute('id', 'app');
                // parent.appendChild(node);
                // const app = new Vue({
                //     el: '#app',
                //     data: {
                //         message: 'Hello Vue!'
                //     },
                //     template: '<div>{{ message }}</div>',
                //     method: {},
                //     mounted: function () {
                //         console.log('mounted')
                //     }
                // })
                // }
                // let children = document.querySelectorAll("body>div") || [];
                // children.forEach((item) => {
                //     parent.removeChild(item);
                // })
                writeHtml()
            }
        })
    }

    function writeHtml() {
        const template = `<div style="text-align: center;margin-top: 100px" class="container">
                                    <h3>日志导出</h3>
                                    <form name="local_log_collect">
                                        <div style="margin-bottom: 20px">
                                            <label for="startTime">导出日志的开始时间:</label>
                                            <input id="startTime" type="datetime-local" name="startTime" required>
                                        </div>
                                        <div style="margin-bottom: 20px">
                                            <label for="endTime">导出日志的结束时间:</label>
                                            <input id="endTime" type="datetime-local" name="endTime" required>
                                        </div>
                                        <button onclick="downLoadFile(local_log_collect.startTime.value,local_log_collect.endTime.value)" id="submit" type="button">导出日志</button>
                                    </form>
                                    <button onclick="backFirst()">返回首页</button>
                                  </div>`
        document.open()
        document.write(template)
        document.close()
        if (!window.ExcelJS) {
            utils.createScript('//front-static.huolala.cn/common/exceljs/exceljs.bare.min.js', 'exceljs').then()
        }
        document.title = '本地日志导出'
        local_log_collect.startTime.value = utils.format(new Date().getTime() - 60 * 60 * 1000, 'yyyy-MM-ddThh:mm:ss')
        local_log_collect.endTime.value = utils.format(new Date(), 'yyyy-MM-ddThh:mm:ss')
    }

    /**
     * 监控初始化配置, 以及启动的方法
     */
    function init() {
        try {
            // 启动监控
            oriConfig.page_log && config.page_log && recordLoadPage();
            oriConfig.click_log && config.click_log && recordBehavior();
            oriConfig.error_log && config.error_log && recordJavaScriptError();
            oriConfig.http_log && config.http_log && recordHttpLog();
            oriConfig.console_log && config.console_log && recordConsole();
        } catch (e) {
            console.error("监控代码异常，捕获", e);
        }
    }

    if (oriConfig.is_open && config.is_open) {
        init();
        deleteHistory();
        window.downLoadFile = downLoadFile;
        window.backFirst = function () {
            location.href = location.origin
        }
    }
};

/**
 * downLoadFile
 * 文件下载
 * 参数说明
 * userCode: 用户code（不填时取当前登陆id||0）
 * startTime: 开始时间，可以通过new Date生成Date对象的字符串。可不填，此时导出至endTime
 * endTime: 结束时间，可以通过new Date生成Date对象的字符串。可不填，此时从startTime开始导出
 * startTime & endTime 均不填时，导出所有数据
 */
export function downLoadFile(start, end, userCode) {
    if (!indexedDB) {
        alert('不支持indexDB')
        return
    }
    // if (!start || !end) {
    //     alert('导出时间必填')
    //     return;
    // }
    if (!userCode) {
        userCode = localLogBase?.localInfo?.user_code || ''
    }
    if (typeof userCode !== 'function') {
        const copyUserCode = userCode
        userCode = () => {
            return copyUserCode || ''
        }
    }
    let startTime, endTime
    try {
        startTime = start ? new Date(start).getTime() : 0;
        endTime = end ? new Date(end).getTime() : new Date().getTime();
        if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
            alert('时间格式填写错误')
            return;
        }
        if (startTime > endTime) {
            alert('开始时间大于结束时间')
            return;
        }
    } catch (e) {
        alert('请检查输入的参数')
        return;
    }
    if (!confirm(`确定要导出时间：${start || startTime}->${end || endTime}的日志吗？`)) {
        return;
    }

    utils.findData({index: 'timeStamp', query: IDBKeyRange.bound(startTime, endTime)}).then(res => {
        const list = res.filter(ele => ele.userId === userCode() || !ele.userId)
        if (!list.length) {
            alert('没有对应数据')
            return
        }
        if (!window.ExcelJS) {
            utils.createScript('//front-static.huolala.cn/common/exceljs/exceljs.bare.min.js', 'exceljs').then()
            alert('加载导出模块中，请重试')
            return;
        }

        // 类目key，相互间不能重复，否则会替换之前保存的key
        const logKeysConfig = [{
            key: 'logTime',
            width: 20,
        }, {
            key: 'href',
            width: 30,
        }, {
            key: 'logType',
            width: 15,
        }, {
            key: 'details',
            width: 50,
        }, {
            key: 'app_version',
            width: 10,
        }, {
            key: 'userId',
            width: 7,
        }]
        const deviceInfoKeys = ['deviceName', 'os', 'browserName', 'browserVersion']
        const PAGE_LOG_COLOR = 'FFE03997',
            HTTP_LOG_COLOR = 'FF8DC63F',
            ERROR_LOG_COLOR = 'FFE54D42',
            CLICK_LOG_COLOR = 'FF0081FF',
            CONSOLE_LOG_COLOR = 'FFFBBD08',
            DEFAULT_COLOR = 'FFF16622'
        // 边框样式
        const borderStyle = {style: 'thin', color: {argb: 'FFAAAAAA'}}

        // 建表 & 添加标题
        function getSheets(wb, sheetsName, config) {
            const sheets = wb.addWorksheet(sheetsName)
            sheets.columns = config.map(item => {
                return {
                    header: typeof item === 'string' ? item : item.key,
                    key: typeof item === 'string' ? item : item.key,
                    width: typeof item === 'string' ? 15 : item.width,
                };
            })
            return sheets
        }

        /**
         * 获取deviceInfo,
         * @returns Array
         */
        function getDeviceInfo(arr) {
            const arrLen = arr.length
            if (arrLen === 1) {
                return arr
            }
            const firstDeviceInfo = arr[0],
                lastDeviceInfo = arr[arrLen - 1];
            // 首尾版本一致，无版本升级
            if (lastDeviceInfo.deviceInfo?.browserVersion === firstDeviceInfo.deviceInfo?.browserVersion) {
                return [lastDeviceInfo.deviceInfo]
            }
            // 双指针取出所有不一致的版本
            const returnList = []
            returnList.push(firstDeviceInfo.deviceInfo)
            for (let i = 1; i < arrLen; i++) {
                if (arr[i - 1].deviceInfo?.browserVersion !== arr[i].deviceInfo?.browserVersion) {
                    const clone = JSON.parse(JSON.stringify(arr[i]))
                    clone.deviceInfo.browserVersion += clone?.logTime
                    returnList.push(arr[i].deviceInfo?.browserVersion)
                }
            }
            return returnList
        }

        // 样式处理
        function getStyle(color = 'FFF16622') {
            return {
                fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {
                        argb: color
                    },
                },
                border: {
                    top: borderStyle,
                    left: borderStyle,
                    bottom: borderStyle,
                    right: borderStyle,
                }
            }
        }

        // 创建文件 & 建表
        const workbook = new window.ExcelJS.Workbook();
        const logSheet = getSheets(workbook, 'log日志', logKeysConfig);
        const deviceInfoSheet = getSheets(workbook, '设备信息', deviceInfoKeys);

        // 添加行数据
        // deviceInfoSheet 做判断是否有浏览器升级，有则放入不同的信息
        getDeviceInfo(list).forEach(info => {
            deviceInfoSheet.addRow(info)
        })
        // log表
        list.reverse().forEach(item => {
            const {logTime, app_version, userId, href, logType, deviceInfo, ...details} = item
            // 移除不显示的属性
            delete details.primaryKey
            delete details.timeStamp
            logSheet.addRow({
                logTime, app_version, userId, href, logType, details
            })
        });

        // log表头部上色
        logSheet.getRow(1).eachCell(cell => {
            cell.style = getStyle()
        })

        // log表logtype做颜色区分
        logSheet.getColumn('logType').eachCell(cell => {
            let color
            switch (cell.value) {
                case PAGE_LOG:
                    color = PAGE_LOG_COLOR
                    break;
                case HTTP_LOG:
                    color = HTTP_LOG_COLOR
                    break;
                case ERROR_LOG:
                    color = ERROR_LOG_COLOR
                    break;
                case CLICK_LOG:
                    color = CLICK_LOG_COLOR
                    break;
                case CONSOLE_LOG:
                    color = CONSOLE_LOG_COLOR
                    break;
                default:
                    color = DEFAULT_COLOR
                    break;
            }
            cell.style = getStyle(color)
        })

        // 下载文件
        workbook.xlsx.writeBuffer().then((buffer) => {
            utils.downLoad(buffer, `${start || startTime}-${end || endTime} 操作日志`);
        }).catch(err => console.log(err));
    })
}
