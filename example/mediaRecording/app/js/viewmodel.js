

    var ViewModel = function() {

        var model = function(handle,slug) {
            this.handle = handle || "John Doe";
            this.slug = slug;
        };

        model.prototype.videoClips = new Array();

        model.prototype.slug = new String();

        return model;

    }();
