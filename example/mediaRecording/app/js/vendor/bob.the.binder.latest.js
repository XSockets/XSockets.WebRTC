///#source 1 1 /src/bob.core.latest.js
var $ = $ ||
function (selector, el) {
    if (!el) el = document;
    var args = arguments;
    if (args.length === 0) return el;
    if (typeof (arguments[0]) === "function") {
        el.addEventListener("DOMContentLoaded", function (e) {
            args[0].call(this, e);
        });
        return el;
    }
    return el.querySelector(selector);
};

(function () {
    Element.prototype._addEventListener = Element.prototype.addEventListener;
    Element.prototype.addEventListener = function (a, b, c) {

        if (c == undefined) c = false;
        this._addEventListener(a, b, c);
        if (!this.eventListenerList) this.eventListenerList = {};
        if (!this.eventListenerList[a]) this.eventListenerList[a] = [];
        //this.removeEventListener(a,b,c); // TODO - handle duplicates.. 
        this.eventListenerList[a].push({ listener: b, useCapture: c });
    };

    Element.prototype.getEventListeners = function (a) {
        if (!this.eventListenerList) this.eventListenerList = {};
        if (a == undefined) return this.eventListenerList;
        return this.eventListenerList[a];
    };
    Element.prototype.clearEventListeners = function (a) {
        if (!this.eventListenerList) this.eventListenerList = {};
        if (a == undefined) {
            for (var x in (this.getEventListeners())) this.clearEventListeners(x);
            return;
        }
        var el = this.getEventListeners(a);
        if (el == undefined) return;
        for (var i = el.length - 1; i >= 0; --i) {
            var ev = el[i];
            this.removeEventListener(a, ev.listener, ev.useCapture);
        }
    };


    Element.prototype._removeEventListener = Element.prototype.removeEventListener;
    Element.prototype.removeEventListener = function (a, b, c) {
        if (c == undefined) c = false;
        this._removeEventListener(a, b, c);
        if (!this.eventListenerList) this.eventListenerList = {};
        if (!this.eventListenerList[a]) this.eventListenerList[a] = [];
        // find the event in the list
        for (var i = 0; i < this.eventListenerList[a].length; i++) {
            if (this.eventListenerList[a][i].listener == b, this.eventListenerList[a][i].useCapture == c) { // hmm..
                this.eventListenerList[a].splice(i, 1);
                break;
            }
        }
        if (this.eventListenerList[a].length == 0) delete this.eventListenerList[a];
    };

})();

var Bob = Bob || {};

Bob.Guid = {
    newGuid: function (a, b) {
        for (b = a = ''; a++ < 36; b += a * 51 & 52 ? (a ^ 15 ? 8 ^ Math.random() * (a ^ 20 ? 16 : 4) : 4).toString(16) : '-');
        return b;
    }
};

var getExpression = function (data) {
    var prop = data.split(".").first();
    var args = prop.match(/\((.*?)\)/);
    // is a function , remove the arguments...
    if (args) prop = prop.replace(args[0], '');
    var expr = prop.replace(/[()]/g, '');
    expr = expr.replace(/\[(\w+)\]/g, '.$1');
    expr = expr.replace(/^\./, '');
    return {
        prop: expr,
        args: args,
        isFn: args === null ? false : true,

    }
};

Bob.serializeForm = function (form) {
    if (!form) form = this;
    var data, i, len, node, ref;
    data = {};
    ref = form.elements;
    for (i = 0, len = ref.length; i < len; i++) {
        node = ref[i];
        if (!node.disabled && node.name) {
            data[node.name] = node.value;
        }
    }
    return data;
};

Bob.binders = {
    registerBinder: function (name, binder, cb) {
        if (!this.hasOwnProperty(name)) {
            this[name] = binder;
        } else {
            throw "Binder name already exists '" + name + "'";
        }
        if (cb) cb();
        return this;
    },

    loadfile: function (node, onchange) {

        var readFile = (function () {
            var file = function () {
                this.read = function (f, fn) {
                    var reader = new FileReader();
                    reader.onload = (function (tf) {
                        return function (e) {
                            fn(tf, e.target.result);
                        };
                    })(f);
                    reader.readAsArrayBuffer(f);
                }
            }
            return file;
        }());
        return {
            updateProperty: function (value) {
                node.clearEventListeners("change");
                var listener = function (evt) {

                    var reader = new readFile();
                    var file = evt.target.files[0];
                    for (var p in file) {
                        value.meta[p] = file[p];
                    };
                    reader.read(file, function (result, arrayBuffer) {
                        value.bytes = arrayBuffer;
                    });
                };

                node.addEventListener("change", listener);

            }
        };
    },
    hide: function (node, onchange) {
        return {
            updateProperty: function (value) {
                if (typeof (value) === "function") {
                    value = value();
                };
                if (value) {
                    node.style.display = "";
                } else {
                    node.style.display = "none";
                }
            }
        }
    },
    css: function (node) {
        var previous;
        return {
            updateProperty: function (newValue) {

                if (typeof (newValue) === "function") {
                    newValue = newValue();
                };
                if (!newValue) return;

                if (previous) {
                    previous.split(",").forEach(function (c) {
                        node.classList.remove(c);
                    });
                } else {
                    newValue.split(",").forEach(function (c) {
                        node.classList.remove(c);
                    });
                }
                node.classList.add(newValue);
                previous = newValue;
            }
        }
    },
    keyup: function (node, onchange) {
        node.clearEventListeners("keyup");
        node.addEventListener('keyup', function () {
            onchange(node.value);
        });
        return {
            updateProperty: function () {
                var args = arguments;
                if (typeof (args[0]) !== "function") node.value = args[0];
            }
        };
    },
    value: function (node, onchange) {
        node.clearEventListeners("keyup");
        node.addEventListener('keyup', function () {
            onchange(node.value);
        });
        return {
            updateProperty: function (value) {

                if (value !== node.value) {
                    node.value = value;
                }
            }
        };
    },
    count: function (node) {
        return {
            updateProperty: function (value) {
                node.textContent = String(value).length;
            }
        };
    },
    html: function (node) {
        return {
            updateProperty: function (value) {
                node.htmlText = value;
            }
        };
    },
    href: function (node) {
        return {
            updateProperty: function (value) {
                node.setAttribute("href", value);
            }
        };
    },
    domId: function (node) {
        return {
            updateProperty: function (value) {
                node.setAttribute("id", value);
            }
        };
    },
    input: function (node) {
        return {
            updateProperty: function (value) {
                node.clearEventListeners("input");
                var args = arguments;
                var listener = function (evt) {
                    args[0].apply(args[0](), [JSON.stringify(args[2])]);
                };
                node.addEventListener("input", listener);
            }
        };
    },
    dataset: function (node) {
        return {
            updateProperty: function (value) {
                node.dataset[value] = value;
            }
        };
    },
    text: function (node) {

        return {
            updateProperty: function (value) {
                node.textContent = typeof (value) === "function" ? value() : value;
            },

        };
    },
    selectchange: function (node, onchange, onadd, onremove) {
        var obj;


        return {
            updateProperty: function () {
                node.clearEventListeners("change");
                var args = arguments;
                obj = args[5];
                var listener = function (e) {
                    var options = e.target.querySelectorAll("option");
                    for (var i = 0; i < options.length; i++) {
                        if (!options[i].selected)
                            onremove(obj[i]);

                    }
                    for (var i = 0; i < options.length; i++) {
                        if (options[i].selected) {
                            onadd(obj[i]);
                        }
                    }
                };
                node.addEventListener('change', listener);
            }
        }
    },
    select: function (node) {

        return {
            updateProperty: function () {

                var args = arguments;
                if (Array.isArray(args[0])) {
                    var values = args[0];
                    var match = values.findIndex(function (a) {
                        return JSON.stringify(a) == JSON.stringify(args[3]);
                    });
                    if (match > -1) node.selected = true;
                } else {
                    var value = args[0];
                    if (args[3]) {
                        if (JSON.stringify(value) === JSON.stringify(args[3]))
                            node.selected = true;
                        return;
                    }
                    if (value == node.value) {
                        node.selected = true;
                    } else {
                        node.selected = false;
                    }

                }
            }
        }
    },
    checkchange: function (node, onchange, onadd, onremove) {

        var obj;
        var isBool;
        return {
            updateProperty: function () {
                var args = arguments;
                obj = args[3];
                node.clearEventListeners("click");
                if (!isBool) isBool = typeof (args[0]) === "boolean";

                var listener = function (e) {
                    if (isBool) {

                        onchange(node.checked);
                    } else {

                        if (node.checked) {
                            onadd(obj);
                        } else onremove(obj);
                    };
                }

                node.addEventListener('click', listener);
            }
        }
    },
    checked: function (node, onchange, object) {
        return {
            updateProperty: function () {
                var args = arguments;

                if (!Array.isArray(args[0])) {

                    node.checked = args[0];
                } else {
                    throw "Not yet implemented";
                }
            }
        }
    },
    validate: function (node) {
        return {
            updateProperty: function (v) {
            }
        }
    },
    click: function (node) {

        var data;

        return {
            updateProperty: function (fn) {
                node.clearEventListeners("click");
                if (!data) data = this;
                function listener(e) {
                    fn.apply(data, [e]);
                };
                node.addEventListener('click', listener);
            }
        };
    },
};


Bob.Notifier = (function () {
    var ctor = function () {
        var notifiers = [];
        this.name = undefined;
        this.on = function (obj, mutator, fn) {

            if (!obj.hasOwnProperty("$bob")) {


                obj["$bob"] = new Bob.Dispatcher(mutator, fn);

                notifiers.push(
                    obj["$bob"]
                );
                return obj["$bob"];
            } else return obj["$bob"];
        };
        this.clone = function (name, obj) {
            obj["$bob"] =
                notifiers.findBy(function (pre) {
                    return pre.name === name;
                }).first();
        };

        this.off = function (mutator, cb) {
            var index = notifiers.findIndex(function (pre) {
                return pre.name === mutator;
            });
            notifiers.splice(index, 1);
            if (cb) cb();

        };

    };
    return ctor;
})();

Bob.Dispatcher = (function () {
    var ctor = function (name, map, fn) {
        this.name = name;
        this.fn = fn;
    };
    ctor.prototype.add = function (fn) {
        this.$add = fn;
        return this;
    };
    ctor.prototype.update = function (fn) {
        this.$update = fn;
        return this;
    };
    ctor.prototype.delete = function (fn) {
        this.$delete = fn;
        return this;
    };

    return ctor;
})();


Bob.apply = function (binders) {

    if (!binders) binders = Bob.binders;


    var depenents = [];


    var instanceId = Bob.Guid.newGuid();
    var $root;
    var notifier = new Bob.Notifier();
    function findObservable(obj, path) {

        if (path.indexOf("$this").length > 0) {
            return obj;
        }
        var parts = path.split(".");
        var meta = getExpression(parts[0]);



        var root = (new RegExp("^\\$root")).test(meta.prop);
        if (root) {
            return findObservable($root, parts.slice(1).join("."), path);
        }
        if (parts.length == 1) {
            if (meta.isFn) {
                var fnResult = (obj[meta.prop]).apply(obj, meta.args[1].split(","));

                return fnResult;
            }
            if ((typeof (obj[meta.prop]) === "object")) {
                return obj[meta.prop];
            } else {
                return obj;
            }
        }
        if (meta.isFn) {
            return findObservable((obj[meta.prop]).apply(obj, meta.args[1].split(",")), parts.slice(1).join("."), path);
        } else {
            return findObservable(obj[meta.prop], parts.slice(1).join("."), path);
        }
    };
    function bindObject(node, binderName, object, propertyName) {
        var objectToObserve = findObservable(object, propertyName);
        var context;
        var propertySet = propertyName.split("|");
        propertyName = propertySet[0];
        propertySet = propertySet.slice(1);
        var removeValue = function (value) {
            if (!objectToObserve[propertyName.split(".").pop()]) {
                if (Array.isArray(objectToObserve)) {

                    var m = objectToObserve.findIndex(function (ar) {
                        return JSON.stringify(ar) === JSON.stringify(value);
                    });
                    objectToObserve.remove(m);
                }
            } else {
                objectToObserve[propertyName.split(".").pop()] = value;
                //  throw "Not yet implemented";
            }
        };
        var addValue = function (value, parent) {
            if (!parent) {
                parent = propertyName;
            }
            if (!objectToObserve[parent.split(".").pop()]) {

                if (Array.isArray(objectToObserve)) {

                    var m = objectToObserve.findIndex(function (ar) {
                        return JSON.stringify(ar) === JSON.stringify(value);
                    });

                    if (m === -1)

                        objectToObserve.push(value);

                } else {

                    for (var prop in value) {
                        objectToObserve[prop] = value[prop];
                    }
                }
            } else {
                throw "Not yet implemented";
            }
        };
        var updateValue = function (newValue, parent) {

            if (!parent) {
                parent = propertyName;
            }
            parent = parent.split(".").pop();
            parent = parent.replace("(", "").replace(")", "");
            if (typeof (objectToObserve[parent]) == "function") {
                objectToObserve[parent].apply(objectToObserve[parent], [newValue]);
            } else
                objectToObserve[parent] = newValue;


            return;
        }

        var binder = binders[binderName](node, updateValue, addValue, removeValue, object);

        // todo: refactor
        var key = propertyName.split(".").pop();
        //r = r.replace("(", "").replace(")", "");



        if (node.dataset.with && propertySet.length === 0) {
            context = findObservable($root, node.dataset.with);
        } else if (propertySet.length > 1) {
            context = findObservable($root, propertySet[0]);
        }
        binder.updateProperty.apply(object, [objectToObserve.hasOwnProperty(key) ? objectToObserve[key] : objectToObserve,
            binderName, objectToObserve, object, propertySet, context || null]);

        var observer = function (changes) {
            var n = objectToObserve["$bob"];
            var changed = changes.some(function (a) {
                return a.name === propertyName.split(".").pop();
            });
            if (changed) {
                var change = changes.first();
                var args = change.object;
                if (n) {

                    if (n.hasOwnProperty("$" + change.type))
                        n["$" + change.type].apply(change.object, [args, change.name, change.type, change.oldValue, binderName]);
                    if (n.fn)
                        n.fn.apply(n, [args, change.name, change.type, change.oldValue, binderName]);
                    n.type = change.type;
                };
                binder.updateProperty(objectToObserve[key], binderName, objectToObserve, object, propertySet, context);
            }
            if (typeof (objectToObserve[key]) === "function" && !changed) {
                binder.updateProperty(objectToObserve[key], binderName, objectToObserve, object, propertySet, context);
            }
        };
        var observe = function () {
            Object.observe(objectToObserve, observer);
        }
        var unobserve = function () {
            Object.unobserve(objectToObserve, observer);
        }
        if (typeof (objectToObserve) === "object") {

            Object.observe(objectToObserve, observer);

            Object.observe(objectToObserve, function (changes) {
                changes.forEach(function (change) {
                    var changed = changes.some(function (a) {
                        return a.key === propertyName.split(".").pop();
                    });

                    if (change.type === "$update" && changed) {
                        Object.unobserve(objectToObserve, observer);
                        binder.updateProperty(change.$object[change.key], binderName, change.object, object, propertySet, context);
                        Object.observe(objectToObserve, observer);
                    };
                });
            }, ["$update"]);
        }


        return {
            propertyName: propertyName,
            $binder: function (value, obj) {
                Object.unobserve(objectToObserve, observer);
                binder.updateProperty(value, binderName, obj, object, propertySet, context);
                Object.observe(objectToObserve, observer);
            },
            observe: observe,
            unobserve: unobserve
        };
    };
    function bindAttributes(node, attr, object, key) {
        node.setAttribute(attr, object[key]);
        var updateItem = function (element, update) {
            node.setAttribute(attr, update);
        }
        var observer = function (changes) {
            updateItem(node, object[changes[0].name]);
        };

        delete node.dataset.attr;

        Object.observe(object, observer);
        return {
            unobserve: function () {
                Object.unobserve(object, observer);
            },
            observe: function () {
                Object.observe(object, observer);
            }
        };
    };
    function bindCollection(node, array) {

        function capture(original) {
            var before = original.previousSibling;
            var parentNode = original.parentNode;
            var cloned = original.cloneNode(true);
            original.parentNode.removeChild(original);
            return {
                insert: function () {
                    var newNode = cloned.cloneNode(true);
                    parentNode.insertBefore(newNode, before);
                    return newNode;
                }
            };
        }
        node.dataset.parent = node.dataset.repeat;
        delete node.dataset.repeat;
        var parent = node.parentNode;
        var captured = capture(node);
        var bindItem = function (element) {
            var newEl = captured.insert();
            var model = bindModel(newEl, element, array);
            return model;
        };
        var bindings = array.map(function (a, index) {
          
          
        
            return bindItem(a);
        });

        var observer = function (changes) {
            var n = array["$bob"];

            var tc = changes.findIndex(function (pre) {
                return pre.type === "delete";
            });



            if (tc >= 0 && n && n.hasOwnProperty("$delete"))
                n["$delete"].apply(changes[0].oldValue, [changes[0].oldValue, changes[0].name, "delete"]);

            changes.forEach(function (change) {
                var index = parseInt(change.name, 10), child;
                if (isNaN(index)) return;
                var args = isNaN(index) ? change.object : change.object[index];
                if (!args) args = change.object;
                if (change.type === 'add') {
                    if (n && n.hasOwnProperty("$add")) {
                        n["$" + change.type].apply(change.object, [args, change.name, change.type, change.oldvalue]);
                    }
                    bindings.push(bindItem(array[index]));
                } else if (change.type === 'update') {
                    bindings[index].unobserve();
                    bindModel(parent.children[index], array[index]);
                } else if (change.type === 'delete') {

                    child = parent.children[index];

                    child.parentNode.removeChild(child);
                }
            });
        };

        var unobserve = function () {
            Object.unobserve(array, observer);
        };
        var observe = function () {
            Object.observe(array, observer);
        };
        Object.observe(array, observer);
        Object.observe(array, function (changes) {

            changes.forEach(function (change) {




                var index, obj, child;
                if (change.type === "$add") {
                    obj = change.$object;
                    Object.unobserve(array, observer);
                    index = array.push(obj);
                    bindings.push(bindItem(array[index - 1]));
                    Object.observe(array, observer);

                } else if (change.type === "$delete") {
                    var remove = change.$object;
                    index = array.findIndex(function (pre) {
                        return JSON.stringify(pre) === JSON.stringify(remove);
                    });
                    child = parent.children[index];
                    child.parentNode.removeChild(child);
                    Object.unobserve(array, observer);
                    array.remove(index);
                    Object.observe(array, observer);
                } else if (change.type === "$update") {
                    index = array.findIndex(function (pre) {

                        return pre[change.key] === change.oldValue;
                    });

                    if (bindings[index]) {
                        var l = bindings[index].bindings.findBy(function (a) {
                            if (a)
                                return a.first().propertyName === change.key;
                        });
                    }
                    array[index][change.key] = change.$object[change.key];
                    Object.observe(array, observer);

                    if (l) {
                        l.forEach(function (binder) {
                            var method = binder.first().$binder;
                            method.apply(change, [change.$object[change.key], change.$object]);
                        });
                    }
                }
            });
        }, ["$add", "$delete", "$update"]);
        return {
            unobserve: unobserve,
            observe: observe
        };
    }


    var applyTemplate = function (node, tmpl, object) {
        window.fetch(tmpl, { method: 'get' }).then(function (res) {
            return res.text();
        }).then(function (html) {
            node.insertAdjacentHTML('afterbegin', html);
            bindModel(node, object);

        });
    };


    function bindModel(container, object) {

        if (typeof (container) === "string") container = $(container);
        var templates = typeof (container) === "object" ? container.querySelectorAll("[data-template]") : $(container).querySelectorAll("[data-template]");

        for (var i = 0; i < templates.length; i++) {
            applyTemplate(templates[i], templates[i].dataset.template, object);
            delete templates[i].dataset.template;
        }



        if (!$root) $root = object;
        function isDirectNested(node) {
            node = node.parentElement;
            while (node) {
                if (node.dataset.repeat) {
                    return false;
                }
                node = node.parentElement;
            }
            return true;
        }

        function onlyDirectNested(selector) {
            var collection = container.querySelectorAll(selector);
            var arr = Array.prototype.filter.call(collection, isDirectNested);
            return arr;
        }

        var bindings = onlyDirectNested('[data-bind]').map(function (node) {

            var datasets = node.dataset.bind;
            return datasets.split(",").map(function (dataset) {
                var binderName = dataset.substr(0, dataset.indexOf(":"));
                var binderProp = dataset.substr(binderName.length + 1, dataset.length);
                return bindObject(node, binderName, object, binderProp, datasets);
            });


        }).concat(onlyDirectNested('[data-repeat]').map(function (node) {

            var obj = findObservable(object, node.dataset.repeat);

            return bindCollection(node, obj);

        })).concat([container].map(function (node) {
            var datasets = node.dataset.bind;
            if (!datasets) return;
            return datasets.split(",").forEach(function (dataset) {
                var binderName = dataset.substr(0, dataset.indexOf(":"));
                var binderProp = dataset.substr(binderName.length + 1, dataset.length);
                return bindObject(node, binderName, object, binderProp, datasets);
            });
        })).concat(onlyDirectNested('[data-attr]').map(function (node) {

            var datasets = node.dataset.attr;

            return datasets.split(",").map(function (dataset) {

                var binderName = dataset.substr(0, dataset.indexOf(":"));
                var binderProp = dataset.substr(binderName.length + 1, dataset.length);

                return bindAttributes(node, binderName, object, binderProp);
            });

        }));

        return {
            bindings: bindings,
            unobserve: function () {
                bindings.forEach(function (binding) {

                    if (binding && binding.hasOwnProperty("unobserve")) binding.unobserve();
                });
            },
            observe: function () {
                bindings.forEach(function (binding) {
                    binding.observe();
                });
            },

        };
    };
    return {
        on: function () {
            return notifier.on.apply(this, arguments);
        },
        off: function () {
            return notifier.off.apply(this, arguments);
        },
        $instanceId: instanceId,
        notifier: notifier,
        bind: bindModel,
        $root: function () {
            return $root;
        },
    };
};


// Array extenders //
Array.prototype.intersect = function (array) {
    var result = [];

    var a = this.slice(0);
    var b = array.slice(0);
    var aLast = a.length - 1;
    var bLast = b.length - 1;
    while (aLast >= 0 && bLast >= 0) {
        if (a[aLast] > b[bLast]) {
            a.pop();
            aLast--;
        } else if (a[aLast] < b[bLast]) {
            b.pop();
            bLast--;
        } else {
            result.push(a.pop());
            b.pop();
            aLast--;
            bLast--;
        }
    }
    return result;
};
Array.prototype.first = function (num) {
    if (!num) return this[0];
    if (num < 0) num = 0;
    return this.slice(0, num);
};
Array.prototype.take = function (num) {
    if (!num) num = 2;

    return (this.filter(function (t, i) {
        if (i < num) return t;

    }) || []);

};
Array.prototype.findBy = function (pre) {
    var arr = this;
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        if (pre(arr[i]))
            result.push(arr[i]);
    };
    return result;
};
Array.prototype.count = function (pre) {
    var arr = this;
    var result = 0;
    if (!pre) return this.length;

    for (var i = 0; i < this.length; i++) {
        if (pre(arr[i])) {
            result++;
        }
    }
    return result;
};
Array.prototype.findIndex = function (pre) {
    var arr = this;

    for (var i = 0; i < this.length; i++) {
        if (pre(arr[i])) {
            return i;
        }
    }
    return -1;
};
Array.prototype.remove = function (index) {

    this.splice(index, 1);

    return this.length;
};
Array.prototype.clone = function () {
    return this.slice(0);
};
Array.prototype.removeAll = function () {

    for (var i = 0; this.length; i++) {
        this.splice(i, 1);
    }

    return this.length;
};

// Object extenders //
Object.defineProperties(Object, {
    'extend': {
        'configurable': true,
        'enumerable': false,
        'value': function extend(what, wit) {
            var extObj, witKeys = Object.keys(wit);
            extObj = Object.keys(what).length ? Object.clone(what) : {};
            witKeys.forEach(function (key) {
                Object.defineProperty(extObj, key, Object.getOwnPropertyDescriptor(wit, key));
            });
            return extObj;
        },
        'writable': true
    },
    'clone': {
        'configurable': true,
        'enumerable': false,
        'value': function clone(obj) {
            return Object.extend({}, obj);
        },
        'writable': true
    }
});

//Object.prototype.equalTo= function() {
//    throw "Not yet implemented";
//};

///#source 1 1 /src/polyfills/e6-promise.js
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.3.0
 */

(function () {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
        return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
        return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
        return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
        lib$es6$promise$utils$$_isArray = function (x) {
            return Object.prototype.toString.call(x) === '[object Array]';
        };
    } else {
        lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$toString = {}.toString;
    var lib$es6$promise$asap$$vertxNext;
    var lib$es6$promise$asap$$customSchedulerFn;

    var lib$es6$promise$asap$$asap = function asap(callback, arg) {
        lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
        lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
        lib$es6$promise$asap$$len += 2;
        if (lib$es6$promise$asap$$len === 2) {
            // If len is 2, that means that we need to schedule an async flush.
            // If additional callbacks are queued before the queue is flushed, they
            // will be processed by this flush that we are scheduling.
            if (lib$es6$promise$asap$$customSchedulerFn) {
                lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
            } else {
                lib$es6$promise$asap$$scheduleFlush();
            }
        }
    }

    function lib$es6$promise$asap$$setScheduler(scheduleFn) {
        lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
    }

    function lib$es6$promise$asap$$setAsap(asapFn) {
        lib$es6$promise$asap$$asap = asapFn;
    }

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
        var nextTick = process.nextTick;
        // node version 0.10.x displays a deprecation warning when nextTick is used recursively
        // setImmediate should be used instead instead
        var version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
        if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
            nextTick = setImmediate;
        }
        return function () {
            nextTick(lib$es6$promise$asap$$flush);
        };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
        return function () {
            lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
        };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
        var iterations = 0;
        var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
        var node = document.createTextNode('');
        observer.observe(node, { characterData: true });

        return function () {
            node.data = (iterations = ++iterations % 2);
        };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
        var channel = new MessageChannel();
        channel.port1.onmessage = lib$es6$promise$asap$$flush;
        return function () {
            channel.port2.postMessage(0);
        };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
        return function () {
            setTimeout(lib$es6$promise$asap$$flush, 1);
        };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
        for (var i = 0; i < lib$es6$promise$asap$$len; i += 2) {
            var callback = lib$es6$promise$asap$$queue[i];
            var arg = lib$es6$promise$asap$$queue[i + 1];

            callback(arg);

            lib$es6$promise$asap$$queue[i] = undefined;
            lib$es6$promise$asap$$queue[i + 1] = undefined;
        }

        lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertex() {
        try {
            var r = require;
            var vertx = r('vertx');
            lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
            return lib$es6$promise$asap$$useVertxTimer();
        } catch (e) {
            return lib$es6$promise$asap$$useSetTimeout();
        }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertex();
    } else {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }

    function lib$es6$promise$$internal$$noop() { }

    var lib$es6$promise$$internal$$PENDING = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFullfillment() {
        return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
        return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
        try {
            return promise.then;
        } catch (error) {
            lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
            return lib$es6$promise$$internal$$GET_THEN_ERROR;
        }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
        try {
            then.call(value, fulfillmentHandler, rejectionHandler);
        } catch (e) {
            return e;
        }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
        lib$es6$promise$asap$$asap(function (promise) {
            var sealed = false;
            var error = lib$es6$promise$$internal$$tryThen(then, thenable, function (value) {
                if (sealed) { return; }
                sealed = true;
                if (thenable !== value) {
                    lib$es6$promise$$internal$$resolve(promise, value);
                } else {
                    lib$es6$promise$$internal$$fulfill(promise, value);
                }
            }, function (reason) {
                if (sealed) { return; }
                sealed = true;

                lib$es6$promise$$internal$$reject(promise, reason);
            }, 'Settle: ' + (promise._label || ' unknown promise'));

            if (!sealed && error) {
                sealed = true;
                lib$es6$promise$$internal$$reject(promise, error);
            }
        }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
        if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
            lib$es6$promise$$internal$$fulfill(promise, thenable._result);
        } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
            lib$es6$promise$$internal$$reject(promise, thenable._result);
        } else {
            lib$es6$promise$$internal$$subscribe(thenable, undefined, function (value) {
                lib$es6$promise$$internal$$resolve(promise, value);
            }, function (reason) {
                lib$es6$promise$$internal$$reject(promise, reason);
            });
        }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable) {
        if (maybeThenable.constructor === promise.constructor) {
            lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
        } else {
            var then = lib$es6$promise$$internal$$getThen(maybeThenable);

            if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
                lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
            } else if (then === undefined) {
                lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
            } else if (lib$es6$promise$utils$$isFunction(then)) {
                lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
            } else {
                lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
            }
        }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
        if (promise === value) {
            lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFullfillment());
        } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
            lib$es6$promise$$internal$$handleMaybeThenable(promise, value);
        } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
        }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
        if (promise._onerror) {
            promise._onerror(promise._result);
        }

        lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
        if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

        promise._result = value;
        promise._state = lib$es6$promise$$internal$$FULFILLED;

        if (promise._subscribers.length !== 0) {
            lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
        }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
        if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
        promise._state = lib$es6$promise$$internal$$REJECTED;
        promise._result = reason;

        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
        var subscribers = parent._subscribers;
        var length = subscribers.length;

        parent._onerror = null;

        subscribers[length] = child;
        subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
        subscribers[length + lib$es6$promise$$internal$$REJECTED] = onRejection;

        if (length === 0 && parent._state) {
            lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
        }
    }

    function lib$es6$promise$$internal$$publish(promise) {
        var subscribers = promise._subscribers;
        var settled = promise._state;

        if (subscribers.length === 0) { return; }

        var child, callback, detail = promise._result;

        for (var i = 0; i < subscribers.length; i += 3) {
            child = subscribers[i];
            callback = subscribers[i + settled];

            if (child) {
                lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
            } else {
                callback(detail);
            }
        }

        promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
        this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
        try {
            return callback(detail);
        } catch (e) {
            lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
            return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
        }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
        var hasCallback = lib$es6$promise$utils$$isFunction(callback),
            value, error, succeeded, failed;

        if (hasCallback) {
            value = lib$es6$promise$$internal$$tryCatch(callback, detail);

            if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
                failed = true;
                error = value.error;
                value = null;
            } else {
                succeeded = true;
            }

            if (promise === value) {
                lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
                return;
            }

        } else {
            value = detail;
            succeeded = true;
        }

        if (promise._state !== lib$es6$promise$$internal$$PENDING) {
            // noop
        } else if (hasCallback && succeeded) {
            lib$es6$promise$$internal$$resolve(promise, value);
        } else if (failed) {
            lib$es6$promise$$internal$$reject(promise, error);
        } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
            lib$es6$promise$$internal$$fulfill(promise, value);
        } else if (settled === lib$es6$promise$$internal$$REJECTED) {
            lib$es6$promise$$internal$$reject(promise, value);
        }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
        try {
            resolver(function resolvePromise(value) {
                lib$es6$promise$$internal$$resolve(promise, value);
            }, function rejectPromise(reason) {
                lib$es6$promise$$internal$$reject(promise, reason);
            });
        } catch (e) {
            lib$es6$promise$$internal$$reject(promise, e);
        }
    }

    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
        var enumerator = this;

        enumerator._instanceConstructor = Constructor;
        enumerator.promise = new Constructor(lib$es6$promise$$internal$$noop);

        if (enumerator._validateInput(input)) {
            enumerator._input = input;
            enumerator.length = input.length;
            enumerator._remaining = input.length;

            enumerator._init();

            if (enumerator.length === 0) {
                lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
            } else {
                enumerator.length = enumerator.length || 0;
                enumerator._enumerate();
                if (enumerator._remaining === 0) {
                    lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
                }
            }
        } else {
            lib$es6$promise$$internal$$reject(enumerator.promise, enumerator._validationError());
        }
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._validateInput = function (input) {
        return lib$es6$promise$utils$$isArray(input);
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function () {
        return new Error('Array Methods must be provided an Array');
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._init = function () {
        this._result = new Array(this.length);
    };

    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function () {
        var enumerator = this;

        var length = enumerator.length;
        var promise = enumerator.promise;
        var input = enumerator._input;

        for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
            enumerator._eachEntry(input[i], i);
        }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function (entry, i) {
        var enumerator = this;
        var c = enumerator._instanceConstructor;

        if (lib$es6$promise$utils$$isMaybeThenable(entry)) {
            if (entry.constructor === c && entry._state !== lib$es6$promise$$internal$$PENDING) {
                entry._onerror = null;
                enumerator._settledAt(entry._state, i, entry._result);
            } else {
                enumerator._willSettleAt(c.resolve(entry), i);
            }
        } else {
            enumerator._remaining--;
            enumerator._result[i] = entry;
        }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function (state, i, value) {
        var enumerator = this;
        var promise = enumerator.promise;

        if (promise._state === lib$es6$promise$$internal$$PENDING) {
            enumerator._remaining--;

            if (state === lib$es6$promise$$internal$$REJECTED) {
                lib$es6$promise$$internal$$reject(promise, value);
            } else {
                enumerator._result[i] = value;
            }
        }

        if (enumerator._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(promise, enumerator._result);
        }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function (promise, i) {
        var enumerator = this;

        lib$es6$promise$$internal$$subscribe(promise, undefined, function (value) {
            enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
        }, function (reason) {
            enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
        });
    };
    function lib$es6$promise$promise$all$$all(entries) {
        return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
        /*jshint validthis:true */
        var Constructor = this;

        var promise = new Constructor(lib$es6$promise$$internal$$noop);

        if (!lib$es6$promise$utils$$isArray(entries)) {
            lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
            return promise;
        }

        var length = entries.length;

        function onFulfillment(value) {
            lib$es6$promise$$internal$$resolve(promise, value);
        }

        function onRejection(reason) {
            lib$es6$promise$$internal$$reject(promise, reason);
        }

        for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
            lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
        }

        return promise;
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$resolve$$resolve(object) {
        /*jshint validthis:true */
        var Constructor = this;

        if (object && typeof object === 'object' && object.constructor === Constructor) {
            return object;
        }

        var promise = new Constructor(lib$es6$promise$$internal$$noop);
        lib$es6$promise$$internal$$resolve(promise, object);
        return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
    function lib$es6$promise$promise$reject$$reject(reason) {
        /*jshint validthis:true */
        var Constructor = this;
        var promise = new Constructor(lib$es6$promise$$internal$$noop);
        lib$es6$promise$$internal$$reject(promise, reason);
        return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

    var lib$es6$promise$promise$$counter = 0;

    function lib$es6$promise$promise$$needsResolver() {
        throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
        throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
        this._id = lib$es6$promise$promise$$counter++;
        this._state = undefined;
        this._result = undefined;
        this._subscribers = [];

        if (lib$es6$promise$$internal$$noop !== resolver) {
            if (!lib$es6$promise$utils$$isFunction(resolver)) {
                lib$es6$promise$promise$$needsResolver();
            }

            if (!(this instanceof lib$es6$promise$promise$$Promise)) {
                lib$es6$promise$promise$$needsNew();
            }

            lib$es6$promise$$internal$$initializePromise(this, resolver);
        }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
    lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
    lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
    lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

    lib$es6$promise$promise$$Promise.prototype = {
        constructor: lib$es6$promise$promise$$Promise,

        /**
          The primary way of interacting with a promise is through its `then` method,
          which registers callbacks to receive either a promise's eventual value or the
          reason why the promise cannot be fulfilled.
    
          ```js
          findUser().then(function(user){
            // user is available
          }, function(reason){
            // user is unavailable, and you are given the reason why
          });
          ```
    
          Chaining
          --------
    
          The return value of `then` is itself a promise.  This second, 'downstream'
          promise is resolved with the return value of the first promise's fulfillment
          or rejection handler, or rejected if the handler throws an exception.
    
          ```js
          findUser().then(function (user) {
            return user.name;
          }, function (reason) {
            return 'default name';
          }).then(function (userName) {
            // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
            // will be `'default name'`
          });
    
          findUser().then(function (user) {
            throw new Error('Found user, but still unhappy');
          }, function (reason) {
            throw new Error('`findUser` rejected and we're unhappy');
          }).then(function (value) {
            // never reached
          }, function (reason) {
            // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
            // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
          });
          ```
          If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
    
          ```js
          findUser().then(function (user) {
            throw new PedagogicalException('Upstream error');
          }).then(function (value) {
            // never reached
          }).then(function (value) {
            // never reached
          }, function (reason) {
            // The `PedgagocialException` is propagated all the way down to here
          });
          ```
    
          Assimilation
          ------------
    
          Sometimes the value you want to propagate to a downstream promise can only be
          retrieved asynchronously. This can be achieved by returning a promise in the
          fulfillment or rejection handler. The downstream promise will then be pending
          until the returned promise is settled. This is called *assimilation*.
    
          ```js
          findUser().then(function (user) {
            return findCommentsByAuthor(user);
          }).then(function (comments) {
            // The user's comments are now available
          });
          ```
    
          If the assimliated promise rejects, then the downstream promise will also reject.
    
          ```js
          findUser().then(function (user) {
            return findCommentsByAuthor(user);
          }).then(function (comments) {
            // If `findCommentsByAuthor` fulfills, we'll have the value here
          }, function (reason) {
            // If `findCommentsByAuthor` rejects, we'll have the reason here
          });
          ```
    
          Simple Example
          --------------
    
          Synchronous Example
    
          ```javascript
          var result;
    
          try {
            result = findResult();
            // success
          } catch(reason) {
            // failure
          }
          ```
    
          Errback Example
    
          ```js
          findResult(function(result, err){
            if (err) {
              // failure
            } else {
              // success
            }
          });
          ```
    
          Promise Example;
    
          ```javascript
          findResult().then(function(result){
            // success
          }, function(reason){
            // failure
          });
          ```
    
          Advanced Example
          --------------
    
          Synchronous Example
    
          ```javascript
          var author, books;
    
          try {
            author = findAuthor();
            books  = findBooksByAuthor(author);
            // success
          } catch(reason) {
            // failure
          }
          ```
    
          Errback Example
    
          ```js
    
          function foundBooks(books) {
    
          }
    
          function failure(reason) {
    
          }
    
          findAuthor(function(author, err){
            if (err) {
              failure(err);
              // failure
            } else {
              try {
                findBoooksByAuthor(author, function(books, err) {
                  if (err) {
                    failure(err);
                  } else {
                    try {
                      foundBooks(books);
                    } catch(reason) {
                      failure(reason);
                    }
                  }
                });
              } catch(error) {
                failure(err);
              }
              // success
            }
          });
          ```
    
          Promise Example;
    
          ```javascript
          findAuthor().
            then(findBooksByAuthor).
            then(function(books){
              // found books
          }).catch(function(reason){
            // something went wrong
          });
          ```
    
          @method then
          @param {Function} onFulfilled
          @param {Function} onRejected
          Useful for tooling.
          @return {Promise}
        */
        then: function (onFulfillment, onRejection) {
            var parent = this;
            var state = parent._state;

            if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
                return this;
            }

            var child = new this.constructor(lib$es6$promise$$internal$$noop);
            var result = parent._result;

            if (state) {
                var callback = arguments[state - 1];
                lib$es6$promise$asap$$asap(function () {
                    lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
                });
            } else {
                lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
            }

            return child;
        },

        /**
          `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
          as the catch block of a try/catch statement.
    
          ```js
          function findAuthor(){
            throw new Error('couldn't find that author');
          }
    
          // synchronous
          try {
            findAuthor();
          } catch(reason) {
            // something went wrong
          }
    
          // async with promises
          findAuthor().catch(function(reason){
            // something went wrong
          });
          ```
    
          @method catch
          @param {Function} onRejection
          Useful for tooling.
          @return {Promise}
        */
        'catch': function (onRejection) {
            return this.then(null, onRejection);
        }
    };
    function lib$es6$promise$polyfill$$polyfill() {
        var local;

        if (typeof global !== 'undefined') {
            local = global;
        } else if (typeof self !== 'undefined') {
            local = self;
        } else {
            try {
                local = Function('return this')();
            } catch (e) {
                throw new Error('polyfill failed because global object is unavailable in this environment');
            }
        }

        var P = local.Promise;

        if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
            return;
        }

        local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
        'Promise': lib$es6$promise$promise$$default,
        'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
        define(function () { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
        module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
        this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);

///#source 1 1 /src/polyfills/fetch.js
(function () {
    'use strict';

    if (self.fetch) {
        return
    }

    function normalizeName(name) {
        if (typeof name !== 'string') {
            name = name.toString();
        }
        if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
            throw new TypeError('Invalid character in header field name')
        }
        return name.toLowerCase()
    }

    function normalizeValue(value) {
        if (typeof value !== 'string') {
            value = value.toString();
        }
        return value
    }

    function Headers(headers) {
        this.map = {}

        if (headers instanceof Headers) {
            headers.forEach(function (value, name) {
                this.append(name, value)
            }, this)

        } else if (headers) {
            Object.getOwnPropertyNames(headers).forEach(function (name) {
                this.append(name, headers[name])
            }, this)
        }
    }

    Headers.prototype.append = function (name, value) {
        name = normalizeName(name)
        value = normalizeValue(value)
        var list = this.map[name]
        if (!list) {
            list = []
            this.map[name] = list
        }
        list.push(value)
    }

    Headers.prototype['delete'] = function (name) {
        delete this.map[normalizeName(name)]
    }

    Headers.prototype.get = function (name) {
        var values = this.map[normalizeName(name)]
        return values ? values[0] : null
    }

    Headers.prototype.getAll = function (name) {
        return this.map[normalizeName(name)] || []
    }

    Headers.prototype.has = function (name) {
        return this.map.hasOwnProperty(normalizeName(name))
    }

    Headers.prototype.set = function (name, value) {
        this.map[normalizeName(name)] = [normalizeValue(value)]
    }

    Headers.prototype.forEach = function (callback, thisArg) {
        Object.getOwnPropertyNames(this.map).forEach(function (name) {
            this.map[name].forEach(function (value) {
                callback.call(thisArg, value, name, this)
            }, this)
        }, this)
    }

    function consumed(body) {
        if (body.bodyUsed) {
            return Promise.reject(new TypeError('Already read'))
        }
        body.bodyUsed = true
    }

    function fileReaderReady(reader) {
        return new Promise(function (resolve, reject) {
            reader.onload = function () {
                resolve(reader.result)
            }
            reader.onerror = function () {
                reject(reader.error)
            }
        })
    }

    function readBlobAsArrayBuffer(blob) {
        var reader = new FileReader()
        reader.readAsArrayBuffer(blob)
        return fileReaderReady(reader)
    }

    function readBlobAsText(blob) {
        var reader = new FileReader()
        reader.readAsText(blob)
        return fileReaderReady(reader)
    }

    var support = {
        blob: 'FileReader' in self && 'Blob' in self && (function () {
            try {
                new Blob();
                return true
            } catch (e) {
                return false
            }
        })(),
        formData: 'FormData' in self
    }

    function Body() {
        this.bodyUsed = false


        this._initBody = function (body) {
            this._bodyInit = body
            if (typeof body === 'string') {
                this._bodyText = body
            } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
                this._bodyBlob = body
            } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
                this._bodyFormData = body
            } else if (!body) {
                this._bodyText = ''
            } else {
                throw new Error('unsupported BodyInit type')
            }
        }

        if (support.blob) {
            this.blob = function () {
                var rejected = consumed(this)
                if (rejected) {
                    return rejected
                }

                if (this._bodyBlob) {
                    return Promise.resolve(this._bodyBlob)
                } else if (this._bodyFormData) {
                    throw new Error('could not read FormData body as blob')
                } else {
                    return Promise.resolve(new Blob([this._bodyText]))
                }
            }

            this.arrayBuffer = function () {
                return this.blob().then(readBlobAsArrayBuffer)
            }

            this.text = function () {
                var rejected = consumed(this)
                if (rejected) {
                    return rejected
                }

                if (this._bodyBlob) {
                    return readBlobAsText(this._bodyBlob)
                } else if (this._bodyFormData) {
                    throw new Error('could not read FormData body as text')
                } else {
                    return Promise.resolve(this._bodyText)
                }
            }
        } else {
            this.text = function () {
                var rejected = consumed(this)
                return rejected ? rejected : Promise.resolve(this._bodyText)
            }
        }

        if (support.formData) {
            this.formData = function () {
                return this.text().then(decode)
            }
        }

        this.json = function () {
            return this.text().then(JSON.parse)
        }

        return this
    }

    // HTTP methods whose capitalization should be normalized
    var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

    function normalizeMethod(method) {
        var upcased = method.toUpperCase()
        return (methods.indexOf(upcased) > -1) ? upcased : method
    }

    function Request(url, options) {
        options = options || {}
        this.url = url

        this.credentials = options.credentials || 'omit'
        this.headers = new Headers(options.headers)
        this.method = normalizeMethod(options.method || 'GET')
        this.mode = options.mode || null
        this.referrer = null

        if ((this.method === 'GET' || this.method === 'HEAD') && options.body) {
            throw new TypeError('Body not allowed for GET or HEAD requests')
        }
        this._initBody(options.body)
    }

    function decode(body) {
        var form = new FormData()
        body.trim().split('&').forEach(function (bytes) {
            if (bytes) {
                var split = bytes.split('=')
                var name = split.shift().replace(/\+/g, ' ')
                var value = split.join('=').replace(/\+/g, ' ')
                form.append(decodeURIComponent(name), decodeURIComponent(value))
            }
        })
        return form
    }

    function headers(xhr) {
        var head = new Headers()
        var pairs = xhr.getAllResponseHeaders().trim().split('\n')
        pairs.forEach(function (header) {
            var split = header.trim().split(':')
            var key = split.shift().trim()
            var value = split.join(':').trim()
            head.append(key, value)
        })
        return head
    }

    Body.call(Request.prototype)

    function Response(bodyInit, options) {
        if (!options) {
            options = {}
        }

        this._initBody(bodyInit)
        this.type = 'default'
        this.url = null
        this.status = options.status
        this.ok = this.status >= 200 && this.status < 300
        this.statusText = options.statusText
        this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
        this.url = options.url || ''
    }

    Body.call(Response.prototype)

    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;

    self.fetch = function (input, init) {
        // TODO: Request constructor should accept input, init
        var request
        if (Request.prototype.isPrototypeOf(input) && !init) {
            request = input
        } else {
            request = new Request(input, init)
        }

        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest()

            function responseURL() {
                if ('responseURL' in xhr) {
                    return xhr.responseURL
                }

                // Avoid security warnings on getResponseHeader when not allowed by CORS
                if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
                    return xhr.getResponseHeader('X-Request-URL')
                }

                return;
            }

            xhr.onload = function () {
                var status = (xhr.status === 1223) ? 204 : xhr.status
                if (status < 100 || status > 599) {
                    reject(new TypeError('Network request failed'))
                    return
                }
                var options = {
                    status: status,
                    statusText: xhr.statusText,
                    headers: headers(xhr),
                    url: responseURL()
                }
                var body = 'response' in xhr ? xhr.response : xhr.responseText;
                resolve(new Response(body, options))
            }

            xhr.onerror = function () {
                reject(new TypeError('Network request failed'))
            }

            xhr.open(request.method, request.url, true)

            if (request.credentials === 'include') {
                xhr.withCredentials = true
            }

            if ('responseType' in xhr && support.blob) {
                xhr.responseType = 'blob'
            }

            request.headers.forEach(function (value, name) {
                xhr.setRequestHeader(name, value)
            })

            xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
        })
    }
    self.fetch.polyfill = true
})();
///#source 1 1 /src/polyfills/Object.Observe.poly.js
/*
  Tested against Chromium build with Object.observe and acts EXACTLY the same,
  though Chromium build is MUCH faster

  Trying to stay as close to the spec as possible,
  this is a work in progress, feel free to comment/update

  Specification:
    http://wiki.ecmascript.org/doku.php?id=harmony:observe

  Built using parts of:
    https://github.com/tvcutsem/harmony-reflect/blob/master/examples/observer.js

  Limits so far;
    Built using polling... Will update again with polling/getter&setters to make things better at some point

TODO:
  Add support for Object.prototype.watch -> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/watch
*/
if (!Object.observe) {
    (function (extend, global) {
        "use strict";
        var isCallable = (function (toString) {
            var s = toString.call(toString),
                u = typeof u;
            return typeof global.alert === "object" ?
              function isCallable(f) {
                  return s === toString.call(f) || (!!f && typeof f.toString == u && typeof f.valueOf == u && /^\s*\bfunction\b/.test("" + f));
              } :
              function isCallable(f) {
                  return s === toString.call(f);
              }
            ;
        })(extend.prototype.toString);
        // isNode & isElement from http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
        //Returns true if it is a DOM node
        var isNode = function isNode(o) {
            return (
              typeof Node === "object" ? o instanceof Node :
              o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string"
            );
        }
        //Returns true if it is a DOM element
        var isElement = function isElement(o) {
            return (
              typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
              o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
          );
        }
        var _isImmediateSupported = (function () {
            return !!global.setImmediate;
        })();
        var _doCheckCallback = (function () {
            if (_isImmediateSupported) {
                return function _doCheckCallback(f) {
                    return setImmediate(f);
                };
            } else {
                return function _doCheckCallback(f) {
                    return setTimeout(f, 10);
                };
            }
        })();
        var _clearCheckCallback = (function () {
            if (_isImmediateSupported) {
                return function _clearCheckCallback(id) {
                    clearImmediate(id);
                };
            } else {
                return function _clearCheckCallback(id) {
                    clearTimeout(id);
                };
            }
        })();
        var isNumeric = function isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        };
        var sameValue = function sameValue(x, y) {
            if (x === y) {
                return x !== 0 || 1 / x === 1 / y;
            }
            return x !== x && y !== y;
        };
        var isAccessorDescriptor = function isAccessorDescriptor(desc) {
            if (typeof (desc) === 'undefined') {
                return false;
            }
            return ('get' in desc || 'set' in desc);
        };
        var isDataDescriptor = function isDataDescriptor(desc) {
            if (typeof (desc) === 'undefined') {
                return false;
            }
            return ('value' in desc || 'writable' in desc);
        };

        var validateArguments = function validateArguments(O, callback, accept) {
            if (typeof (O) !== 'object') {
                // Throw Error
                throw new TypeError("Object.observeObject called on non-object");
            }
            if (isCallable(callback) === false) {
                // Throw Error
                throw new TypeError("Object.observeObject: Expecting function");
            }
            if (Object.isFrozen(callback) === true) {
                // Throw Error
                throw new TypeError("Object.observeObject: Expecting unfrozen function");
            }
            if (accept !== undefined) {
                if (!Array.isArray(accept)) {
                    throw new TypeError("Object.observeObject: Expecting acceptList in the form of an array");
                }
            }
        };

        var Observer = (function Observer() {
            var wraped = [];
            var Observer = function Observer(O, callback, accept) {
                validateArguments(O, callback, accept);
                if (!accept) {
                    accept = ["add", "update", "delete", "reconfigure", "setPrototype", "preventExtensions"];
                }
                Object.getNotifier(O).addListener(callback, accept);
                if (wraped.indexOf(O) === -1) {
                    wraped.push(O);
                } else {
                    Object.getNotifier(O)._checkPropertyListing();
                }
            };

            Observer.prototype.deliverChangeRecords = function Observer_deliverChangeRecords(O) {
                Object.getNotifier(O).deliverChangeRecords();
            };

            wraped.lastScanned = 0;
            var f = (function f(wrapped) {
                return function _f() {
                    var i = 0, l = wrapped.length, startTime = new Date(), takingTooLong = false;
                    for (i = wrapped.lastScanned; (i < l) && (!takingTooLong) ; i++) {
                        if (_indexes.indexOf(wrapped[i]) > -1) {
                            Object.getNotifier(wrapped[i])._checkPropertyListing();
                            takingTooLong = ((new Date()) - startTime) > 100; // make sure we don't take more than 100 milliseconds to scan all objects
                        } else {
                            wrapped.splice(i, 1);
                            i--;
                            l--;
                        }
                    }
                    wrapped.lastScanned = i < l ? i : 0; // reset wrapped so we can make sure that we pick things back up
                    _doCheckCallback(_f);
                };
            })(wraped);
            _doCheckCallback(f);
            return Observer;
        })();

        var Notifier = function Notifier(watching) {
            var _listeners = [], _acceptLists = [], _updates = [], _updater = false, properties = [], values = [];
            var self = this;
            Object.defineProperty(self, '_watching', {
                enumerable: true,
                get: (function (watched) {
                    return function () {
                        return watched;
                    };
                })(watching)
            });
            var wrapProperty = function wrapProperty(object, prop) {
                var propType = typeof (object[prop]), descriptor = Object.getOwnPropertyDescriptor(object, prop);
                if ((prop === 'getNotifier') || isAccessorDescriptor(descriptor) || (!descriptor.enumerable)) {
                    return false;
                }
                if ((object instanceof Array) && isNumeric(prop)) {
                    var idx = properties.length;
                    properties[idx] = prop;
                    values[idx] = object[prop];
                    return true;
                }
                (function (idx, prop) {
                    properties[idx] = prop;
                    values[idx] = object[prop];
                    function getter() {
                        return values[getter.info.idx];
                    }
                    function setter(value) {
                        if (!sameValue(values[setter.info.idx], value)) {
                            Object.getNotifier(object).queueUpdate(object, prop, 'update', values[setter.info.idx]);
                            values[setter.info.idx] = value;
                        }
                    }
                    getter.info = setter.info = {
                        idx: idx
                    };
                    Object.defineProperty(object, prop, {
                        get: getter,
                        set: setter
                    });
                })(properties.length, prop);
                return true;
            };
            self._checkPropertyListing = function _checkPropertyListing(dontQueueUpdates) {
                var object = self._watching, keys = Object.keys(object), i = 0, l = keys.length;
                var newKeys = [], oldKeys = properties.slice(0), updates = [];
                var prop, queueUpdates = !dontQueueUpdates, propType, value, idx, aLength;

                if (object instanceof Array) {
                    aLength = self._oldLength;//object.length;
                    //aLength = object.length;
                }

                for (i = 0; i < l; i++) {
                    prop = keys[i];
                    value = object[prop];
                    propType = typeof (value);
                    if ((idx = properties.indexOf(prop)) === -1) {
                        if (wrapProperty(object, prop) && queueUpdates) {
                            self.queueUpdate(object, prop, 'add', null, object[prop]);
                        }
                    } else {
                        if (!(object instanceof Array) || (isNumeric(prop))) {
                            if (values[idx] !== value) {
                                if (queueUpdates) {
                                    self.queueUpdate(object, prop, 'update', values[idx], value);
                                }
                                values[idx] = value;
                            }
                        }
                        oldKeys.splice(oldKeys.indexOf(prop), 1);
                    }
                }

                if (object instanceof Array && object.length !== aLength) {
                    if (queueUpdates) {
                        self.queueUpdate(object, 'length', 'update', aLength, object);
                    }
                    self._oldLength = object.length;
                }

                if (queueUpdates) {
                    l = oldKeys.length;
                    for (i = 0; i < l; i++) {
                        idx = properties.indexOf(oldKeys[i]);
                        self.queueUpdate(object, oldKeys[i], 'delete', values[idx]);
                        properties.splice(idx, 1);
                        values.splice(idx, 1);
                        for (var i = idx; i < properties.length; i++) {
                            if (!(properties[i] in object))
                                continue;
                            var getter = Object.getOwnPropertyDescriptor(object, properties[i]).get;
                            if (!getter)
                                continue;
                            var info = getter.info;
                            info.idx = i;
                        }
                    };
                }
            };
            self.addListener = function Notifier_addListener(callback, accept) {
                var idx = _listeners.indexOf(callback);
                if (idx === -1) {
                    _listeners.push(callback);
                    _acceptLists.push(accept);
                }
                else {
                    _acceptLists[idx] = accept;
                }
            };
            self.removeListener = function Notifier_removeListener(callback) {
                var idx = _listeners.indexOf(callback);
                if (idx > -1) {
                    _listeners.splice(idx, 1);
                    _acceptLists.splice(idx, 1);
                }
            };
            self.listeners = function Notifier_listeners() {
                return _listeners;
            };
            self.queueUpdate = function Notifier_queueUpdate(what, prop, type, was) {
                this.queueUpdates([{
                    type: type,
                    object: what,
                    name: prop,
                    oldValue: was
                }]);
            };
            self.queueUpdates = function Notifier_queueUpdates(updates) {
                var self = this, i = 0, l = updates.length || 0, update;
                for (i = 0; i < l; i++) {
                    update = updates[i];
                    _updates.push(update);
                }
                if (_updater) {
                    _clearCheckCallback(_updater);
                }
                _updater = _doCheckCallback(function () {
                    _updater = false;
                    self.deliverChangeRecords();
                });
            };
            self.deliverChangeRecords = function Notifier_deliverChangeRecords() {
                var i = 0, l = _listeners.length,
                    //keepRunning = true, removed as it seems the actual implementation doesn't do this
                    // In response to BUG #5
                    retval;
                for (i = 0; i < l; i++) {
                    if (_listeners[i]) {
                        var currentUpdates;
                        if (_acceptLists[i]) {
                            currentUpdates = [];
                            for (var j = 0, updatesLength = _updates.length; j < updatesLength; j++) {
                                if (_acceptLists[i].indexOf(_updates[j].type) !== -1) {
                                    currentUpdates.push(_updates[j]);
                                }
                            }
                        }
                        else {
                            currentUpdates = _updates;
                        }
                        if (currentUpdates.length) {
                            if (_listeners[i] === console.log) {
                                console.log(currentUpdates);
                            } else {
                                _listeners[i](currentUpdates);
                            }
                        }
                    }
                }
                _updates = [];
            };
            self.notify = function Notifier_notify(changeRecord) {
                if (typeof changeRecord !== "object" || typeof changeRecord.type !== "string") {
                    throw new TypeError("Invalid changeRecord with non-string 'type' property");
                }
                changeRecord.object = watching;
                self.queueUpdates([changeRecord]);
            };
            self._checkPropertyListing(true);
        };

        var _notifiers = [], _indexes = [];
        extend.getNotifier = function Object_getNotifier(O) {
            var idx = _indexes.indexOf(O), notifier = idx > -1 ? _notifiers[idx] : false;
            if (!notifier) {
                idx = _indexes.length;
                _indexes[idx] = O;
                notifier = _notifiers[idx] = new Notifier(O);
            }
            return notifier;
        };
        extend.observe = function Object_observe(O, callback, accept) {
            // For Bug 4, can't observe DOM elements tested against canry implementation and matches
            if (!isElement(O)) {
                return new Observer(O, callback, accept);
            }
        };
        extend.unobserve = function Object_unobserve(O, callback) {
            validateArguments(O, callback);
            var idx = _indexes.indexOf(O),
                notifier = idx > -1 ? _notifiers[idx] : false;
            if (!notifier) {
                return;
            }
            notifier.removeListener(callback);
            if (notifier.listeners().length === 0) {
                _indexes.splice(idx, 1);
                _notifiers.splice(idx, 1);
            }
        };
    })(Object, this);
}