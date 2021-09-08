/* eslint-disable*/
import * as moment from 'moment';
import IndexDBWrapper from "indexdbwrapper";

const CONFIG = {
    is_close: false,
    console_log: false,
    http_log: false,
    page_log: false,
    click_log: false,
    error_log: false
}
const DB_NAME = 'hll_info_collect'

/**
 * 参数说明
 * app_type：应用类型
 * user_code: 用户code
 * app_version: 所监测应用的版本号
 * config: 配置开关
 */
export function initMonitor(app_type, user_code, app_version, router, config = CONFIG) {
    /** globe letiable **/
    // if(!config.is_close){
    //     return
    // } else {
    //     initIndexDB()
    // }
    // initIndexDB()
    if (!localStorage) {
        window.localStorage = new Object();
    }
    if (!indexedDB) {

    } else {

    }
    console.log('router', router)
    router.beforeEach((to, from, next) => {
        // console.log('routerrouter')
        next()
    })

    // hash方式，同时可以可以监测到参数
    // window.onhashchange = function () {
    //     console.log('URL发生变化了' + location);
    // };
    // history

    window.addEventListener('popstate', (enevt) => {
        // console.log(enevt)
    })

    function dressHis(type) {
        let ori = history[type];
        return function () {
            let e = new Event(type);
            e.arguments = arguments;
            window.dispatchEvent(e);
            return ori.apply(this, arguments);
        }
    }

    history.pushState = dressHis('pushState');
    history.replaceState = dressHis('replaceState');
    window.addEventListener('pushState', (enevt) => {
        // console.log('pushState',enevt)
    })
    window.addEventListener('replaceState', (enevt) => {
        console.log('replaceState', enevt)

    })
    let
        // 暂存本地用于保存日志信息的数组
        indexDBRequest = null

        , uploadMessageArray = null

        // onerror 错误监控启动状态
        , jsMonitorStarted = false

        // 上传日志的开关，如果为false，则不再上传
        , uploadRemoteServer = true

        // 保存图片对应的描述，同一个描述只保存一次
        , screenShotDescriptions = []

        // 屏幕截图字符串
        , tempScreenShot = ""
        // 获取当前url
        , defaultLocation = window.location.href.split('?')[0].replace('#', '')

        // 页面加载对象属性
        , timingObj = performance && performance.timing

        // 获取页面加载的具体属性
        , resourcesObj = (function () {
            if (performance && typeof performance.getEntries === 'function') {
                return performance.getEntries();
            }
            return null;
        })();

    /** 常量 **/
    let
        // 所属项目ID, 用于替换成相应项目的UUID，生成监控代码的时候搜索替换
        // WEB_MONITOR_ID = user_code || "jeffery_webmonitor"

        // 判断是http或是https的项目
        // , WEB_HTTP_TYPE = window.location.href.indexOf('https') === -1 ? 'http://' : 'https://'

        // 获取当前页面的URL
        WEB_LOCATION = window.location.href

        // 本地IP, 用于区分本地开发环境
        // , WEB_LOCAL_IP = 'localhost'

        // 监控平台地址
        // , WEB_MONITOR_IP = 'www.webfunny.cn'

        // 用户访问日志类型
        , CUSTOMER_PV = 'CUSTOMER_PV'

        // 用户加载页面信息类型
        , LOAD_PAGE = 'LOAD_PAGE'

        // 接口日志类型
        , HTTP_LOG = 'HTTP_LOG'

        // 接口错误日志类型
        , HTTP_ERROR = 'HTTP_ERROR'

        // js报错日志类型
        , JS_ERROR = 'JS_ERROR'

        // 截屏类型
        , SCREEN_SHOT = 'SCREEN_SHOT'

        // 用户的行为类型
        , ELE_BEHAVIOR = 'ELE_BEHAVIOR'

        // 静态资源类型
        , RESOURCE_LOAD = 'RESOURCE_LOAD'

        // 用户自定义行为类型
        , CUSTOMIZE_BEHAVIOR = 'CUSTOMIZE_BEHAVIOR'

        // 浏览器信息
        , BROWSER_INFO = window.navigator.userAgent

        // 工具类示例化
        , utils = new MonitorUtils()

        // 设备信息
        , DEVICE_INFO = utils.getDevice()

        // 监控代码空构造函数
        , WebMonitor = {}

        // 获取用户自定义信息
        , USER_INFO = localStorage.wmUserInfo ? JSON.parse(localStorage.wmUserInfo) : {};

    // 判断探针引入的方式
    // let scriptDom = document.getElementById('web_monitor');
    // if (scriptDom) {
    //     try {
    //         let srcUrl = scriptDom.getAttribute('src');
    //         let urlId = srcUrl.split("?")[1].split("=")[1];
    //         WEB_MONITOR_ID = urlId;
    //     } catch (e) {
    //         console.warn("应用初始化标识未完成");
    //     }
    // }

    // 日志基类, 用于其他日志的继承
    function MonitorBaseInfo() {
        this.handleLogInfo = function (type, logInfo) {
            // let tempList = JSON.parse(localStorage[type] ? localStorage[type] : []);
            let tempList = localStorage[type] ? localStorage[type] : ''
            // localStorage[type] = JSON.stringify(tempList.push(logInfo))
            switch (type) {
                case ELE_BEHAVIOR:
                    localStorage[ELE_BEHAVIOR] = tempList + JSON.stringify(logInfo) + '$$$';
                    break;
                case JS_ERROR:
                    localStorage[JS_ERROR] = tempList + JSON.stringify(logInfo) + '$$$';
                    break;
                case HTTP_LOG:
                    localStorage[HTTP_LOG] = tempList + JSON.stringify(logInfo) + '$$$';
                    break;
                case SCREEN_SHOT:
                    localStorage[SCREEN_SHOT] = tempList + JSON.stringify(logInfo) + '$$$';
                    break;
                case CUSTOMER_PV:
                    localStorage[CUSTOMER_PV] = tempList + JSON.stringify(logInfo) + '$$$';
                    break;
                case LOAD_PAGE:
                    localStorage[LOAD_PAGE] = tempList + JSON.stringify(logInfo) + '$$$';
                    break;
                case RESOURCE_LOAD:
                    localStorage[RESOURCE_LOAD] = tempList + JSON.stringify(logInfo) + '$$$';
                    break;
                case CUSTOMIZE_BEHAVIOR:
                    localStorage[CUSTOMIZE_BEHAVIOR] = tempList + JSON.stringify(logInfo) + '$$$';
                    break;
                default:
                    break;
            }
        };
    }

    // 设置日志对象类的通用属性
    function setCommonProperty() {
        this.happenTime = moment().format('YYYY-MM-DD hh:mm:ss'); // 日志发生时间
        // this.webMonitorId = WEB_MONITOR_ID;     // 用于区分应用的唯一标识（一个项目对应一个）
        this.pageUrl = window.location.href; // 页面的url
        // this.customerKey = utils.getCustomerKey(); // 用于区分用户，所对应唯一的标识，清理本地数据后失效，
        // 用户自定义信息， 由开发者主动传入， 便于对线上问题进行准确定位
        let wmUserInfo = localStorage.wmUserInfo ? JSON.parse(localStorage.wmUserInfo) : "";
        // this.userId = utils.b64EncodeUnicode(wmUserInfo.userId || "");
        if (app_version) {
            this.app_version = app_version;
        }
        // this.secondUserParam = utils.b64EncodeUnicode(wmUserInfo.secondUserParam || "");
    }

    // 用户访问行为日志(PV)
    function CustomerPV(uploadType, loadType, loadTime) {
        setCommonProperty.apply(this);
        this.uploadType = uploadType;
        this.pageKey = utils.getPageKey();  // 用于区分页面，所对应唯一的标识，每个新页面对应一个值
        this.deviceName = DEVICE_INFO.deviceName;
        this.os = DEVICE_INFO.os + (DEVICE_INFO.osVersion ? " " + DEVICE_INFO.osVersion : "");
        this.browserName = DEVICE_INFO.browserName;
        this.browserVersion = DEVICE_INFO.browserVersion;
        // TODO 位置信息, 待处理
        this.monitorIp = "";  // 用户的IP地址
        this.country = "china";  // 用户所在国家
        this.province = "";  // 用户所在省份
        this.city = "";  // 用户所在城市
        this.loadType = loadType;  // 用以区分首次加载
        this.loadTime = loadTime; // 加载时间
    }

    CustomerPV.prototype = new MonitorBaseInfo();

    // 用户加载页面的信息日志
    function LoadPageInfo(uploadType, loadType, loadPage, domReady, redirect, lookupDomain, ttfb, request, loadEvent, appcache, unloadEvent, connect) {
        setCommonProperty.apply(this);
        this.uploadType = uploadType;
        this.loadType = loadType;
        this.loadPage = loadPage;
        this.domReady = domReady;
        this.redirect = redirect;
        this.lookupDomain = lookupDomain;
        this.ttfb = ttfb;
        this.request = request;
        this.loadEvent = loadEvent;
        this.appcache = appcache;
        this.unloadEvent = unloadEvent;
        this.connect = connect;
    }

    LoadPageInfo.prototype = new MonitorBaseInfo();

    // 用户行为日志，继承于日志基类MonitorBaseInfo
    function BehaviorInfo(uploadType, behaviorType, className, placeholder, inputValue, tagName, innerText) {
        setCommonProperty.apply(this);
        this.uploadType = uploadType;
        this.behaviorType = behaviorType;
        this.className = utils.b64EncodeUnicode(className);
        this.placeholder = utils.b64EncodeUnicode(placeholder);
        this.inputValue = utils.b64EncodeUnicode(inputValue);
        this.tagName = tagName;
        this.innerText = utils.b64EncodeUnicode(encodeURIComponent(innerText));
    }

    BehaviorInfo.prototype = new MonitorBaseInfo();

    // JS错误日志，继承于日志基类MonitorBaseInfo
    function JavaScriptErrorInfo(uploadType, infoType, errorMsg, errorStack) {
        setCommonProperty.apply(this);
        this.uploadType = uploadType;
        this.infoType = infoType;
        this.pageKey = utils.getPageKey();  // 用于区分页面，所对应唯一的标识，每个新页面对应一个值
        this.deviceName = DEVICE_INFO.deviceName;
        this.os = DEVICE_INFO.os + (DEVICE_INFO.osVersion ? " " + DEVICE_INFO.osVersion : "");
        this.browserName = DEVICE_INFO.browserName;
        this.browserVersion = DEVICE_INFO.browserVersion;
        // TODO 位置信息, 待处理
        this.monitorIp = "";  // 用户的IP地址
        this.country = "china";  // 用户所在国家
        this.province = "";  // 用户所在省份
        this.city = "";  // 用户所在城市
        this.errorMessage = utils.b64EncodeUnicode(errorMsg)
        this.errorStack = utils.b64EncodeUnicode(errorStack);
        this.browserInfo = "";
    }

    JavaScriptErrorInfo.prototype = new MonitorBaseInfo();

    // 接口请求日志，继承于日志基类MonitorBaseInfo
    function HttpLogInfo(uploadType, url, status, statusText, statusResult, currentTime, loadTime) {
        setCommonProperty.apply(this);
        this.uploadType = uploadType;  // 上传类型
        this.httpUrl = utils.b64EncodeUnicode(encodeURIComponent(url)); // 请求地址
        this.status = status; // 接口状态
        this.statusText = statusText; // 状态描述
        this.statusResult = statusResult; // 区分发起和返回状态
        this.happenTime = currentTime;  // 客户端发送时间
        this.loadTime = loadTime; // 接口请求耗时
    }

    HttpLogInfo.prototype = new MonitorBaseInfo();

    // JS错误截图，继承于日志基类MonitorBaseInfo
    function ScreenShotInfo(uploadType, des, screenInfo, imgType) {
        setCommonProperty.apply(this);
        this.uploadType = uploadType;
        this.description = utils.b64EncodeUnicode(des);
        this.screenInfo = screenInfo;
        this.imgType = imgType || "jpeg";
    }

    ScreenShotInfo.prototype = new MonitorBaseInfo();

    // 页面静态资源加载错误统计，继承于日志基类MonitorBaseInfo
    function ResourceLoadInfo(uploadType, url, elementType, status) {
        setCommonProperty.apply(this);
        this.uploadType = uploadType;
        this.elementType = elementType;
        this.sourceUrl = utils.b64EncodeUnicode(encodeURIComponent(url));
        this.status = status;  // 资源加载状态： 0/失败、1/成功
    }

    ResourceLoadInfo.prototype = new MonitorBaseInfo();

    // 上传拓展日志信息的入口
    function ExtendBehaviorInfo(userId, behaviorType, behaviorResult, uploadType, description) {
        this.userId = userId;
        this.behaviorType = behaviorType;
        this.behaviorResult = behaviorResult;
        this.uploadType = uploadType;
        this.description = description;
        this.happenTime = new Date().getTime(); // 日志发生时间
    }

    ExtendBehaviorInfo.prototype = new MonitorBaseInfo();


    /**
     * 用户访问记录监控
     * @param project 项目详情
     */
    function checkUrlChange() {
        // 如果是单页应用， 只更改url
        let webLocation = window.location.href.split('?')[0].replace('#', '');
        // 如果url变化了， 就把更新的url记录为 defaultLocation, 重新设置pageKey
        if (defaultLocation != webLocation) {
            recordPV();
            defaultLocation = webLocation;
        }
    }

    /**
     * 用户访问记录监控
     * @param project 项目详情
     */
    function recordPV() {
        utils.setPageKey();
        let loadType = "load";
        if (resourcesObj) {
            if (resourcesObj[0] && resourcesObj[0].type === 'navigate') {
                loadType = "load";
            } else {
                loadType = "reload";
            }
        }
        let customerPv = new CustomerPV(CUSTOMER_PV, loadType, 0);
        customerPv.handleLogInfo(CUSTOMER_PV, customerPv);
    }

    /**
     * 用户加载页面信息监控
     * @param project 项目详情
     */
    function recordLoadPage() {
        utils.addLoadEvent(function () {
            setTimeout(function () {
                if (resourcesObj) {
                    let loadType = "load";
                    if (resourcesObj[0] && resourcesObj[0].type === 'navigate') {
                        loadType = "load";
                    } else {
                        loadType = "reload";
                    }

                    let t = timingObj;
                    let loadPageInfo = new LoadPageInfo(LOAD_PAGE);
                    // 页面加载类型， 区分第一次load还是reload
                    loadPageInfo.loadType = loadType;

                    //【重要】页面加载完成的时间
                    //【原因】这几乎代表了用户等待页面可用的时间
                    loadPageInfo.loadPage = t.loadEventEnd - t.navigationStart;

                    //【重要】解析 DOM 树结构的时间
                    //【原因】反省下你的 DOM 树嵌套是不是太多了！
                    loadPageInfo.domReady = t.domComplete - t.responseEnd;

                    //【重要】重定向的时间
                    //【原因】拒绝重定向！比如，http://example.com/ 就不该写成 http://example.com
                    loadPageInfo.redirect = t.redirectEnd - t.redirectStart;

                    //【重要】DNS 查询时间
                    //【原因】DNS 预加载做了么？页面内是不是使用了太多不同的域名导致域名查询的时间太长？
                    // 可使用 HTML5 Prefetch 预查询 DNS ，见：[HTML5 prefetch](http://segmentfault.com/a/1190000000633364)
                    loadPageInfo.lookupDomain = t.domainLookupEnd - t.domainLookupStart;

                    //【重要】读取页面第一个字节的时间
                    //【原因】这可以理解为用户拿到你的资源占用的时间，加异地机房了么，加CDN 处理了么？加带宽了么？加 CPU 运算速度了么？
                    // TTFB 即 Time To First Byte 的意思
                    // 维基百科：https://en.wikipedia.org/wiki/Time_To_First_Byte
                    loadPageInfo.ttfb = t.responseStart - t.navigationStart;

                    //【重要】内容加载完成的时间
                    //【原因】页面内容经过 gzip 压缩了么，静态资源 css/js 等压缩了么？
                    loadPageInfo.request = t.responseEnd - t.requestStart;

                    //【重要】执行 onload 回调函数的时间
                    //【原因】是否太多不必要的操作都放到 onload 回调函数里执行了，考虑过延迟加载、按需加载的策略么？
                    loadPageInfo.loadEvent = t.loadEventEnd - t.loadEventStart;

                    // DNS 缓存时间
                    loadPageInfo.appcache = t.domainLookupStart - t.fetchStart;

                    // 卸载页面的时间
                    loadPageInfo.unloadEvent = t.unloadEventEnd - t.unloadEventStart;

                    // TCP 建立连接完成握手的时间
                    loadPageInfo.connect = t.connectEnd - t.connectStart;

                    loadPageInfo.handleLogInfo(LOAD_PAGE, loadPageInfo);
                }
                console.log('recordLoadPage')
                // 此方法有漏洞，暂时先注释掉
                // performanceGetEntries();
            }, 1000);
        })
    }

    /**
     * 监控页面静态资源加载报错
     */
    function recordResourceError() {
        // 当浏览器不支持 window.performance.getEntries 的时候，用下边这种方式
        window.addEventListener('error', function (e) {
            console.log('error', e)
            let typeName = e.target.localName;
            let sourceUrl = "";
            if (typeName === "link") {
                sourceUrl = e.target.href;
            } else if (typeName === "script") {
                sourceUrl = e.target.src;
            }
            let resourceLoadInfo = new ResourceLoadInfo(RESOURCE_LOAD, sourceUrl, typeName, "0");
            resourceLoadInfo.handleLogInfo(RESOURCE_LOAD, resourceLoadInfo);
        }, true);
    }

    /**
     * 利用window.performance.getEntries来对比静态资源是否加载成功
     */
    function performanceGetEntries() {
        /**
         * 判断静态资源是否加载成功, 将没有成功加载的资源文件作为js错误上报
         */
        if (window.performance && typeof window.performance.getEntries === "function") {
            // 获取所有的静态资源文件加载列表
            let entries = window.performance.getEntries();
            let scriptArray = entries.filter(function (entry) {
                return entry.initiatorType === "script";
            });
            let linkArray = entries.filter(function (entry) {
                return entry.initiatorType === "link";
            });

            // 获取页面上所有的script标签, 并筛选出没有成功加载的静态资源
            let scripts = [];
            let scriptObjects = document.getElementsByTagName("script");
            for (let i = 0; i < scriptObjects.length; i++) {
                if (scriptObjects[i].src) {
                    scripts.push(scriptObjects[i].src);
                }
            }
            let errorScripts = scripts.filter(function (script) {
                let flag = true;
                for (let i = 0; i < scriptArray.length; i++) {
                    if (scriptArray[i].name === script) {
                        flag = false;
                        break;
                    }
                }
                return flag;
            });

            // 获取所有的link标签
            let links = [];
            let linkObjects = document.getElementsByTagName("link");
            for (let i = 0; i < linkObjects.length; i++) {
                if (linkObjects[i].href) {
                    links.push(linkObjects[i].href);
                }
            }
            let errorLinks = links.filter(function (link) {
                let flag = true;
                for (let i = 0; i < linkArray.length; i++) {
                    if (linkArray[i].name === link) {
                        flag = false;
                        break;
                    }
                }
                return flag;
            });
            for (let m = 0; m < errorScripts.length; m++) {
                let resourceLoadInfo = new ResourceLoadInfo(RESOURCE_LOAD, errorScripts[m], "script", "0");
                resourceLoadInfo.handleLogInfo(RESOURCE_LOAD, resourceLoadInfo);
            }
            for (let m = 0; m < errorLinks.length; m++) {
                let resourceLoadInfo = new ResourceLoadInfo(RESOURCE_LOAD, errorLinks[m], "link", "0");
                resourceLoadInfo.handleLogInfo(RESOURCE_LOAD, resourceLoadInfo);
            }
        }
    }

    function siftAndMakeUpMessage(infoType, origin_errorMsg, origin_url, origin_lineNumber, origin_columnNumber, origin_errorObj) {
        // 记录js错误前，检查一下url记录是否变化
        checkUrlChange();
        let errorMsg = origin_errorMsg ? origin_errorMsg : '';
        let errorObj = origin_errorObj ? origin_errorObj : '';
        let errorType = "";
        if (errorMsg) {
            if (typeof errorObj === 'string') {
                errorType = errorObj.split(": ")[0].replace('"', "");
            } else {
                let errorStackStr = JSON.stringify(errorObj)
                errorType = errorStackStr.split(": ")[0].replace('"', "");
            }
        }
        let javaScriptErrorInfo = new JavaScriptErrorInfo(JS_ERROR, infoType, errorType + ": " + errorMsg, errorObj);
        javaScriptErrorInfo.handleLogInfo(JS_ERROR, javaScriptErrorInfo);
    };

    /**
     * 页面JS错误监控
     */
    function recordJavaScriptError() {
        // 重写console.error, 可以捕获更全面的报错信息
        let oldError = console.error;
        console.error = function (tempErrorMsg) {
            let errorMsg = (arguments[0] && arguments[0].message) || tempErrorMsg;
            let lineNumber = 0;
            let columnNumber = 0;
            let errorObj = arguments[0] && arguments[0].stack;
            if (!errorObj) {
                siftAndMakeUpMessage("console_error", errorMsg, WEB_LOCATION, lineNumber, columnNumber, "CustomizeError: " + errorMsg);
            } else {
                siftAndMakeUpMessage("console_error", errorMsg, WEB_LOCATION, lineNumber, columnNumber, errorObj);
            }
            return oldError.apply(console, arguments);
        };
        // 重写 onerror 进行jsError的监听
        window.onerror = function (errorMsg, url, lineNumber, columnNumber, errorObj) {
            console.log(errorObj)
            jsMonitorStarted = true;
            let errorStack = errorObj ? errorObj.stack : null;
            siftAndMakeUpMessage("on_error", errorMsg, url, lineNumber, columnNumber, errorStack);
        };
        window.onunhandledrejection = function (e) {
            let errorMsg = "";
            let errorStack = "";
            if (typeof e.reason === "object") {
                errorMsg = e.reason.message;
                errorStack = e.reason.stack;
            } else {
                errorMsg = e.reason;
                errorStack = "";
            }
            siftAndMakeUpMessage("on_error", errorMsg, WEB_LOCATION, 0, 0, "UncaughtInPromiseError: " + errorStack);
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
            // console.info('arguments',JSON.stringify([...arguments]))
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
            let realXHR = new oldXHR();
            // 中止事件
            realXHR.addEventListener('abort', function () {
                ajaxEventTrigger.call(this, 'ajaxAbort');
            }, false);
            // 发生错误事件
            realXHR.addEventListener('error', function () {
                ajaxEventTrigger.call(this, 'ajaxError');
            }, false);
            // 加载时事件
            realXHR.addEventListener('load', function () {
                ajaxEventTrigger.call(this, 'ajaxLoad');
            }, false);
            // 开始加载事件
            realXHR.addEventListener('loadstart', function () {
                ajaxEventTrigger.call(this, 'ajaxLoadStart');
            }, false);
            // 浏览器正在取
            realXHR.addEventListener('progress', function () {
                ajaxEventTrigger.call(this, 'ajaxProgress');
            }, false);
            // 时间超出时间
            realXHR.addEventListener('timeout', function () {
                ajaxEventTrigger.call(this, 'ajaxTimeout');
            }, false);
            // 加载完事件
            realXHR.addEventListener('loadend', function () {
                ajaxEventTrigger.call(this, 'ajaxLoadEnd');
            }, false);
            // 就绪状态（ready-state）改变时
            realXHR.addEventListener('readystatechange', function () {
                ajaxEventTrigger.call(this, 'ajaxReadyStateChange');
            }, false);
            // 此处的捕获的异常会连日志接口也一起捕获，如果日志上报接口异常了，就会导致死循环了。
            // realXHR.onerror = function () {
            //   siftAndMakeUpMessage("Uncaught FetchError: Failed to ajax", WEB_LOCATION, 0, 0, {});
            // }
            return realXHR;
        }

        let timeRecordArray = [];
        window.XMLHttpRequest = newXHR;
        window.addEventListener('ajaxLoadStart', function (e) {
            console.log(e)
            let tempObj = {
                timeStamp: new Date().getTime(),
                event: e
            }
            timeRecordArray.push(tempObj)
        });

        window.addEventListener('ajaxLoadEnd', function (e) {
            console.log(1234)
            for (let i = 0; i < timeRecordArray.length; i++) {
                if (timeRecordArray[i].event.detail.status > 0) {
                    let currentTime = new Date().getTime()
                    let url = timeRecordArray[i].event.detail.responseURL;
                    let status = timeRecordArray[i].event.detail.status;
                    let statusText = timeRecordArray[i].event.detail.statusText;
                    let loadTime = currentTime - timeRecordArray[i].timeStamp;
                    let httpLogInfoStart = new HttpLogInfo(HTTP_LOG, url, status, statusText, "发起请求", timeRecordArray[i].timeStamp, 0);
                    console.log(123456)
                    httpLogInfoStart.handleLogInfo(HTTP_LOG, httpLogInfoStart);
                    let httpLogInfoEnd = new HttpLogInfo(HTTP_LOG, url, status, statusText, "请求返回", currentTime, loadTime);
                    httpLogInfoEnd.handleLogInfo(HTTP_LOG, httpLogInfoEnd);
                    // 当前请求成功后就在数组中移除掉
                    timeRecordArray.splice(i, 1);
                }
            }
        });
    }

    /**
     * 用户行为记录监控
     */
    function recordBehavior(project) {
        // 行为记录开关
        if (project && project.record && project.record == 1) {
            // 记录行为前，检查一下url记录是否变化
            checkUrlChange();
            // 记录用户点击元素的行为数据
            document.onclick = function (e) {
                console.log(e)
                let className = "";
                let placeholder = "";
                let inputValue = "";
                let tagName = e.target.tagName;
                let innerText = "";
                if (e.target.tagName != "svg" && e.target.tagName != "use") {
                    className = e.target.className;
                    placeholder = e.target.placeholder || "";
                    inputValue = e.target.value || "";
                    innerText = e.target.innerText ? e.target.innerText.replace(/\s*/g, "") : "";
                    // 如果点击的内容过长，就截取上传
                    if (innerText.length > 200) innerText = innerText.substring(0, 100) + "... ..." + innerText.substring(innerText.length - 99, innerText.length - 1);
                    innerText = innerText.replace(/\s/g, '');
                }
                let behaviorInfo = new BehaviorInfo(ELE_BEHAVIOR, "click", className, placeholder, inputValue, tagName, innerText);
                behaviorInfo.handleLogInfo(ELE_BEHAVIOR, behaviorInfo);
            }
        }
    };


    /**
     * 监控代码需要的工具类
     * @constructor
     */
    function MonitorUtils() {
        this.getUuid = function () {
            let timeStamp = new Date().getTime()
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }) + "-" + timeStamp;
        };
        /**
         * 获取用户的唯一标识
         */
        this.getCustomerKey = function () {
            let customerKey = this.getUuid();
            let reg = /[0-9a-z]{8}(-[0-9a-z]{4}){3}-[0-9a-z]{12}-\d{13}/g
            if (!localStorage.monitorCustomerKey) {
                localStorage.monitorCustomerKey = customerKey;
            } else if (localStorage.monitorCustomerKey.length > 50 || !reg.test(localStorage.monitorCustomerKey)) {
                localStorage.monitorCustomerKey = customerKey;
            }
            return localStorage.monitorCustomerKey;
        };
        /**
         * 获取页面的唯一标识
         */
        this.getPageKey = function () {
            let pageKey = this.getUuid();
            if (!localStorage.monitorPageKey) localStorage.monitorPageKey = pageKey;
            return localStorage.monitorPageKey;
        };
        /**
         * 设置页面的唯一标识
         */
        this.setPageKey = function () {
            localStorage.monitorPageKey = this.getUuid();
        };
        /**
         * 重写页面的onload事件
         */
        this.addLoadEvent = function (func) {
            let oldOnload = window.onload; //把现在有window.onload事件处理函数的值存入变量oldonload。
            if (typeof window.onload != 'function') { //如果这个处理函数还没有绑定任何函数，就像平时那样把新函数添加给它
                window.onload = func;
            } else { //如果在这个处理函数上已经绑定了一些函数。就把新函数追加到现有指令的末尾
                window.onload = function () {
                    oldOnload();
                    func();
                }
            }
        }
        /**
         * 封装简易的ajax请求
         * @param method  请求类型(大写)  GET/POST
         * @param url     请求URL
         * @param param   请求参数
         * @param successCallback  成功回调方法
         * @param failCallback   失败回调方法
         */
        this.ajax = function (method, url, param, successCallback, failCallback) {
            let xmlHttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
            xmlHttp.open(method, url, true);
            xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                    let res = JSON.parse(xmlHttp.responseText);
                    typeof successCallback == 'function' && successCallback(res);
                } else {
                    typeof failCallback == 'function' && failCallback();
                }
            };
            xmlHttp.send("data=" + JSON.stringify(param));
        }
        /**
         * js处理截图
         */
        this.screenShot = function (cntElem, description) {
            let shareContent = cntElem;//需要截图的包裹的（原生的）DOM 对象
            let width = shareContent.offsetWidth; //获取dom 宽度
            let height = shareContent.offsetHeight; //获取dom 高度
            let canvas = document.createElement("canvas"); //创建一个canvas节点
            let scale = 0.3; //定义任意放大倍数 支持小数
            canvas.style.display = "none";
            canvas.width = width * scale; //定义canvas 宽度 * 缩放
            canvas.height = height * scale; //定义canvas高度 *缩放
            canvas.getContext("2d").scale(scale, scale); //获取context,设置scale
            let opts = {
                scale: scale, // 添加的scale 参数
                canvas: canvas, //自定义 canvas
                logging: false, //日志开关，便于查看html2canvas的内部执行流程
                width: width, //dom 原始宽度
                height: height,
                useCORS: true // 【重要】开启跨域配置
            };
            window.html2canvas && window.html2canvas(cntElem, opts).then(function (canvas) {
                let dataURL = canvas.toDataURL("image/webp");
                let tempCompress = dataURL.replace("data:image/webp;base64,", "");
                let compressedDataURL = utils.b64EncodeUnicode(tempCompress);
                let screenShotInfo = new ScreenShotInfo(SCREEN_SHOT, description, compressedDataURL)
                screenShotInfo.handleLogInfo(SCREEN_SHOT, screenShotInfo);
            });
        }
        this.getDevice = function () {
            let device = {};
            let ua = navigator.userAgent;
            let android = ua.match(/(Android);?[\s\/]+([\d.]+)?/);
            let ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
            let ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
            let iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/);
            let mobileInfo = ua.match(/Android\s[\S\s]+Build\//);
            device.ios = device.android = device.iphone = device.ipad = device.androidChrome = false;
            device.isWeixin = /MicroMessenger/i.test(ua);
            device.os = "web";
            device.deviceName = "PC";
            // Android
            if (android) {
                device.os = 'android';
                device.osVersion = android[2];
                device.android = true;
                device.androidChrome = ua.toLowerCase().indexOf('chrome') >= 0;
            }
            if (ipad || iphone || ipod) {
                device.os = 'ios';
                device.ios = true;
            }
            // iOS
            if (iphone && !ipod) {
                device.osVersion = iphone[2].replace(/_/g, '.');
                device.iphone = true;
            }
            if (ipad) {
                device.osVersion = ipad[2].replace(/_/g, '.');
                device.ipad = true;
            }
            if (ipod) {
                device.osVersion = ipod[3] ? ipod[3].replace(/_/g, '.') : null;
                device.iphone = true;
            }
            // iOS 8+ changed UA
            if (device.ios && device.osVersion && ua.indexOf('Version/') >= 0) {
                if (device.osVersion.split('.')[0] === '10') {
                    device.osVersion = ua.toLowerCase().split('version/')[1].split(' ')[0];
                }
            }

            // 如果是ios, deviceName 就设置为iphone，根据分辨率区别型号
            if (device.iphone) {
                device.deviceName = "iphone";
                let screenWidth = window.screen.width;
                let screenHeight = window.screen.height;
                if (screenWidth === 320 && screenHeight === 480) {
                    device.deviceName = "iphone 4";
                } else if (screenWidth === 320 && screenHeight === 568) {
                    device.deviceName = "iphone 5/SE";
                } else if (screenWidth === 375 && screenHeight === 667) {
                    device.deviceName = "iphone 6/7/8";
                } else if (screenWidth === 414 && screenHeight === 736) {
                    device.deviceName = "iphone 6/7/8 Plus";
                } else if (screenWidth === 375 && screenHeight === 812) {
                    device.deviceName = "iphone X/S/Max";
                }
            } else if (device.ipad) {
                device.deviceName = "ipad";
            } else if (mobileInfo) {
                let info = mobileInfo[0];
                let deviceName = info.split(';')[1].replace(/Build\//g, "");
                device.deviceName = deviceName.replace(/(^\s*)|(\s*$)/g, "");
            }
            // 浏览器模式, 获取浏览器信息
            // TODO 需要补充更多的浏览器类型进来
            if (ua.indexOf("Mobile") == -1) {
                let agent = navigator.userAgent.toLowerCase();
                let regStr_ie = /msie [\d.]+;/gi;
                let regStr_ff = /firefox\/[\d.]+/gi
                let regStr_chrome = /chrome\/[\d.]+/gi;
                let regStr_saf = /safari\/[\d.]+/gi;

                device.browserName = '未知';
                //IE
                if (agent.indexOf("msie") > 0) {
                    let browserInfo = agent.match(regStr_ie)[0];
                    device.browserName = browserInfo.split('/')[0];
                    device.browserVersion = browserInfo.split('/')[1];
                }
                //firefox
                if (agent.indexOf("firefox") > 0) {
                    let browserInfo = agent.match(regStr_ff)[0];
                    device.browserName = browserInfo.split('/')[0];
                    device.browserVersion = browserInfo.split('/')[1];
                }
                //Safari
                if (agent.indexOf("safari") > 0 && agent.indexOf("chrome") < 0) {
                    let browserInfo = agent.match(regStr_saf)[0];
                    device.browserName = browserInfo.split('/')[0];
                    device.browserVersion = browserInfo.split('/')[1];
                }
                //Chrome
                if (agent.indexOf("chrome") > 0) {
                    let browserInfo = agent.match(regStr_chrome)[0];
                    device.browserName = browserInfo.split('/')[0];
                    device.browserVersion = browserInfo.split('/')[1];
                }
            }
            // Webview
            device.webView = (iphone || ipad || ipod) && ua.match(/.*AppleWebKit(?!.*Safari)/i);

            // Export object
            return device;
        }
        this.loadJs = function (url, callback) {
            let script = document.createElement('script');
            script.async = 1;
            script.src = url;
            script.onload = callback;
            let dom = document.getElementsByTagName('script')[0];
            dom.parentNode.insertBefore(script, dom);
            return dom;
        }
        this.b64EncodeUnicode = function (str) {
            try {
                return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
                    return String.fromCharCode("0x" + p1);
                }));
            } catch (e) {
                return str;
            }
        }
    }

    // (function (num){
    //     let str = ''
    //     for(let i = 0;i<num;i++){
    //         str += 'qwertyui'
    //     }
    //     return str
    // })(1000000)
    // let blob = new Blob(['1234'], {type: 'text/plain;charset=utf-8'})

    window.webfunny = {
        /**
         * 埋点上传数据
         * @param url 当前页面的url
         * @param type 埋点类型
         * @param index 埋点顺序
         * @param description 其他信息描述
         */
        wm_upload: function (url, type, index, description) {
            let createTime = new Date().toString();
            let logParams = {
                createTime: encodeURIComponent(createTime),
                happenTime: new Date().getTime(),
                uploadType: 'WM_UPLOAD',
                simpleUrl: encodeURIComponent(encodeURIComponent(url)),
                // webMonitorId: WEB_MONITOR_ID,
                recordType: type,
                recordIndex: index,
                description: description
            };
            let http_api = HTTP_UPLOAD_RECORD_DATA;
            let recordDataXmlHttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP')
            recordDataXmlHttp.open('POST', http_api, true);
            recordDataXmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            recordDataXmlHttp.send('data=' + JSON.stringify([logParams]));
        },
        /**
         * 使用者传入的自定义信息
         *
         * @param userId
         * @param userName
         * @param userTpye
         */
        wm_init_user: function (userId, userTag, secondUserParam) {
            if (!userId) console.warn('userId 初始化值为0(不推荐) 或者 未初始化');
            if (!secondUserParam) console.warn('secondParam 初始化值为0(不推荐) 或者 未初始化');
            // 如果用户传入了userTag值，重新定义WEB_MONITOR_ID
            // if (userTag) {
            //     WEB_MONITOR_ID = userTag + "_webmonitor";
            // }
            localStorage.wmUserInfo = JSON.stringify({
                userId: userId,
                userTag: userTag,
                secondUserParam: secondUserParam
            });
            return 1;
        },
        /**
         * 使用者传入的自定义截屏指令, 由探针代码截图
         * @param description  截屏描述
         */
        wm_screen_shot: function (description) {
            setTimeout(function () {
                utils.screenShot(document.body, description)
            }, 500);
        },
        /**
         * 使用者传入图片进行上传
         * @param compressedDataURL 图片的base64编码字符串，description 图片描述
         */
        wm_upload_picture: function (compressedDataURL, description, imgType) {
            let screenShotInfo = new ScreenShotInfo(SCREEN_SHOT, description, compressedDataURL, imgType || "jpeg");
            screenShotInfo.handleLogInfo(SCREEN_SHOT, screenShotInfo);
        },
        /**
         * 使用者自行上传的行为日志
         * @param userId 用户唯一标识
         * @param behaviorType 行为类型
         * @param behaviorResult 行为结果（成功、失败等）
         * @param uploadType 日志类型（分类）
         * @param description 行为描述
         */
        wm_upload_extend_log: function (userId, behaviorType, behaviorResult, uploadType, description) {
            let extendBehaviorInfo = new ExtendBehaviorInfo(userId, behaviorType, behaviorResult, uploadType, description)
            extendBehaviorInfo.handleLogInfo(CUSTOMIZE_BEHAVIOR, extendBehaviorInfo);
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

    /**
     * IndexDB相关函数
     */

    let onupgradeneeded = function (event) {//更改数据库，或者存储对象时候在这里处理
        console.log('onupgradeneeded')
        let db = this.result;
        if (!db.objectStoreNames.contains('PAGE_LOG')) {
            let PAGE_LOG = db.createObjectStore('PAGE_LOG', {autoIncrement: true});
            PAGE_LOG.createIndex('logTime', 'logTime', {unique: false});
        }
        if (!db.objectStoreNames.contains('CLICK_LOG')) {
            let CLICK_LOG = db.createObjectStore('CLICK_LOG', {autoIncrement: true});
            CLICK_LOG.createIndex('logTime', 'logTime', {unique: false});
        }
        if (!db.objectStoreNames.contains('HTTP_LOG')) {
            let HTTP_LOG = db.createObjectStore('HTTP_LOG', {autoIncrement: true});
            HTTP_LOG.createIndex('logTime', 'logTime', {unique: false});
        }
        if (!db.objectStoreNames.contains('CONSOLE_LOG')) {
            let CONSOLE_LOG = db.createObjectStore('CONSOLE_LOG', {autoIncrement: true});
            CONSOLE_LOG.createIndex('logTime', 'logTime', {unique: false});
        }
        if (!db.objectStoreNames.contains('ERROR_LOG')) {
            let ERROR_LOG = db.createObjectStore('ERROR_LOG', {autoIncrement: true});
            ERROR_LOG.createIndex('logTime', 'logTime', {unique: false});
        }
    };

    function initIndexDB() {
        //调用 open 方法并传递数据库名称。如果不存在具有指定名称的数据库，则会创建该数据库
        let openRequest = indexedDB.open(DB_NAME, 1);
        openRequest.onerror = function (e) {//当创建数据库失败时候的回调
            console.log("Database error: ", e);
        };
        openRequest.onupgradeneeded = onupgradeneeded
    }

    const db = new IndexDBWrapper(DB_NAME, 1, {onupgradeneeded})


    //添加数据
    function addData(table_name, dataList) {
        let openRequest = indexedDB.open(DB_NAME, 1);
        openRequest.onerror = function (e) {//当创建数据库失败时候的回调
            console.log("Database error: " + e.target.errorCode);
        };
        openRequest.onsuccess = function (event) {
            let db = openRequest.result; //创建数据库成功时候，将结果给db，此时db就是当前数据库
            //打开相关的objectstore的事务
            let transaction = db.transaction(table_name, 'readwrite');
            let store = transaction.objectStore(table_name);
            for (let i = 0; i < dataList.length; i++) {
                store.add(dataList[i]);
            }
        };
    }

     function read(table_name, storageList = []) {
        return new Promise((resolve, reject) => {
            let openRequest = indexedDB.open(DB_NAME, 1);
            let db;
            openRequest.onerror = (e) => {//当创建数据库失败时候的回调
                console.log("Database error: " + e.target.errorCode);
                reject('12')
            };
            openRequest.onsuccess = (event) => {
                db = openRequest.result; //创建数据库成功时候，将结果给db，此时db就是当前数据库
                let transaction = db.transaction(table_name, 'readonly');
                let objectStore = transaction.objectStore(table_name);
                let cursor = objectStore.openCursor();

                cursor.onsuccess = (e) => {
                    let res = e.target.result;
                    if (res) {
                        storageList.push(res.value);
                        res.continue();
                    } else {
                        resolve(storageList)
                        return storageList
                    }
                }
            };
        })
    }

    /**
     * 监控初始化配置, 以及启动的方法
     */
    function init() {
        try {
            // indexDBRequest = window.indexedDB.open('hll_info_collect', 1);
            // indexDBRequest.onupgradeneeded = function (event) {
            //     db = event.target.result;
            //     let objectStore;
            //     if (!db.objectStoreNames.contains('HTTP_LOG')) {
            //         objectStore = db.createObjectStore('HTTP_LOG', { keyPath: 'id' });
            //     }
            //     let transaction = db.transaction(['HTTP_LOG'],'readwrite')
            //     objectStore = transaction.objectStore('HTTP_LOG')
            //     let request = objectStore.add({id:123,user:'123'})
            //     request.onsuccess = e => {
            //         console.log('添加数据成功。新数据的key是：',e.target.result)
            //     }
            // }
            // createDB('hll_info_collect')
            // addIndexDb('hll_info_collect')
            // 启动监控
            recordResourceError();
            recordPV();
            recordLoadPage();
            recordConsole();
            recordBehavior({record: 1});
            recordJavaScriptError();
            recordHttpLog();
            let list = []
            // addData('HTTP_LOG',[{id:123,ss:'234'},{id:13,ss:'234'},{id:23,ss:'234'}])
            // read('HTTP_LOG').then((res) => {
            //     console.log(res)
            // })

            /**
             * 添加一个定时器，进行数据的上传
             * 2秒钟进行一次URL是否变化的检测
             * 10秒钟进行一次数据的检查并上传
             */
            let timeCount = 0;
            let typeList = [ELE_BEHAVIOR, JS_ERROR, HTTP_LOG, SCREEN_SHOT, CUSTOMER_PV, LOAD_PAGE, RESOURCE_LOAD, CUSTOMIZE_BEHAVIOR]
            // setInterval(function () {
            //     checkUrlChange();
            //     // 进行一次上传
            //     if (timeCount >= 30) {
            //         // 如果是本地的localhost, 就忽略，不进行上传
            //         let logInfo = "";
            //         for (let i = 0; i < typeList.length; i++) {
            //             logInfo += (localStorage[typeList[i]] || "");
            //         }
            //         logInfo.length > 0 && utils.ajax("POST", HTTP_UPLOAD_LOG_INFO, {logInfo: logInfo}, function () {
            //             for (let i = 0; i < typeList.length; i++) {
            //                 localStorage[typeList[i]] = "";
            //             }
            //         }, function () {
            //         })
            //         timeCount = 0;
            //     }
            //     timeCount++;
            // }, 200);
        } catch (e) {
            console.error("监控代码异常，捕获", e);
        }
    }

    init();
};