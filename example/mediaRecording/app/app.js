var app, viewModel, videoCrapChat, localMediaStream, ws;

var main = function () {
    // create an instance of viewModel
    viewModel = new ViewModel();
    // Apply the Bob Binders on tXSockets.MediaRecorderhe model
    Bob.apply(Bob.Binders).bind($("#crap-chat"), viewModel);
    // access the WebCam
    getUserMedia({
        audio: true,
        video: {
            mandatory: {
                maxWidth: 320,
                maxHeight: 240
            }
        }
    }, function (mediaStream) {
        // we got a mediaStream 
        localMediaStream = mediaStream;
        attachMediaStream($("#local-video"), mediaStream);
        // connect to the "realtime server"
        //webrtoxfordai.azurewebsites.net
        ws = new XSockets.WebSocket("wss://webrtoxfordai.azurewebsites.net:443/", ["shareclip"], {
            slug: location.hash.replace("#",""), handle: localStorage.getItem("handle") === null ? "John Doe" : localStorage.getItem("handle")
        });

      

        // capture a MediaStream and set up the;
        ws.controller("shareclip").onopen = function (/*connectionInfo*/) {
            // Create the app , as we are connected ;
            videoCrapChat = new VideoCrapChat(this, localMediaStream);

            videoCrapChat.oncliprecieved = function (arrayBuffer, metaData) {
                var blob = new Blob([arrayBuffer], { type: "video/webm" });
                var src = URL.createObjectURL(blob);
                var clip = {
                    fileName: function() {
                        return XSockets.Utils.randomString(16) + ".webm";
                    },
                    id: XSockets.Utils.randomString(8),
                    meta: metaData,
                    url: src,
                    remove: function () {
                        var el = $("#" + this.id);
                        el.parentNode.removeChild(el);
                    }
                };
                viewModel.videoClips.push(clip);
            };
       

            // will fire when the client join's or changes the Slug..
            videoCrapChat.onjoin = function (data) {
                viewModel.slug = data.slug;
                viewModel.handle = decodeURI(data.handle);
                location.hash = data.slug;

            };

            videoCrapChat.onhandles = function (a, b) {

            };

            videoCrapChat.onrecordcompleted = function (blob) {
                videoCrapChat.blobToArrayBuffer(blob, function (size, type) {
                    videoCrapChat.shareClip(this, {
                        size: size,
                        type: type,
                        id: (Math.random() * 9e6).toString(36)
                    });
                });
            };
            $("#btn-record").addEventListener("click", function () {
                videoCrapChat.startRecord(5000, 5000);
            });

            $("#btn-save").addEventListener("click", function() {
                videoCrapChat.saveChanges(viewModel.slug, viewModel.handle);
            });

        };

    }, function (getUserMediaError) { });
    
};

var VideoCrapChat = (function (recorder) {
    var ctor = function (controller, mediaStream) {
        var self = this;
        controller.on("clip", function (message, arrayBuffer) {
            self.oncliprecieved.apply(arrayBuffer, [
                arrayBuffer,
                message.data
            ]);
        });
        controller.on("joined", function (data) {
            self.onjoin.apply(self, [data]);

        });
        controller.on("handles", function (handles) {
            self.onhandles.apply(self, handles);
        });

        this.recorder = new recorder(mediaStream);
        this.recorder.oncompleted = function (blob, options) {
            self.onrecordcompleted.apply(this, [blob, options]);
        };
        this.controller = controller;
    };
    ctor.prototype.saveChanges = function (slug, handle) {
        localStorage.setItem("slug", slug);
        localStorage.setItem("handle", handle);
        this.controller.invoke("saveChanges", {
            slug: slug,
            handle: handle
        });
    };

    ctor.prototype.shareClip = function (arrayBuffer, metaData) {
        this.controller.invokeBinary("shareClip", arrayBuffer, metaData);
    };
    ctor.prototype.blobToArrayBuffer = function (blob, fn) {
        var fileReader = new FileReader();
        fileReader.onload = function () {
            fn.apply(this.result, [blob.size, blob.type]);
        };
        fileReader.readAsArrayBuffer(blob);
    };
    ctor.prototype.startRecord = function (tm) {
        this.recorder.start(tm);
    };
    ctor.prototype.cancelRecord = function () {
        this.recorder.stop();
    };
    ctor.prototype.onrecordcompleted = function (result) {
    };
    ctor.prototype.onrecordcanceled = function () {
    };
    ctor.prototype.oncliprecieved = function () {
    };
    ctor.prototype.onhandles = function() {

    };
    ctor.prototype.onjoin = function(d) {
      
    };

        ctor.prototype.setSlug = function(slug) {
            this.controller.invoke("setSlug", { slug: slug });
        };
    return ctor;
}
)(XSockets.MediaRecorder);

$(main);



