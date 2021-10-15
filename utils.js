const DB_NAME = 'info_collect'
const STORE_NAME = 'all_log'
export const CONFIG = {
    is_open: true,
    console_log: true,
    http_log: true,
    page_log: true,
    click_log: true,
    error_log: true,
    http_black_list: []
}
/**
 * IndexDB相关函数
 */
const onupgradeneeded = function () {//更改数据库，或者存储对象时候在这里处理
    console.log('onupgradeneeded')
    let db = this.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        let store = db.createObjectStore(STORE_NAME, {autoIncrement: true});
        store.createIndex('timeStamp', 'timeStamp', {unique: false});
        store.createIndex('userId', 'userId', {unique: false});
        store.createIndex('logType', 'logType', {unique: false});
    }
};

/**
 * 监控代码需要的工具类
 */
export function MonitorUtils() {
    let that = this
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
    this.createScript = function (src, id) {
        return new Promise((resolve, reject) => {
            let script = document.createElement('script')
            script.onload = function () {
                resolve()
            }
            script.src = src
            if (id) {
                script.id = id
            }
            // 保证JS顺序执行！
            script.async = false
            document.body.appendChild(script);
        })
    }
    /**
     * 添加数据
     */
    this.addData = function (data_list) {
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
                        transaction.oncomplete = function () {
                            resolve(db)
                        }
                        transaction.onerror = transaction.onabort = function (e) {
                            reject(e)
                        }
                    } else {
                        that.deleteDb(that.initIndexDB)
                        reject()
                    }
                    db.close()
                } catch (e) {
                    reject(e)
                }
            };
        })
    }
    this.deleteDb = function (fn) {
        let DBDeleteRequest = window.indexedDB.deleteDatabase(DB_NAME);
        DBDeleteRequest.onsuccess = function (event) {
            fn()
        };
    }

    /**
     * 查找数据
     * index：索引或者主键
     * query：范围
     * storage_list：保存找到数据的数组
     */
    this.findData = function ({index, query = null} = {}, storage_list = []) {
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
    this.deleteDataById = function (list) {
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
                        list.forEach((node) => {
                            objectStore.delete(Number(node.primaryKey));//根据查找出来的id，再次逐个查找
                        })
                        transaction.oncomplete = function () {
                            resolve()
                        }
                        transaction.onerror = transaction.onabort = function (e) {
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
    this.initIndexDB = function () {
        //调用 open 方法并传递数据库名称。如果不存在具有指定名称的数据库，则会创建该数据库
        let openRequest = indexedDB.open(DB_NAME, 1);
        openRequest.onerror = function (e) {
            console.log("Database error: ", e);
        };
        openRequest.onupgradeneeded = onupgradeneeded
    }
    this.getConfig = function () {
        try {
            return (JSON.parse(localStorage.getItem('localLogConfig')) || CONFIG)
        } catch (e) {
            return CONFIG
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
    this.downLoad = function (buff, fileName = '操作日志') {
        const filename = `${fileName}.xlsx`;
        const blobContent = new Blob([buff], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const blobUrl = window.URL.createObjectURL(blobContent);

        const eleLink = document.createElement('a');
        eleLink.download = filename;
        eleLink.style.display = 'none';
        eleLink.href = blobUrl;
        document.body.appendChild(eleLink);
        eleLink.click();
        document.body.removeChild(eleLink);
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
        return {
            deviceName: device.deviceName,
            os: device.os + (device.osVersion ? " " + device.osVersion : ""),
            browserName: device.browserName,
            browserVersion: device.browserVersion
        };

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
            date = new Date(date)
        }
        if (isNaN(date.getTime())) {
            return NaN
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

