var forceFallback = forceFallback || (window.WebSocket && window.WebSocket.CLOSED > 2 ? false : true);

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (callback, thisArg) {
        var T, k;
        if (this == null) {
            throw new TypeError('this is null or not defined');
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if (typeof callback !== "function") {
            throw new TypeError(callback + ' is not a function');
        }
        if (arguments.length > 1) {
            T = thisArg;
        }
        k = 0;
        while (k < len) {
            var kValue;
            if (k in O) {
                kValue = O[k];
                callback.call(T, kValue, k, O);
            }
            k++;
        }
    };
};

(function () {
    if (!Object.defineProperty ||
        !(function () { try { Object.defineProperty({}, 'x', {}); return true; } catch (e) { return false; } }())) {
        var orig = Object.defineProperty;
        Object.defineProperty = function (o, prop, desc) {
            // In IE8 try built-in implementation for defining properties on DOM prototypes.
            if (orig) { try { return orig(o, prop, desc); } catch (e) { } }
            if (o !== Object(o)) { throw TypeError("Object.defineProperty called on non-object"); }
            if (Object.prototype.__defineGetter__ && ('get' in desc)) {
                Object.prototype.__defineGetter__.call(o, prop, desc.get);
            }
            if (Object.prototype.__defineSetter__ && ('set' in desc)) {
                Object.prototype.__defineSetter__.call(o, prop, desc.set);
            }
            if ('value' in desc) {
                o[prop] = desc.value;
            }
            return o;
        };
    }
}());

if (!Array.prototype.filter) {
    Array.prototype.filter = function (fun/*, thisArg*/) {
        'use strict';
        if (this === void 0 || this === null) {
            throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== 'function') {
            throw new TypeError();
        }

        var res = [];
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i];
                if (fun.call(thisArg, val, i, t)) {
                    res.push(val);
                }
            }
        }

        return res;
    };
}

if (forceFallback === true) {
    window.WebSocket = (function () {
        function WebSocket(url, controllers) {

            var that = this;
            this.persistentId = localStorage.getItem(that._url);
            this.pollingId = XSockets.Utils.guid();
            this.http = new XSockets.HttpFallback();
            this.startListener = function () {
                if (that.readyState === 0) {
                    window.setTimeout(function () {
                        that.readyState = 1;
                        that.listener(that.pollingId);
                        that.onopen(that.persistentId);
                    }, 500);
                }
            };
            this.initialize = function () {
                var tryConnect = that.http.getJSON("/API/XSocketsWebApi?url=" + encodeURIComponent(arguments[0]) + "&controllers=" + arguments[1] + "&pollingId=" + that.pollingId, {},
                    function (connInfo) {
                        that.persistentId = connInfo.persistentId;
                        that.pollingId = connInfo.pollingId;
                        that.startListener();
                    });
                if (tryConnect.hasOwnProperty("error")) {
                    tryConnect.error(function (error) {
                        that.onclose(error);
                    });
                }
                return tryConnect;
            };
            this.initialize(url, controllers.join(","));

        };
        WebSocket.prototype.listener = function (pollingId) {
            var that = this;
            this.http.getJSON("/API/XSocketsWebApi?pollingId=" + pollingId, {}, function (result) {
                (JSON.parse(result) || []).forEach(function (message) {
                    that.onmessage(new that.MessageWrapper(message));
                });
                if (that.readyState === 1)
                    that.listener(that.pollingId);
            });
        };
        WebSocket.prototype.MessageWrapper = function (data) {
            var message = {
                type: "message",
                data: JSON.stringify(data)
            };
            return message;
        };
        WebSocket.prototype.isFallback = true;
        WebSocket.prototype.readyState = 0;
        WebSocket.prototype.send = function (data) {
            if (data instanceof XSockets.Message) data = data.toString();
            var that = this;
            var result = this.http.post("/API/XSocketsWebApi", {
                pollingId: that.pollingId,
                data: data
            }, function (err) {
                that.onerror(err);
            });
            return result;
        };
        WebSocket.prototype.onmessage = function (data) { };
        WebSocket.prototype.onopen = function (data) { };
        WebSocket.prototype.onerror = function (error) { };
        WebSocket.prototype.onclose = function (reason) { };
        WebSocket.prototype.close = function () {
            this.readyState = 0;
            this.onclose({});
        };
        return WebSocket;
    })();
}
var XSockets = {
    Version: "5.0.1",
    Events: {
        init: "1",
        ping: "7",
        pong: "8",
        controller: {
            onError: "4",
            onOpen: "2",
            onClose: "3",
        },
        storage: {
            set: "s1",
            get: "s2",
            clear: "s4",
            remove: "s3",
        },
        pubSub: {
            subscribe: "5",
            unsubscribe: "6",
        }
    },
    Utils: {
        longToByteArray: function (long) {
            var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
            for (var index = 0; index < byteArray.length; index++) {
                var byte = long & 0xff;
                byteArray[index] = byte;
                long = (long - byte) / 256;
            }
            return byteArray;
        },
        stringToBuffer: function (string) {
            var i, len = string.length,
                arr = new Array(len);
            for (i = 0; i < len; i++) {
                arr[i] = string.charCodeAt(i) & 0xFF;
            }
            return new Uint8Array(arr).buffer;
        },
        parseUri: function (url) {
            var uriParts = {};
            var uri = {
                port: 80,
                relative: "/"
            };
            var keys = ["url", "scheme", "host", "domain", "port", "fullPath", "path", "relative", "controller", "query"],
                parser = /^(?:([^:\/?#]+):)?(?:\/\/(([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?)/;
            var result = url.match(parser);
            for (var i = 0; i < keys.length; i++) {
                uriParts[keys[i]] = result[i];
            }
            uriParts.rawQuery = uriParts.query || "";
            if (!uriParts.query) {
                uriParts.query = {};
            } else {
                var stack = {};
                var arrQuery = uriParts.query.split("&");
                for (var q = 0; q < arrQuery.length; q++) {
                    var keyValue = arrQuery[q].split("=");
                    stack[keyValue[0]] = keyValue[1];
                }
                uriParts.query = stack;
            }
            uriParts = XSockets.Utils.extend(uri, uriParts);
            uriParts.absoluteUrl = uriParts.scheme + "://" + uriParts.domain + ":" + uriParts.port + uri.relative + uriParts.controller;
            return uriParts;
        },
        randomString: function (x) {
            var s = "";
            while (s.length < x && x > 0) {
                var r = Math.random();
                s += String.fromCharCode(Math.floor(r * 26) + (r > 0.5 ? 97 : 65));
            }
            return s;
        },
        getParameterByName: function (name) {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regexS = "[\\?&]" + name + "=([^&#]*)";
            var regex = new RegExp(regexS);
            var results = regex.exec(window.location.search);
            if (results === null) return "";
            else return decodeURIComponent(results[1].replace(/\+/g, " "));
        },
        extend: function (obj, extObj) {
            if (arguments.length > 2) {
                for (var a = 1; a < arguments.length; a++) {
                    this.extend(obj, arguments[a]);
                }
            } else {
                for (var i in extObj) {
                    obj[i] = extObj[i];
                }
            }
            return obj;
        },
        guid: function (a, b) {
            for (b = a = ''; a++ < 36; b += a * 51 & 52 ? (a ^ 15 ? 8 ^ Math.random() * (a ^ 20 ? 16 : 4) : 4).toString(16) : '-');
            return b;
        }
    }
};
XSockets.ClientInfo = (function () {
    function clientInfo(connectionId, persistentId, controller) {
        if (arguments.length === 1) {
            this.controller = arguments[0];
        } else {
            this.persistentId = persistentId;
            this.connectionId = connectionId;
            this.controller = controller;
            localStorage.setItem(this.controller, JSON.stringify(this));
        }
    }
    clientInfo.prototype.get = function () {
        return localStorage.getItem(this.controller);
    };
    return clientInfo;
})();
XSockets.BinaryMessage = (function () {
    function binaryMessage(message, arrayBuffer, cb) {
        /// <summary>Create a new XSockets.BinaryMessage</summary>
        /// <param name="message" type="Object">XSockets.Message</param>
        /// <param name="arrayBuffer" type="Object">buffer</param>
        /// <param name="cb">callback function to be invoked when BinaryMessage is created</param>
        if (!window.Uint8Array) throw ("Unable to create a XSockets.BinaryMessage, the browser does not support Uint8Array");
        if (message) {
            this.createBuffer(message.toString(), arrayBuffer);
            if (cb) cb(this);
        }
    }
    binaryMessage.prototype.stringToBuffer = function (str) {
        /// <summary>convert a string to a byte buffer</summary>
        /// <param name="str" type="String"></param>
        var i, len = str.length,
            arr = new Array(len);
        for (i = 0; i < len; i++) {
            arr[i] = str.charCodeAt(i) & 0xFF;
        }
        return new Uint8Array(arr).buffer;
    };
    binaryMessage.prototype.appendBuffer = function (a, b) {
        /// <summary>Returns a new Uint8Array array </summary>
        /// <param name="a" type="arrayBuffer">buffer A</param>
        /// <param name="b" type="arrayBuffer">buffer B</param>
        var c = new Uint8Array(a.byteLength + b.byteLength);
        c.set(new Uint8Array(a), 0);
        c.set(new Uint8Array(b), a.byteLength);
        return c.buffer;
    };
    binaryMessage.prototype.extractMessage = function (message, cb) {
        var ab2str = function (buf) {
            return String.fromCharCode.apply(null, new Uint16Array(buf));
        };
        var byteArrayToLong = function (byteArray) {
            var value = 0;
            for (var i = byteArray.byteLength - 1; i >= 0; i--) {
                value = (value * 256) + byteArray[i];
            }
            return parseInt(value);
        };
        var header = new Uint8Array(message, 0, 8);
        var payloadLength = byteArrayToLong(header);
        var offset = parseInt(8 + byteArrayToLong(header));
        var buffer = new Uint8Array(message, parseInt(offset), message.byteLength - offset);
        var str = new Uint8Array(message, 8, payloadLength);
        var result = (new XSockets.Message()).parse(ab2str(str), buffer);
        result.data = typeof result.data === "object" ? result.data : JSON.parse(result.data);
        cb(result);
        return this;
    }
    binaryMessage.prototype.createBuffer = function (payload, buffer) {
        this.header = new Uint8Array(XSockets.Utils.longToByteArray(payload.length));
        this.buffer = this.appendBuffer(this.appendBuffer(this.header, this.stringToBuffer(payload)), buffer);
        return this;
    };
    return binaryMessage;
})();
XSockets.Subscriptions = (function () {
    var subscriptions = function (arrSubscriptions) {
        this._subscriptions = arrSubscriptions || [];
        Object.defineProperty(this._subscriptions, 'find', {
            enumerable: false,
            configurable: true,
            writable: true,
            value: function (predicate) {
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function');
                }
                var list = Object(this);
                var length = list.length >>> 0;
                var thisArg = arguments[1];
                var value;
                for (var i = 0; i < length; i++) {
                    if (i in list) {
                        value = list[i];
                        if (predicate.call(thisArg, value, i, list)) {
                            return value;
                        }
                    }
                }
                return undefined;
            }
        });
        Object.defineProperty(this._subscriptions, 'findIndex', {
            enumerable: false,
            configurable: true,
            writable: true,
            value: function (predicate) {
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function');
                }
                var list = Object(this);
                var length = list.length >>> 0;
                var thisArg = arguments[1];
                var value;
                for (var i = 0; i < length; i++) {
                    if (i in list) {
                        value = list[i];
                        if (predicate.call(thisArg, value, i, list)) {
                            return i;
                        }
                    }
                }
                return -1;
            }
        });
    };
    subscriptions.prototype.get = function (predicate) {
        return this._subscriptions.find(predicate);
    };
    subscriptions.prototype.add = function (subscription) {
        this._subscriptions.push(subscription);
        return this;
    };
    subscriptions.prototype.remove = function (topic) {
        var index = this._subscriptions.findIndex(function (subscription) {
            return subscription.topic === topic;
        });
        if (index >= 0) this._subscriptions.splice(index, 1);
        return this;
    };
    subscriptions.prototype.getAll = function () {
        return this._subscriptions;
    };
    return subscriptions;
})();
XSockets.Message = (function () {
    function message(topic, object, controller) {
        this.T = topic ? topic.toLowerCase() : undefined;
        this.D = object;
        this.C = controller ? controller.toLowerCase() : undefined;
        this.JSON = {
            T: topic,
            D: JSON.stringify(object),
            C: controller
        };
    }
    message.prototype.parse = function (text, binary) {
        var data = JSON.parse(text);
        var d = {
            topic: data.T,
            controller: data.C,
            data: JSON.parse(data.D),
            binary: binary
        };
        return d;
    };
    message.prototype.toString = function () {
        return JSON.stringify(this.JSON);
    };
    return message;
})();
XSockets.Communcation = (function () {
    var communicationInstance = null;
    var createCommunication = function (url, events, subprotocol, controllers) {
        var queue = [];
        var webSocket;
        // detect if we are running on a native WebSocket.
        // Looking for '[native code]' in most browsers and for [object WebSocketConstructor] in Safari and on iOS
        var websocketTest = window.WebSocket.toString();
        if (websocketTest.indexOf('[native code]') > -1 || websocketTest.indexOf('[object WebSocketConstructor]') > -1) {
            webSocket = new window.WebSocket(url, subprotocol);
        } else {

            webSocket = new window.WebSocket(url, controllers);
        }
        webSocket.binaryType = "arraybuffer";
        webSocket.onmessage = events.onmessage;
        webSocket.onclose = events.onclose;
        webSocket.onopen = function (m) {
            for (var i = 0; i < queue.length; i++) {
                send(queue[i]);
            }
            queue = [];
            events.onopen(m);
        };
        var instanceId = function () {
            return XSockets.Utils.guid();
        };
        var send = function (d) {
            if (webSocket.readyState === 0) {
                queue.push(d);
            } else if (webSocket.readyState === 1) return webSocket.send(d);
        };
        var close = function () {
            communicationInstance = null;
            webSocket.close();
        };
        var readyState = function () {
            return webSocket.readyState;
        };
        var getClientType = function () {
            return "WebSocket" in window && window.WebSocket.CLOSED > 2 ? "RFC6455" : "fallback";
        }();
        return {
            send: send,
            instanceId: instanceId(),
            clientType: getClientType,
            readyState: readyState,
            close: close,
            binaryType: function (type) {
                webSocket.binaryType = type;
            },
            getWebSocket: function () {
                return webSocket;
            }
        };
    };
    return {
        getInstance: function (url, events, subprotocol, force, controllers) {
            if (communicationInstance === null || force) {
                return createCommunication(url, events, subprotocol, controllers);
            }
            return communicationInstance;
        }
    };
})();
XSockets.Controller = (function () {
    var instance = function (name, webSocket, subscriptions) {
        this.promises = {};
        this.webSocket = webSocket;
        this.instanceId = XSockets.Utils.guid();
        this.subscriptions = new XSockets.Subscriptions(subscriptions), this.clientInfo = new XSockets.ClientInfo(name);
        this.name = name.toLowerCase();
    };
    instance.prototype.close = function () {
        this.webSocket.send(new XSockets.Message(XSockets.Events.controller.onClose, {}, this.name));
        return this;
    };
    instance.prototype.storageGet = function (key, cb) {
        var p = XSockets.Events.storage.get + ":" + key;
        var deferd = new XSockets.Deferred();
        this.promises[p] = deferd;
        this.webSocket.send(new XSockets.Message(XSockets.Events.storage.get, {
            K: key
        }, this.name));
        if (cb) {
            this.promises[p].promise.then(cb);
        }
        return this.promises[p].promise;
    };
    instance.prototype.addSubscriptions = function (subscriptions) {
        this.subscriptions = new XSockets.Subscriptions(subscriptions);
    }
    instance.prototype.storageRemove = function (key, cb) {
        var p = XSockets.Events.storage.remove + ":" + key;
        var deferd = new XSockets.Deferred();
        this.promises[p] = deferd;
        this.webSocket.send(new XSockets.Message(XSockets.Events.storage.remove, {
            K: key
        }, this.name));
        if (cb) {
            this.promises[p].promise.then(cb);
        }
        return this.promises[p].promise;
    };
    instance.prototype.storageClear = function (cb) {
        var p = XSockets.Events.storage.clear + ":" + XSockets.Utils.randomString(8);
        var deferd = new XSockets.Deferred();
        this.promises[p] = deferd;
        this.webSocket.send(new XSockets.Message(XSockets.Events.storage.clear, {}, this.name));
        if (cb) {
            this.promises[p].promise.then(cb);
        }
        return this.promises[p].promise;
    };
    instance.prototype.storageSet = function (key, value) {
        var p = XSockets.Events.storage.set + ":" + key;
        var deferd = new XSockets.Deferred();
        this.promises[p] = deferd;
        this.webSocket.send(new XSockets.Message(XSockets.Events.storage.set, {
            K: key,
            V: typeof (value) === "object" ? JSON.stringify(value) : value
        }, this.name));
        return this.promises[p].promise;
    };
    instance.prototype.setProperty = function (name, value) {
        var property = "set_" + name.toLowerCase();
        var data;
        if (value instanceof Array) {
            data = {
                value: value
            };
        } else if (value instanceof Object) {
            data = value;
        } else {
            data = {
                value: value
            };
        }
        this.publish(new XSockets.Message(property, data, this.name));
    };
    instance.prototype.setEnum = function (name, value) {
        var property = "set_" + name.toLowerCase();
        this.publish(new XSockets.Message(property, value, this.name));
    };
    instance.prototype.addListener = function (topic, delagate) {
        this.subscriptions.add(new XSockets.Subscription(topic, delagate));
    };
    instance.prototype.addListeners = function (arrListeners) {
        var that = this;
        var deferd = new XSockets.Deferred();
        var p = new XSockets.Utils.guid();
        this.promises[p] = deferd;
        if (arrListeners instanceof Array) {
            arrListeners.forEach(function (listener) {
                that.subscriptions.add(listener);
            });
            if (this.webSocket.clientType === "fallback") {
                var topics = arrListeners.map(function (t) {
                    return {
                        T: t.topic,
                        A: false
                    };
                })
                var result = this.notifyFallback(that.name, topics);
                if (result.hasOwnProperty("success")) {
                    result.success(function () {
                        that.promises[p].resolve(arrListeners);
                    });
                };
            } else {
                that.promises[p].resolve(arrListeners);
            }
        }
        return this.promises[p].promise;
    };
    instance.prototype.onopen = undefined;
    instance.prototype.onclose = undefined;
    instance.prototype.onmessage = undefined;
    instance.prototype.onerror = undefined;
    instance.prototype.invokeBinary = function (topic, arrayBuffer, data) {
        topic = topic.toLowerCase();
        var bm = new XSockets.BinaryMessage(new XSockets.Message(topic, data, this.name), arrayBuffer);
        this.publish(bm);
        return this;
    };
    instance.prototype.invoke = function (topic, data, cb) {
        topic = topic.toLowerCase();
        var defered = new XSockets.Deferred();
        this.publish(topic, data, cb);
        this.promises[topic] = defered;
        return this.promises[topic].promise;
    };
    instance.prototype.publish = function (topic, json, callback) {
        if (topic instanceof XSockets.BinaryMessage) {
            if (arguments.length === 2) {
                json();
            }
            return this.webSocket.send(arguments[0].buffer);
        } else if (topic instanceof XSockets.Message) {
            if (arguments.length > 1 && typeof (arguments[1]) === "function") {
                json();
            }
            return this.webSocket.send(topic.toString());
        }
        if (typeof (topic) === "string") {
            if (arguments.length > 2 && typeof (callback) === "function") {
                callback();
            }
            return this.webSocket.send(new XSockets.Message(topic, json, this.name).toString());
        }
    };
    instance.prototype.subscribe = function (topic, delagate, cb) {
        this.publish(new XSockets.Message(XSockets.Events.pubSub.subscribe, {
            T: topic,
            A: cb ? true : false
        }, this.name));
        if (cb) this.addListener("__" + topic, cb);
        this.subscriptions.add(new XSockets.Subscription(topic, delagate));
        return this;
    };
    instance.prototype.notifyFallback = function (ctrl, topic) {
        return this.webSocket.send(new XSockets.Message("0x12e", topic, ctrl).toString());
    };
    instance.prototype.on = function (topic, delagate) {
        var ctrl = this.name;
        var listener = this.addListener(topic, delagate, ctrl);

        if (this.webSocket.clientType === "fallback") {
            return this.notifyFallback(ctrl, [{
                T: topic,
                A: false
            }]);
        };
        return listener;
    };

    instance.prototype.disposeListener = function (topic, cb) {
        topic = topic.toLowerCase();
        this.subscriptions.remove(topic);
        if (this.hasOwnProperty(topic)) delete this[topic];
        if (cb) cb();
        return this;
    };
    instance.prototype.many = function (topic, count, delagate, cb) {
        this.publish(new XSockets.Message(XSockets.Events.pubSub.subscribe, {
            T: topic,
            A: cb ? true : false
        }, this.name));
        if (cb) this.addListener("__" + topic, cb);
        this.subscriptions.add(new XSockets.Subscription(topic, delagate, count));
        return this;
    };
    instance.prototype.unsubscribe = function (topic, controller) {
        topic = topic.toLowerCase();
        this.publish(new XSockets.Message(XSockets.Events.pubSub.unsubscribe, {
            T: topic
        }, controller || this.name));
        this.subscriptions.remove(topic);
        return this;
    };
    instance.prototype.one = function (topic, delagate, cb) {
        this.many(topic, 1, delagate, cb);
        return this;
    };
    instance.prototype.onopen = undefined;
    instance.prototype.onclose = undefined;
    instance.prototype.onmessage = undefined;
    instance.prototype.onerror = undefined;
    return instance;
})();
XSockets.ControllerFactory = (function () {
    var factory = function () {
        var uniqueName = function (arr, fn) {
            var unique = {};
            var distinct = [];
            arr.forEach(function (x) {
                var key = fn(x);
                if (!unique[key]) {
                    distinct.push(key);
                    unique[key] = true;
                }
            });
            return distinct;
        }
        this.registeredControllers = [];
        this.getUnique = function () {
            return uniqueName(this.registeredControllers, function (q) {
                return q.name;
            });
        }
        this.findByAlias = function (f) {
            var filtered = this.registeredControllers.filter(function (match) {
                return match.alias == f;
            });
            return filtered[0];
        };
        this.find = function (name, alias) {
            alias = (alias || "");
            return this.registeredControllers.filter(function (match) {
                return match.alias == alias && match.name == name;
            });
        };
        this.add = function (c) {
            this.registeredControllers.push(c);
        };
        this.findByName = function (name) {
            return this.registeredControllers.filter(function (c) {
                return c.name == name;
            });
        };
        this.get = function (name, fn) {
            this.findByName(nam).forEach(function (ctrl, index) {
                fn(ctrl, index);
            });
        };
    };
    return factory;
})();
XSockets.WebSocket = (function () {
    function instance(url, controllers, parameters) {
        var self = this;

        this.instanceId = XSockets.Utils.guid();

        this.controllerFactory = new XSockets.ControllerFactory();
        this.promises = {};
        this.uri = XSockets.Utils.parseUri(url);
        var params = XSockets.Utils.extend(self.uri.query, parameters ? parameters : {});
        this.settings = XSockets.Utils.extend({
            autoReconnect: {
                enabled: false,
                timeOut: 5000,
                interval: 0,
            },
            parameters: params,
            subprotocol: "XSocketsNET",
            queryString: function () {
                var str = "?";
                for (var key in this.parameters) {
                    str += key + '=' + encodeURIComponent(this.parameters[key]) + '&';
                }
                str = str.slice(0, str.length - 1);
                return str;
            }
        }, {});
        if (localStorage.getItem(this.uri.absoluteUrl)) {
            this.settings.parameters["persistentId"] = localStorage.getItem(this.uri.absoluteUrl);
        }
        this.getInstace = function (a, b, c, d) {
            return XSockets.Communcation.getInstance(a, {
                onmessage: function (messageEvent) {

                    if (typeof messageEvent.data === "string") {
                        var msg = (new XSockets.Message()).parse(messageEvent.data);

                        if (msg.topic == XSockets.Events.ping) {                            
                            self.webSocket.send("{'T':'"+XSockets.Events.pong+"','D':'" + msg.data + "','C':''}")
                            return;
                        }

                        if (msg.topic === XSockets.Events.onError) {
                            if (self.onerror) self.onerror(msg.data);
                            self.dispatchMessage(XSockets.Events.onError, msg, msg.controller);
                        } else {
                            self.dispatchMessage(msg.topic, msg.data, msg.controller);
                        }
                    } else {
                        if (typeof (messageEvent.data) === "object") {

                            var bm = new XSockets.BinaryMessage();
                            bm.extractMessage(messageEvent.data, function (message) {
                                self.dispatchMessage(message.topic, message, message.controller.toLowerCase());
                            });
                        }
                    }
                },
                onopen: function (connection) {
                    if (self.onconnected)
                        self.onconnected(connection);
                },
                onclose: function (reason) {
                    if (self.ondisconnected) self.ondisconnected(reason);
                    if (self.settings.autoReconnect.enabled && self.settings.autoReconnect.interval === 0) {
                        self.settings.autoReconnect.interval = window.setTimeout(function () {
                            self.settings.autoReconnect.interval = 0;
                            self.reconnect();
                        }, self.settings.autoReconnect.timeOut);
                    };
                },
                onerror: function (error) {
                    if (self.onerror) self.onerror(error);
                }
            }, b, c, d);
        };
        this.webSocket = self.getInstace(this.uri.absoluteUrl + this.settings.queryString(), this.settings.subprotocol, false, controllers);
        this.disconnect = function () {
            this.webSocket.close();
        };
        var registerContollers = function (arrControllers) {
            arrControllers.forEach(function (ctrl) {
                ctrl = ctrl.toLowerCase();
                self.controller(ctrl);
            });
        };
        this.reconnect = function (fn) {
            var subscriptions = {};
            var controllersRegistred = this.controllerFactory.registeredControllers.map(function (c) {
                var p = c.name;
                subscriptions[p] = c.ctrl.subscriptions._subscriptions;
                return c;
            });
            self.webSocket = self.getInstace(this.uri.absoluteUrl + this.settings.queryString(), this.settings.subprotocol, true, controllersRegistred);
            var temp = self.controllerFactory.registeredControllers;
            self.controllerFactory.registeredControllers = [];
            temp.forEach(function (a) {
                var b = self.controller(a.name);
                b.addSubscriptions(subscriptions[a.name]);
                b.webSocket = self.webSocket;
            });
            if (fn) fn.apply(this);
        };
        this.controller = function (name, alias) {
            var ctrl = name.toLowerCase();
            var isRegistred = self.controllerFactory.find(ctrl, alias).length > 0;

            if (!isRegistred) {
                var controllerWrapper = (function (_name, _obj, _alias) {
                    this.alias = _alias || "";
                    this.name = _name,
                    this.ctrl = _obj;
                });
                var registeredController = new controllerWrapper(ctrl, new XSockets.Controller(ctrl, self.webSocket), alias);
                self.controllerFactory.add(registeredController);

                self.webSocket.send(new XSockets.Message(XSockets.Events.init, {
                    init: true
                }, ctrl).toString());

                registeredController.ctrl.addListener(XSockets.Events.controller.onClose, function (connection) {
                    var clientInfo = new XSockets.ClientInfo(connection.CI, connection.PI, connection.C);
                    if (registeredController.ctrl.onclose) registeredController.ctrl.onclose(clientInfo);
                }, registeredController.name);

                registeredController.ctrl.addListener(XSockets.Events.controller.onOpen, function (connection) {
                    if (connection.hasOwnProperty("ClientInfo")) {
                        connection = connection.ClientInfo;
                    }
                    var clientInfo = new XSockets.ClientInfo(connection.CI, connection.PI, connection.C);
                    registeredController.ctrl.clientInfo = clientInfo;
                    if (registeredController.ctrl.onopen) registeredController.ctrl.onopen(clientInfo);
                    localStorage.setItem(self.uri.absoluteUrl, clientInfo.persistentId);

                }, registeredController.name);
                registeredController.ctrl.addListener(XSockets.Events.controller.onError, function (error) {
                    if (registeredController.ctrl.onerror)
                        registeredController.ctrl.onerror(error.data);
                    if (self.onerror) self.onerror(error);
                }, registeredController.name);
                return registeredController.ctrl;
            } else {
                return self.controllerFactory.findByName(ctrl)[0].ctrl;
            }
        };
        this.dispatchMessage = function (topic, message, controller) {
            self.controllerFactory.findByName(controller).forEach(function (match) {
                var subscription = match.ctrl.subscriptions.get(function (sub) {
                    return sub.topic === topic;
                });
                if (subscription) {
                    subscription.fire(message, function (sub) {
                        match.ctrl.unsubscribe(sub.topic, match.name);
                    });
                }
                if (match.ctrl.promises.hasOwnProperty(topic)) {
                    match.ctrl.promises[topic].resolve(message);
                }
                if (match.ctrl.hasOwnProperty(topic)) {
                    match.ctrl[topic].call(this, message);
                }
                if (match.ctrl.onmessage) match.ctrl.onmessage(message, topic, match.name);
            });
        };

        registerContollers(controllers || [(this.uri.controller).toLowerCase()]);

    }
    instance.prototype.onconnected = function () { }
    instance.prototype.ondisconnected = function () { }
    instance.prototype.onerror = function () { };
    instance.prototype.autoReconnect = function (isEnabled) {
        this.settings.autoReconnect.enabled = isEnabled || !this.settings.autoReconnect.enabled;
        return this;
    };
    instance.prototype.setAutoReconnect = function (timeout) {
        this.settings.autoReconnect.timeOut = timeout || 5000;
        this.settings.autoReconnect.enabled = true;
        return this;
    };
    return instance;
})();
XSockets.Promise = (function () {
    var promise = function (cb) {
        this.addCallback = cb;
    };
    promise.prototype.then = function (fn) {
        var dfd = new XSockets.Deferred();
        this.addCallback(function () {
            var result = fn.apply(null, arguments);
            if (result instanceof XSockets.Promise) result.addCallback(dfd.resolve);
            else dfd.resolve(result);
        });
        return dfd.promise;
    };
    return promise;
})();
XSockets.Deferred = (function () {
    function deferred() {
        var callbacks = [],
            result;
        this.resolve = function () {
            if (result) return;
            result = arguments;
            for (var c; c = callbacks.shift() ;)
                c.apply(null, result);
        };
        this.promise = new XSockets.Promise(function add(c) {
            if (result) c.apply(null, result);
            else callbacks.push(c);
        });
    }
    return deferred;
})();
XSockets.Subscription = (function () {
    function subscription(topic, delagate, count, completed) {
        this.topic = topic.toLowerCase();
        this.delagate = delagate;
        this.fire = function (obj, cb) {
            this.delagate.call(this, obj, topic);
            if (this.count) {
                this.count--;
                if (this.count === 0) cb(this);
            }
        };
        this.count = count;
        this.completed = completed;
    }
    return subscription;
})();
XSockets.HttpFallback = (function () {
    var ajax = function () {
        var self = this;

        this.getJSON = "jQuery" in window ? jQuery.getJSON : function (url, data, cb) {
            var request = new XMLHttpRequest();
            request.open("GET", url + self.createQueryString(data), true);
            request.setRequestHeader('Content-Type', 'application/json');
            request.onreadystatechange = function () {
                if (request.status == 200 && request.readyState === 4) {
                    if (cb) cb(JSON.parse(this.responseText));
                }
            };
            request.send();
            return request;
        }
        this.post = "jQuery" in window ? jQuery.post : function (url, data, cb) {
            var request = new XMLHttpRequest();
            request.open("POST", url, true);
            request.setRequestHeader('Content-Type', 'application/json');
            request.onreadystatechange = function () {
                if (request.status == 200 && request.readyState === 4) {
                    if (cb) cb(JSON.parse(this.responseText));
                }
            };
            return request.send(JSON.stringify(data));

        };
        this.createQueryString = function (p) {
            var str = "?";
            for (var key in p) {
                str += key + '=' + encodeURIComponent(p[key]) + '&';
            }
            str = str.slice(0, str.length - 1);
            return str;
        };
        this.onerror = function () { };
    };
    return ajax;
})();