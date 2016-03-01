Bob.binders.registerBinder("blob", function (node,
   onchange, onadd, onremove) {
    return {
        updateProperty: function (value) {
            node.src = value;

        }
    };
});
Bob.binders.registerBinder("download", function (node,
   onchange, onadd, onremove) {
    return {
        updateProperty: function (value) {
            var _value = typeof (value) === "function" ? value() : value;
            node.setAttribute("download", _value);

        }
    };
});
