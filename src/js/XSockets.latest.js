var forceFallback = forceFallback || false;




if ("WebSocket" in window === forceFallback) {
    window.WebSocket = (function () {

        function WebSocket(url, subprotocol, controllers) {
            var that = this;
            this.http = new XSockets.HttpFallback();
            this.clientInfo = new XSockets.ClientInfo();
            this.http.get("/API/XSocketsWebApi?url=" + url + "&controllers=" + controllers.join(','), {}, function (result) {
                that.readyState = 1;
                result.forEach(function (c) {
                    var clientInfo = JSON.parse(c.D).ClientInfo;
                    that.onmessage(new that.MessageWrapper(c));
                    that.clientInfo = new XSockets.ClientInfo(clientInfo.CI, clientInfo.PI, clientInfo.C);
                });
                that.onopen();
                that.listener();
            });

        };
        WebSocket.prototype.listener = function () {
            var that = this;
            this.http.post("/API/XSocketsWebApi?persistentId=" + this.clientInfo.persistentId, {}, function (result) {
                (JSON.parse(result) || []).forEach(function (message) {
                    that.onmessage(new that.MessageWrapper(message));
                });
                that.listener();
            });
        };
        WebSocket.prototype.MessageWrapper = function (data) {
            return {
                type: "message",
                data: JSON.stringify(data)
            };
        };
        WebSocket.prototype.isFallback = true;
        WebSocket.prototype.readyState = 0;
        WebSocket.prototype.send = function (data) {
            var client = this.clientInfo;
            var msg = JSON.parse(data);
            if (msg.T == XSockets.Events.pubSub.unsubscribe) {
                this.http.get("/API/XSocketsWebApi", {
                    persistentId: client.persistentId,
                    action: XSockets.Events.pubSub.unsubscribe,
                    data: JSON.parse(msg.D).T,
                    controller: msg.C
                }, function (result) { });
            } else if (msg.T == XSockets.Events.pubSub.subscribe) {
                this.http.get("/API/XSocketsWebApi", {
                    persistentId: client.persistentId,
                    action: XSockets.Events.pubSub.subscribe,
                    data: JSON.parse(msg.D).T,
                    controller: msg.C
                }, function (result) { });
            } else {
                this.http.post("/API/XSocketsWebApi", {
                    PersistentId: client.persistentId,
                    Data: JSON.stringify(msg),
                    Controller: msg.C
                }, function () { });
            }
        };

        WebSocket.prototype.onmessage = function (data) { };
        WebSocket.prototype.onopen = function (data) { };
        WebSocket.prototype.onerror = function (error) { };
        return WebSocket;
    })();
}

var XSockets = {
    Version: "4.0",
    Events: {
        onError: "0x1f4",
        onOpen: "0xc8",
        onClose: "0xcb",
        init: "0xcc",
        controller: {
            onError: "0x1f4",
            onOpen: "0x14",
            onClose: "0x15",
        },
        storage: {
            set: "0x190",
            get: "0x191",
            clear: "0x192",
            remove: "0x193"
        },
        pubSub: {
            subscribe: "0x12c",
            unsubscribe: "0x12d"
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
            if (results == null)
                return "";
            else
                return decodeURIComponent(results[1].replace(/\+/g, " "));
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
        }
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
        if (index >= 0)
            this._subscriptions.splice(index, 1);
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
    var communicationInstance;
    var createCommunication = function (url, events, subprotocol, controllers) {
        var queue = [];
        var webSocket;
        try {
            webSocket = new window.WebSocket(url, subprotocol, controllers);
        } catch (err) {
            webSocket = new window.WebSocket(url, subprotocol);
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
            } else
                if (webSocket.readyState === 1)
                    webSocket.send(d);
        };
        var close = function () {
            webSocket.close();
        };
        var readyState = function () {
            return webSocket.readyState;
        };
        var getClientType = function () {
            if (window.WebSocket.hasOwnProperty("isFallback")) return "Fallback";
            return "WebSocket" in window && window.WebSocket.CLOSED > 2 ? "RFC6455" : "Hixie";
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

            if (!communicationInstance || force) {
                communicationInstance = createCommunication(url, events, subprotocol, controllers);
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
        this.subscriptions = new XSockets.Subscriptions(subscriptions),
        this.clientInfo = new XSockets.ClientInfo(name);
        this.name = name.toLowerCase();
    };

    instance.prototype.close = function (cb) {
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
        /// <summary>
        ///    Set a property on the connected controller
        /// </summary>
        /// <param name="name" type="string">
        ///     Name of the property to set
        /// </param> 
        /// <param name="value" type="object">
        ///     Value of the property (string,number,array,object)
        /// </param> 
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
        /// <summary>
        ///    Set a property (Enum) on the connected controller
        /// </summary>
        /// <param name="name" type="string">
        ///     Name of the property to set
        /// </param> 
        /// <param name="value" type="object">
        ///     Value of the property (Enum)
        /// </param> 
        var property = "set_" + name.toLowerCase();
        this.publish(new XSockets.Message(property, value, this.name));
    };
    instance.prototype.addListener = function (topic, delagate) {
        this.subscriptions.add(new XSockets.Subscription(topic, delagate));
    };
    instance.prototype.onopen = undefined;
    instance.prototype.onclose = undefined;
    instance.prototype.onmessage = undefined;
    instance.prototype.onerror = undefined;
    instance.prototype.invokeBinary = function (topic, arrayBuffer, data) {
        topic = topic.toLowerCase();
        var bm = new XSockets.BinaryMessage(new XSockets.Message(topic,
            data || {}, this.name), arrayBuffer);
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
            this.webSocket.send(arguments[0].buffer);
            if (arguments.length === 2) {
                json();
            }
        } else if (topic instanceof XSockets.Message) {

            this.webSocket.send(topic.toString());
            if (arguments.length > 1 && typeof (arguments[1]) === "function") {
                json();
            }
        }
        if (typeof (topic) === "string") {

            this.webSocket.send(new XSockets.Message(topic, json || {}, this.name).toString());
            if (arguments.length > 2 && typeof (callback) === "function") {
                callback();
            }
        }
        return this;
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
    instance.prototype.on = function (topic, delagate) {
        this.addListener(topic, delagate, this.name);
        return this;
    };
    instance.prototype.disposeListener = function (topic, cb) {
        topic = topic.toLowerCase();
        this.subscriptions.remove(topic);
        if (this.hasOwnProperty(topic))
            delete this[topic];
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

XSockets.WebSocket = (function () {

    function instance(url, controllers, parameters) {
        var self = this;
        this._args = arguments;
        this.promises = {};
        this.controllerInstances = [];
        this.uri = XSockets.Utils.parseUri(url);

        var params = XSockets.Utils.extend(self.uri.query, parameters ? parameters : {});

        this.settings = XSockets.Utils.extend({
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
                        if (msg.topic === XSockets.Events.onError) {
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
                    if (self.onconnected) self.onconnected(connection);
                    self.controllerInstances.forEach(function (ctrl) {

                        var json = new XSockets.Message(XSockets.Events.init, {
                            init: true
                        }, ctrl).toString();
                        self.webSocket.send(json);
                    });
                },
                onclose: function (reason) {

                    if (self.ondisconnected) self.ondisconnected(reason);

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
        var registerContollers = function (arrControllers,subscriptions,delagates) {
            self.controllerInstances = [];
            arrControllers.forEach(function (ctrl) {
                ctrl = ctrl.toLocaleLowerCase();
                self.controllerInstances.push(ctrl);
                if (self.hasOwnProperty(ctrl)) {
                    delete self[ctrl];
                }
                if (subscriptions) {
                    self[ctrl] = new XSockets.Controller(ctrl, self.webSocket, subscriptions[ctrl]);
                    if (delagates) {
                        self[ctrl].onopen = delagates[ctrl].onopen || new Function();
                        self[ctrl].onclose = delagates[ctrl].onclose || new Function();
                        self[ctrl].onerror = delagates[ctrl].onerror || new Function();
                    }
                } else {
                    self[ctrl] = new XSockets.Controller(ctrl, self.webSocket);


                    self[ctrl].addListener(XSockets.Events.controller.onClose, function (connection) {
                        var clientInfo = new XSockets.ClientInfo(connection.CI, connection.PI, connection.C);
                        if (self.hasOwnProperty(clientInfo.controller)) {
                            if (self[clientInfo.controller].onclose)
                                self[clientInfo.controller].onclose(clientInfo);
                        }
                    }, ctrl);


                    self[ctrl].addListener(XSockets.Events.controller.onOpen, function (connection) {
                        
                        if (connection.hasOwnProperty("ClientInfo")) {
                            connection = connection.ClientInfo;
                        }

                        var clientInfo = new XSockets.ClientInfo(connection.CI, connection.PI, connection.C);
                        self[ctrl].clientInfo = clientInfo;
                        if (self.hasOwnProperty(clientInfo.controller)) {

                           
                            if (self[clientInfo.controller].onopen)
                                self[clientInfo.controller].onopen(clientInfo);
                           
                        }
                        localStorage.setItem(self.uri.absoluteUrl, clientInfo.persistentId);
                    }, ctrl);

                    self[ctrl].addListener(XSockets.Events.controller.onError, function (error) {
                        if (self.hasOwnProperty(error.controller) && self[error.controller].onerror) {
                            self[error.controller].onerror(error.data);
                        }
                        if (self.onerror) self.onerror(error);
                    }, ctrl);
                }
                });
           
        };
        this.reconnect = function (fn) {
            if (this.webSocket.readyState() === 1) return;
            var subscriptions = {}, delegates = {};
            self.controllerInstances.forEach(function(p) {
                subscriptions[p] = self[p].subscriptions._subscriptions;
                delegates[p] = {
                    onopen: self[p].onopen,
                    onclose: self[p].onclose,
                    onerror: self[p].onerror
            }
            });
            self.webSocket = self.getInstace(this.uri.absoluteUrl + this.settings.queryString(), this.settings.subprotocol, true);
            registerContollers(self.controllerInstances, subscriptions,delegates);
           
            if (fn) fn();
        };

        this.controller = function (controller) {
            var find = controller.toLowerCase();
            if (!self.hasOwnProperty(find)) throw "The controller you specified '" +find  + "',can not be found.";
            return self[find];
        };
        this.dispatchMessage = function (eventName, message, controller) {
          
            if (!controller) return;
            var subscription = self[controller].subscriptions.get(function (sub) {
                return sub.topic === eventName;
            });
            if (subscription) {
                subscription.fire(message, function (event) {
                    self[controller].unsubscribe(event.topic, controller);
                });
            }
            if (self[controller].promises.hasOwnProperty(eventName)) {
                self[controller].promises[eventName].resolve(message);
            }
            if (self[controller].hasOwnProperty(eventName)) {
                self[controller][eventName].call(this, message);
            }
           
            if (self[controller].onmessage) self[controller].onmessage(message, eventName,controller)
        };
        registerContollers(controllers || [(this.uri.controller).toLowerCase()]);
    }
    instance.prototype.onconnected = function () {
    }
    instance.prototype.onconnected = function () { }

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
            if (result instanceof XSockets.Promise)
                result.addCallback(dfd.resolve);
            else
                dfd.resolve(result);
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
            if (result)
                c.apply(null, result);
            else
                callbacks.push(c);
        });
    }
    return deferred;
})();
XSockets.Subscription = (function () {
    function subscription(topic, delagate, count, completed) {
        this.topic = topic.toLowerCase();
        this.fire = function (obj, cb) {
            delagate(obj);
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
        this.get = function (url, data, cb) {
            var request = new XMLHttpRequest();
            request.open("GET", url + this.createQueryString(data), true);
            request.responseType = 'json';
            request.setRequestHeader('Content-Type', 'application/json');
            request.onload = function (e) {
                if (this.status == 200) {

                    if (cb) cb(this.response);
                } else {
                    if (self.onerror) onerror(this);
                }
            };
            request.send();
            return this;
        };
        this.post = function (url, data, cb) {
            var request = new XMLHttpRequest();
            request.open("POST", url, true);
            request.responseType = 'json';
            request.setRequestHeader('Content-Type', 'application/json');
            request.onload = function (e) {
                if (this.status == 200) {
                    if (cb) cb(this.response);
                } else {
                    if (self.onerror) onerror(this);
                }
            };
            request.send(JSON.stringify(data));
            return this;
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