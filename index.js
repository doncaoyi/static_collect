const CONFIG = {
    is_close: true,
    console_log: true,
    http_log: true,
    page_log: true,
    click_log: true,
    error_log: true
}
const DB_NAME = 'hll_info_collect'
const STORE_NAME = 'all_log'
const PAGE_LOG = 'PAGE_LOG'

    // 接口日志类型
    , HTTP_LOG = 'HTTP_LOG'

    // js报错日志类型
    , ERROR_LOG = 'ERROR_LOG'

    // 用户的行为类型
    , CLICK_LOG = 'CLICK_LOG'

    // 控制台信息
    , CONSOLE_LOG = 'CONSOLE_LOG'

/**
 * IndexDB相关函数
 */

const onupgradeneeded = function () {//更改数据库，或者存储对象时候在这里处理
    console.log('onupgradeneeded')
    let db = this.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        let store = db.createObjectStore(STORE_NAME, {autoIncrement: true});
        store.createIndex('timeStamp', 'timeStamp', {unique: true});
        store.createIndex('userId', 'userId', {unique: false});
        store.createIndex('logType', 'logType', {unique: false});
    }
};

function initIndexDB() {
    //调用 open 方法并传递数据库名称。如果不存在具有指定名称的数据库，则会创建该数据库
    let openRequest = indexedDB.open(DB_NAME, 1);
    openRequest.onerror = function (e) {
        console.log("Database error: ", e);
    };
    openRequest.onupgradeneeded = onupgradeneeded
}

/**
 * 添加数据
 */
function addData(data_list) {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(DB_NAME, 1);
        openRequest.onerror = function (e) {//当创建数据库失败时候的回调
            reject(e)
        };
        openRequest.onsuccess = function () {
            try {
                let db = openRequest.result; //创建数据库成功时候，将结果给db，此时db就是当前数据库
                if (db.objectStoreNames.contains(STORE_NAME)) {
                    let transaction = db.transaction(STORE_NAME, 'readwrite');
                    let store = transaction.objectStore(STORE_NAME);
                    for (let i = 0; i < data_list.length; i++) {
                        store.add(data_list[i]);
                    }
                } else {
                    deleteDb(initIndexDB)
                }
                db.close()
                resolve(db)
            } catch (e) {
                reject(e)
            }
        };
    })
}

function deleteDb(fn) {
    let DBDeleteRequest = window.indexedDB.deleteDatabase(DB_NAME);
    DBDeleteRequest.onsuccess = function (event) {
        fn()
    };
}

/**
 * 查找数据
 *
 * index：索引或者主键
 * query：范围
 * storage_list：保存找到数据的数组
 */
function findData({index, query = null} = {}, storage_list = []) {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(DB_NAME, 1);
        let db;
        openRequest.onerror = (e) => {//当创建数据库失败时候的回调
            reject(e)
        };
        openRequest.onsuccess = () => {
            try {
                db = openRequest.result; //创建数据库成功时候，将结果给db，此时db就是当前数据库
                if (db.objectStoreNames.contains(STORE_NAME)) {
                    const transaction = db.transaction(STORE_NAME, 'readonly');
                    const objectStore = transaction.objectStore(STORE_NAME);
                    const target = index ? objectStore.index(index) : objectStore;
                    const cursor = target.openCursor(query);
                    cursor.onsuccess = (e) => {
                        let res = e.target.result;
                        if (res) {
                            let obj = {
                                primaryKey: res.primaryKey
                            }
                            Object.assign(obj, res.value)
                            storage_list.push(obj);
                            res.continue();
                        } else {
                            db.close()
                            resolve(storage_list)
                            return storage_list
                        }
                    }
                    cursor.onerror = function (e) {
                        reject(e)
                    }
                }
            } catch (e) {
                reject(e)
            }
        };
    })
}

// 批量删除数据
function deleteDataById(value) {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(DB_NAME);
        let db;
        openRequest.onerror = (e) => {//当创建数据库失败时候的回调
            reject(e)
        };
        openRequest.onsuccess = function () {
            try {
                db = openRequest.result; //创建数据库成功时候，将结果给db，此时db就是当前数据库
                if (db.objectStoreNames.contains(STORE_NAME)) {
                    let transaction = db.transaction(STORE_NAME, 'readwrite');
                    let objectStore = transaction.objectStore(STORE_NAME);
                    let request = objectStore.delete(Number(value));//根据查找出来的id，再次逐个查找
                    request.onsuccess = function () {
                        resolve('success')
                    }
                    request.onerror = function (e) {
                        reject(e)
                    }
                    db.close()
                }
            } catch (e) {
                reject(e)
            }
        }
    })
}

/**
 * 监控代码需要的工具类
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
     * 重写页面的onload事件
     */
    this.addLoadEvent = function (func) {
        let oldOnload = window.onload; //把现在有window.onload事件处理函数的值存入变量oldonload。
        if (typeof oldOnload != 'function') { //如果这个处理函数还没有绑定任何函数，就像平时那样把新函数添加给它
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
            // screenShotInfo.handleLogInfo(SCREEN_SHOT, screenShotInfo);
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
    this.format = function (date, fmt) {
        if (!(date instanceof Date)) {
            return ''
        }
        let o = {
            "M+": date.getMonth() + 1, //月份
            "d+": date.getDate(), //日
            "h+": date.getHours(), //小时
            "m+": date.getMinutes(), //分
            "s+": date.getSeconds(), //秒
            "q+": Math.floor((date.getMonth() + 3) / 3), //季度
            "S": date.getMilliseconds() //毫秒
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (let k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }
}


/**
 * 参数说明
 * app_type：应用类型
 * user_code: 用户code
 * app_version: 所监测应用的版本号
 * config: 配置开关
 */
export function initMonitor(app_type, user_code, app_version, config = CONFIG) {
    if (!config.is_close) {
        return
    } else {
        initIndexDB()
    }
    if (!indexedDB) {
        console.log('indexedDB不支持')
        return;
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

        // 工具类示例化
        , utils = new MonitorUtils()

        // 设备信息
        , DEVICE_INFO = utils.getDevice()

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

    // 日志基类, 实际保存日志
    function MonitorBaseInfo() {
        return function () {
            let logInfo = this.saveBase
            // 针对不同模块的特殊处理
            switch (logInfo.logType) {
            }
            return addData([logInfo]).catch((res) => {
                // 避免引起循环
                if (logInfo.logType !== CONSOLE_LOG) {
                    console.log(res)
                }
            })
        };
    }

    // 设置日志对象类的通用属性和操作
    function commonRecord() {
        this.saveBase = {
            logTime: utils.format(new Date(), 'yyyy-MM-dd hh:mm:ss'),// 日志发生时间
            timeStamp: new Date().getTime(),
            href: window.location.href, // 页面的url
            userId: user_code || "",
            deviceInfo: DEVICE_INFO,
            app_version: app_version || '',
            logType: ''
        }
        this.monitorBase = new MonitorBaseInfo();
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
        window.addEventListener('DOMContentLoaded', function () {
            console.log('DOMContentLoaded')
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                afterPage: location.origin,
                beforePage: document.referrer || window.opener,
                type: 'onload',
                logType: PAGE_LOG
            })
            common.monitorBase().then()
        })
        // hash方式，同时可以可以监测到参数
        window.onhashchange = function (e) {
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                afterPage: e.newURL,
                beforePage: e.oldURL,
                type: e.type,
                logType: PAGE_LOG
            })
            common.monitorBase().then()
        };

        window.addEventListener('popstate', (e) => {
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                afterPage: (e?.arguments && e?.arguments[2]) || '',
                beforePage: e?.arguments[1] || '',
                type: e.type,
                logType: PAGE_LOG
            })
            common.monitorBase().then()
        })
        // history模式的路由监控
        history.pushState = coverHistory('pushState');
        history.replaceState = coverHistory('replaceState');
        window.addEventListener('pushState', (e) => {
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                afterPage: e?.arguments[2] || '',
                beforePage: e?.arguments[1] || '',
                type: e.type,
                logType: PAGE_LOG
            })
            common.monitorBase().then()
        })
        window.addEventListener('replaceState', (e) => {
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                afterPage: e?.arguments[2] || '',
                beforePage: e?.arguments[1] || '',
                type: e.type,
                logType: PAGE_LOG
            })
            common.monitorBase().then()
        })
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
                type: e.type,
                filename: e.filename,
                typeName,
                sourceUrl,
                logType: ERROR_LOG
            })
            common.monitorBase().then()
        }, true);
        window.onunhandledrejection = function (e) {
            console.info('onunhandledrejection', e)
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
                type: e.type,
                logType: ERROR_LOG
            })
            common.monitorBase().then()
        }
    };

    function recordConsole() {
        // 覆盖console的方法, 可以捕获更全面的提示信息
        coverConsole('log')
        coverConsole('error')
        // coverConsole('info')
        coverConsole('warn')
    }

    function coverConsole(type) {
        let old = console[type];
        console[type] = function () {
            let common = new commonRecord();
            console.info('argument', arguments)
            const argument = {
                ...arguments
            }
            Object.assign(common.saveBase, {
                type,
                msg: JSON.stringify(argument),
                logType: CONSOLE_LOG
            })
            common.monitorBase().then(() => {
            })
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
                realXHR.SAVEINFO.method = arguments[0] || ''
                realXHR.SAVEINFO.url = arguments[1] || ''
                return oldOpen.apply(this, arguments)
            }
            realXHR.send = function () {
                realXHR.SAVEINFO.parase = arguments[0] || ''
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
            const common = new commonRecord();
            Object.assign(common.saveBase, {
                startTimeStr: utils.format(new Date(detail.startTime), 'yyyy-MM-dd hh:mm:ss'),
                ...detail,
                desc: '发起请求',
                type: e.type,
                logType: HTTP_LOG
            })
            common.monitorBase().then()
        })
        window.addEventListener('ajaxLoadEnd', function (e) {
            let currentTime = new Date().getTime()
            let url = e.detail.responseURL;
            const responseText = e.detail.responseText;
            let status = e.detail.status;
            const detail = e.detail.SAVEINFO;
            let statusText = e.detail.statusText;
            let loadTime = currentTime - detail.startTime;
            let common = new commonRecord();
            Object.assign(common.saveBase, {
                startTimeStr: utils.format(new Date(detail.startTime), 'yyyy-MM-dd hh:mm:ss'),
                endTimeStr: utils.format(new Date(currentTime), 'yyyy-MM-dd hh:mm:ss'),
                loadTime,
                statusCode: status,
                ...detail,
                type: e.type,
                url,
                responseText,
                statusText,
                desc: '请求结束',
                logType: HTTP_LOG
            })
            common.monitorBase().then()
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
            behaviorInfo.monitorBase().then()
        }, true)
    };

    // 暴露主动操作接口
    window.hllLocalLogBase = {
        localInfo: {
            app_type, user_code, app_version, config
        },
        reInitDB: function () {
            if (confirm('确定重新初始化本地日志记录吗？（确认之后之前的历史记录将被清除）')) {
                deleteDb(initIndexDB)
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
            findData({index: 'timeStamp', query: IDBKeyRange.upperBound(time)}).then((list) => {
                Promise.all(list.map(item => deleteDataById(item.primaryKey))).then().catch((res) => {
                    console.log(res)
                })
            }).catch((res) => {
                console.log(res)
            })
            if (location.pathname === '/dashboard' && location.hash === '#downLoad') {
                const parent = document.querySelector('body')
                let children = document.querySelectorAll("body>div") || [];
                children.forEach((item) => {
                    parent.removeChild(item);
                })
                // const node = document.createElement("div");
                // node.setAttribute('id', 'app');
                // parent.appendChild(node);
                // const app = new Vue({
                //     el: '#app',
                //     data: {
                //         message: 'Hello Vue!'
                //     },
                //     template: '<div>{{ message }}</div>'
                // })
                const template = `<img src="https://semantic-ui.com/images/avatar2/large/kristy.png" class="image">
<div class="container">
    <p class="name">User Name</p>
    <p class="email">yourmail@some-email.com</p>
    <button class="button">Follow</button>
  </div>`
                const node = document.createElement("template");
                parent.appendChild(node);
                document.write(template);
            }
        })
    }

    /**
     * 监控初始化配置, 以及启动的方法
     */
    function init() {
        try {
            // 启动监控
            config.page_log && recordLoadPage();
            config.click_log && recordBehavior();
            config.error_log && recordJavaScriptError();
            config.http_log && recordHttpLog();
            config.console_log && recordConsole();
        } catch (e) {
            console.error("监控代码异常，捕获", e);
        }
    }

    if (config.is_close) {
        init()
        deleteHistory();
    }
};

export function downLoadFile() {
    if (!indexedDB) {
        return
    }

}