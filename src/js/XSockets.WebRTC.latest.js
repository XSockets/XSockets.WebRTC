(function () {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());

var RTCPeerConnection = null;
var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;

if (navigator.mozGetUserMedia) {
    webrtcDetectedBrowser = "firefox";
    webrtcDetectedVersion =
    parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
    // The RTCPeerConnection object.
    RTCPeerConnection = mozRTCPeerConnection;
    // The RTCSessionDescription object.
    RTCSessionDescription = mozRTCSessionDescription;
    // The RTCIceCandidate object.
    RTCIceCandidate = mozRTCIceCandidate;
    // Get UserMedia (only difference is the prefix).
    // Code from Adam Barth.
    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    // Creates iceServer from the url for FF.
    createIceServer = function (url, username, password) {
        var iceServer = null;
        var url_parts = url.split(':');
        if (url_parts[0].indexOf('stun') === 0) {
            // Create iceServer with stun url.
            iceServer = {
                'url': url
            };
        }
        else if (url_parts[0].indexOf('turn') === 0) {
            if (webrtcDetectedVersion < 27) {
                // Create iceServer with turn url.
                // Ignore the transport parameter from TURN url for FF version <=27.
                var turn_url_parts = url.split("?");
                // Return null for createIceServer if transport=tcp.
                if (turn_url_parts[1].indexOf('transport=udp') === 0) {
                    iceServer = {
                        'url': turn_url_parts[0],
                        'credential': password,
                        'username': username
                    };
                }
            }
            else {
                // FF 27 and above supports transport parameters in TURN url,
                // So passing in the full url to create iceServer.
                iceServer = {
                    'url': url,
                    'credential': password,
                    'username': username
                };
            }
        }
        return iceServer;
    };
    // Attach a media stream to an element.
    attachMediaStream = function (element, stream) {
        element.mozSrcObject = stream;
        element.play();
    };
    reattachMediaStream = function (to, from) {
        to.mozSrcObject = from.mozSrcObject;
        to.play();
    };


}
else if (navigator.webkitGetUserMedia) {
    webrtcDetectedBrowser = "chrome";
    webrtcDetectedVersion =
    parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);
    // Creates iceServer from the url for Chrome.
    createIceServer = function (url, username, password) {
        var iceServer = null;
        var url_parts = url.split(':');
        if (url_parts[0].indexOf('stun') === 0) {
            // Create iceServer with stun url.
            iceServer = {
                'url': url
            };
        }
        else if (url_parts[0].indexOf('turn') === 0) {
            // Chrome M28 & above uses below TURN format.
            iceServer = {
                'url': url,
                'credential': password,
                'username': username
            };
        }
        return iceServer;
    };
    // The RTCPeerConnection object.
    RTCPeerConnection = webkitRTCPeerConnection;
    // Get UserMedia (only difference is the prefix).
    // Code from Adam Barth.
    getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
    // Attach a media stream to an element.
    attachMediaStream = function (element, stream) {
        if (typeof element.srcObject !== 'undefined') {
            element.srcObject = stream;
        }
        else if (typeof element.mozSrcObject !== 'undefined') {
            element.mozSrcObject = stream;
        }
        else if (typeof element.src !== 'undefined') {
            element.src = URL.createObjectURL(stream);
        }
        else {
            console.log('Error attaching stream to element.');
        }
    };
    reattachMediaStream = function (to, from) {
        to.src = from.src;
    };
}
else {
    console.log("Browser does not appear to be WebRTC-capable");
}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();
XSockets.PeerContext = function (guid, context) {
    this.PeerId = guid;
    this.Context = context;
};
window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.URL = window.URL || window.webkitURL;
XSockets.AudioAnalyser = (function () {
    function AudioAnalyser(stream, interval, cb) {
        var self = this;
        var buflen = 2048;
        var buffer = new Uint8Array(buflen);
        function autoCorrelate(buf, sampleRate) {
            var minSamples = 4;
            var maxSamples = 1000;
            var size = 1000;
            var bestOffset = -1;
            var bestCorrelation = 0;
            var rms = 0;
            var currentPitch = 0;
            if (buf.length < (size + maxSamples - minSamples)) return; // Not enough data
            for (var i = 0; i < size; i++) {
                var val = (buf[i] - 128) / 128;
                rms += val * val;
            }
            for (var offset = minSamples; offset <= maxSamples; offset++) {
                var correlation = 0;
                for (var i = 0; i < size; i++) {
                    correlation += Math.abs(((buf[i] - 128) / 128) - ((buf[i + offset] - 128) / 128));
                }
                correlation = 1 - (correlation / size);
                if (correlation > bestCorrelation) {
                    bestCorrelation = correlation;
                    bestOffset = offset;
                }
            }
            rms = Math.sqrt(rms / size);
            if ((rms > 0.01) && (bestCorrelation > 0.01)) {
                currentPitch = sampleRate / bestOffset;
                var result = {
                    confidence: bestCorrelation,
                    currentPitch: currentPitch,
                    fequency: sampleRate / bestOffset,
                    rms: rms,
                    timeStamp: new Date()
                };
                if (self.onresult) self.onresult(result);
                self.analyzerResult.unshift(result);
            }
        }
        function pitcher() {
            self.analyser.getByteTimeDomainData(buffer);
            autoCorrelate(buffer, self.audioContext.sampleRate);
        }
        var isEnabled = false;
        this.analyzerResult = [];
        this.isSpeaking = false;
        this.onResult = undefined;
        this.onAnalysis = undefined;
        this.audioContext = new AudioContext();
        var mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.smoothingTimeConstant = 0.8;
        this.analyser.fftSize = 2048;
        mediaStreamSource.connect(this.analyser);
        this.byteFrequencyData = function () {
            var array = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(array);
            return array;
        };
        this.enabled = function (state) {
            isEnabled = state || !isEnabled;
        };
        window.setInterval(function () {
            if (isEnabled) {
                pitcher();
            }
        }, (interval || 1000) / 10);
        setInterval(function () {
            if (isEnabled) {
                if (self.analyzerResult.length > 5) {
                    // How old is the latest confident audio analyze?
                    var now = new Date();
                    var result = self.analyzerResult[0];
                    var lastKnown = new Date(self.analyzerResult[0].timeStamp.getTime());
                    if ((now - lastKnown) > 1000) {
                        if (self.isSpeaking) {
                            result.isSpeaking = false;
                            if (self.onanalysis) self.onanalysis(result);
                            self.analyzerResult = [];
                        }
                        self.isSpeaking = false;
                    }
                    else {
                        if (!self.isSpeaking) {
                            result.isSpeaking = true;
                            if (self.onanalysis) self.onanalysis(result);
                        }
                        self.isSpeaking = true;
                    }
                }
            }
        }, 250);
        if (cb) cb();
    }
    return AudioAnalyser;
})();
XSockets.WebRTC = (function () {
    var instance = function (controller, settings) {
        if (controller instanceof XSockets.Controller === false) throw "you most provide a controller controller";
        var isAudioMuted = false;
        var self = this;
        var localStreams = [];
        var remoteStreams = [];

        var subscriptions = new XSockets.Subscriptions();



        this.PeerConnections = {};
        this.DataChannels = undefined;
        var defaults = {
            iceServers: [{
                "url": "stun:stun.l.google.com:19302"
            }],
            sdpConstraints: {
                optional: [],
                mandatory: {
                    OfferToReceiveAudio: true,
                    OfferToReceiveVideo: true

                }
            },
            streamConstraints: {
                mandatory: {},
                optional: []
            },
            sdpExpressions: []
        };
        var options = XSockets.Utils.extend(defaults, settings);

        this.addIceServers = function (iceServers) {
            iceServers.forEach(function (iceServer) {
                options.iceServers.push(iceServer);
            });
        }

        this.userMediaConstraints = new XSockets.UserMediaConstraints();

        this.bind = function (event, fn) {
            subscriptions.add(new XSockets.Subscription(event, fn));
            return this;
        };
        this.getSubscriptions = function () {
            return subscriptions;
        };
        this.unbind = function (event, callback) {
            subscriptions.remove(event);
            if (callback && typeof (callback) === "function") {
                callback();
            }
            return this;
        };
        this.dispatch = function (event, data) {

            var subscription = subscriptions.get(function (sub) {

                return sub.topic === event;
            });




            if (subscription) {
                subscription.fire(data);
            }
            var fire = Object.keys(self).filter(function (p) {
                return p === "on" + event;
            });


            fire.forEach(function (key) {


                if (self.hasOwnProperty(key)) self[key](data);
            });
        };

        this.supportsMediaSources = function () {
            /// <summary>Determin if the clients can enumerate and/or supports MediaSources</summary>
            return typeof window.MediaStreamTrack === 'undefined';
        };

        this.muteAudio = function (cb) {
            /// <summary>Toggle mute on all local streams</summary>
            /// <param name="cb" type="Object">function to be invoked when toggled</param>
            localStreams.forEach(function (a, b) {
                var audioTracks = a.getAudioTracks();
                if (audioTracks.length === 0) {
                    return;
                }
                if (isAudioMuted) {
                    for (i = 0; i < audioTracks.length; i++) {
                        audioTracks[i].enabled = true;
                    }
                }
                else {
                    for (i = 0; i < audioTracks.length; i++) {
                        audioTracks[i].enabled = false;
                    }
                }
            });
            isAudioMuted = !isAudioMuted;
            if (cb) cb(isAudioMuted);
        };
        this.hasStream = function () {
            /// <summary>Determin of there is media streams attach to the local peer</summary>
            return localStreams.length > 0;
        };
        this.leaveContext = function () {
            /// <summary>Leave the current context (hang up on all )</summary>
            controller.invoke("leaveContext");
            return this;
        };
        this.changeContext = function (contextGuid) {
            /// <summary>Change context on controller</summary>
            /// <param name="contextGuid" type="Object">Unique identifer of the context to 'join'</param>
            controller.invoke("changecontext", {
                context: contextGuid
            });
            for (var peer in this.PeerConnections) {
                this.PeerConnections[peer].Connection.close();
                self.dispatch(XSockets.WebRTC.Events.onconnectionlost, {
                    PeerId: peer
                });
                delete this.PeerConnections[peer];
            }
            return this;
        };
        this.connectToContext = function () {
            /// <summary>Connect to the current context</summary>
            for (var peer in this.PeerConnections) {
                this.PeerConnections[peer].Connection.close();
                delete this.PeerConnections[peer];
            }
            controller.invoke("connectToContext");
            return this;
        };
        this.getLocalStreams = function () {
            /// <summary>Get local streams</summary>
            return localStreams;
        };
        this.removeStream = function (id, fn) {
            /// <summary>Remove the specified local stream</summary>
            /// <param name="id" type="Object">Id of the media stream</param>
            /// <param name="fn" type="Object">callback function invoked when remote peers notified and stream removed.</param>




            localStreams.forEach(function (stream, index) {
                if (stream.id === id) {
                    localStreams.splice(index, 1);
                    for (var peer in self.PeerConnections) {
                        self.PeerConnections[peer].Connection.removeStream(stream);
                      
                        
                        controller.invoke("removestream", {
                            recipient: peer,
                            streamId: id
                        });
                        if (fn) fn(id);
                    }
                }
            });
        };

        this.getRemoteStreams = function () {
            return remoteStreams;
        };

        this.removeAllStreams = function () {
            remoteStreams.forEach(function (stream) {
                self.dispatch(XSockets.WebRTC.Events.remoteStreams, stream);
            });
        };


        this.getRemotePeers = function () {
            /// <summary>Returns a list of remotePeers (list of id's)</summary>
            var ids = [];
            for (var peer in self.PeerConnections)
                ids.push(peer);
            return ids;
        };
        this.refreshStreams = function (id, fn) {
            /// <summary>Reattach streams and renegotiate</summary>
            /// <param name="id" type="Object">PeerConnection id</param>
            /// <param name="fn" type="Object">callback that will be invoked when completed.</param>

            localStreams.forEach(function (stream, index) {
                self.PeerConnections[id].Connection.removeStream(localStreams[index]);
            });


            self.createOffer({
                PeerId: id
            });

            if (fn) fn(id);
        };
        this.addLocalStream = function (stream, cb) {
            if (!stream.id) stream.id = XSockets.Utils.guid();
            for (var peer in self.PeerConnections) {
                self.PeerConnections[peer].Connection.addStream(stream);
            }
            var index = localStreams.push(stream);
            controller.invoke("addStream", {
                streamId: stream.id,
                description: ""
            });
            self.dispatch(XSockets.WebRTC.Events.onlocalstream, stream);
            if (cb) cb(stream, index);
            return this;
        };
        this.removePeerConnection = function (id, fn) {
            /// <summary>Remove the specified Peerconnection</summary>
            /// <param name="id" type="guid">Id of the PeerConnection. Id is the PeerId of the actual PeerConnection</param>
            /// <param name="fn" type="function">callback function invoked when the PeerConnection is removed</param>
            //controller.publish("peerconnectiondisconnect", {
            //    Recipient: id,
            //    Sender: self.CurrentContext.PeerId
            //});
            if (self.PeerConnections[id] !== undefined) {
                try {
                    self.PeerConnections[id].Connection.close();
                    self.dispatch(XSockets.WebRTC.Events.onconnectionlost, {
                        PeerId: id
                    });
                }
                catch (err) { }
            };
            delete self.PeerConnections[id];
            if (fn) fn();
        };
        this.getUserMedia = function (constraints, success, error) {
            /// <summary>get a media stream</summary>
            /// <param name="userMediaSettings" type="Object">connstraints. i.e .usersdpConstraints.hd()</param>
            /// <param name="success" type="Object">callback function invoked when media stream captured</param>
            /// <param name="error" type="Object">callback function invoked on faild to get the media stream </param>

            if (constraints instanceof XSockets.UserMediaConstraint) {
                delete constraints.applySources;
            }

            window.getUserMedia(constraints, function (stream) {
                if (!stream.id) stream.id = XSockets.Utils.guid();
                localStreams.push(stream);
                controller.invoke("addStream", {
                    streamId: stream.id,
                    description: ""
                });
                self.dispatch(XSockets.WebRTC.Events.onlocalstream, stream);
                if (success && typeof (success) === "function") success(self.CurrentContext);
            }, function (ex) {
                if (ex && typeof (ex) === "function") error(ex);
                self.onerror(ex);
            });
            return this;
        };
        this.addDataChannel = function (dc) {
            /// <summary>Add a XSockets.WebRTC.DataChannel. Channel will be offered to remote peers</summary>
            /// <param name="dc" type="Object">XSockets.WebRTC.DataChannel to add</param>
            /// <param name="success" type="Object">callback function invoked when added.</param>
            this.DataChannels = this.DataChannels || {};
            if (!this.DataChannels.hasOwnProperty(dc.name)) {
                this.DataChannels[dc.name] = dc;
            }
            else {
                throw "A RTCDataChannel named '" + dc.Name + "' already exists and cannot be created.";
            }
        };
        this.removeDataChannel = function (name, cb) {
            /// <summary>Remove a Sockets.WebRTC.DataChannel </summary>
            /// <param name="name" type="Object">name of the XSockets.WebRTC.DataChannel to remove from offers</param>
            /// <param name="success" type="Object">callback function invoked when removed</param>
            if (this.DataChannels.hasOwnProperty(name)) {
                delete this.DataChannels[name];
                // remove delegates from peers..
                for (var pc in this.PeerConnections) {
                    this.PeerConnections[pc].RTCDataChannels[name].close();
                    delete this.PeerConnections[pc].RTCDataChannels[name];
                }
            }
            else {
                throw "A RTCDataChannel named '" + name + "' does not exists.";
            }
        };


        this.onerror = function (ex) { console.log(ex); };

        this.Connections = [];
        this.rtcPeerConnection = function (configuration, peerId, cb) {
            var that = this;
            this.PeerId = peerId;
            this.RTCDataChannels = {};
            if (cb) cb(peerId);
            var rtcDataChannelsRecieve = {};
            if ((webrtcDetectedBrowser === 'chrome' && webrtcDetectedVersion <= 31) || webrtcDetectedBrowser === 'firefox') {
                if (typeof (self.DataChannels) === "object") {
                    configuration.sdpConstraints.optional.push({
                        RtpDataChannels: true
                    });
                }
            }
            this.Connection = new RTCPeerConnection({
                iceServers: configuration.iceServers || {},
                rtcpMuxPolicy: "require", bundlePolicy: "max-bundle"

            }, null);
            this.Connection.oniceconnectionstatechange = function (event) {
                var target = event.target;
                if (target.iceConnectionState === "disconnected"){
                    self.dispatch(XSockets.WebRTC.Events.onconnectionlost, {
                        PeerId: that.PeerId
                    });
                } else if (target.iceConnectionState === "connected") {
                    self.dispatch(XSockets.WebRTC.Events.onconnectioncreated, {
                        PeerId: that.PeerId
                    });
                };
               
                self.dispatch(event.type, event);
            };
            this.Connection.onnegotiationneeded = function (event) {
                self.dispatch(event.type, event);
            };
            this.Connection.onremovestream = function (event) {
                self.dispatch(event.type, event);
            };
            this.Connection.onsignalingstatechange = function (event) {
                self.dispatch(event.type, event);
            };
            // If there is dataChannels attach, offer em
            for (var dc in self.DataChannels) {
                var dataChannel = self.DataChannels[dc];
                this.RTCDataChannels[dataChannel.name] = this.Connection.createDataChannel(dataChannel.name, configuration.dataChannelConstraints);
                this.Connection.ondatachannel = function (event) {
                    var receiveChannel = event.channel;
                    receiveChannel.onmessage = function (messageEvent) {
                        var subs = dataChannel.subscriptions;
                        if (typeof messageEvent.data === "string") {
                            var msg = JSON.parse(messageEvent.data);
                            subs.get(function (s) {
                                return s.topic == msg.T;
                            }).fire(msg.D);
                        }
                        else {

                            var bm = new XSockets.BinaryMessage();
                            bm.extractMessage(messageEvent.data, function (m) {
                                var find = m.topic;
                                subs.get(function (s) {
                                    return s.topic == find;
                                }).fire(m);
                            });
                        }
                    };
                    receiveChannel.onopen = function (event) {
                        if (dataChannel.onopen) dataChannel.onopen(that.PeerId, event.target);
                    };
                    receiveChannel.onclose = function (event) {
                        if (dataChannel.onclose) dataChannel.onclose(that.PeerId, event.target);
                    };
                    rtcDataChannelsRecieve[event.label] = event.channel;
                };
                dataChannel.onpublishbinary = function (topic, bytes, data) {
                    for (var p in self.PeerConnections) {
                        if (self.PeerConnections[p].RTCDataChannels[dataChannel.name].readyState === "open") {
                            var msg = new XSockets.Message(topic, data || {}, dataChannel.name);
                            var blob = new XSockets.BinaryMessage(msg, bytes, function (result) {
                                console.log(result);
                                self.PeerConnections[p].RTCDataChannels[dataChannel.name].send(result.buffer);
                            });
                        }
                    }
                };
                dataChannel.onpublishbinaryTo = function (id, topic, bytes, data) {
                    var msg = new XSockets.Message(topic, data || {}, dataChannel.name);
                    if (self.PeerConnections[id]) {
                        var blob = new XSockets.BinaryMessage(msg, bytes, function (result) {
                            self.PeerConnections[id].RTCDataChannels[dataChannel.name].send(result.buffer);
                        });
                    }
                }
                dataChannel.onpublish = function (topic, data) {
                    var message = new XSockets.Message(topic, data);
                    for (var p in self.PeerConnections) {
                        if (self.PeerConnections[p].RTCDataChannels[dataChannel.name].readyState === "open") self.PeerConnections[p].RTCDataChannels[dataChannel.name].send(JSON.stringify(message));
                    }
                };
                dataChannel.onpublishTo = function (id, topic, data) {
                    var message = new XSockets.Message(topic, data);
                    if (self.PeerConnections[id]) self.PeerConnections[id].RTCDataChannels[dataChannel.name].send(JSON.stringify(message));
                };
            };

            this.Connection.onaddstream = function (event) {
                var match = remoteStreams.findIndex(function (pre) {
                    return pre.id === event.stream.id;
                });
                if (match === -1) {
                    remoteStreams.push({ id: event.stream.id, peerId: that.PeerId });
                    self.dispatch(XSockets.WebRTC.Events.onremotestream, {
                        PeerId: that.PeerId,
                        stream: event.stream
                    });
                };
            };
            this.Connection.onicecandidate = function (event) {

                if (event.candidate) {
                    var candidate = {
                        type: 'candidate',
                        label: event.candidate.sdpMLineIndex,
                        id: event.candidate.sdpMid,
                        candidate: event.candidate.candidate
                    };
                    controller.invoke("contextsignal", {
                        sender: self.CurrentContext.PeerId,
                        recipient: that.PeerId,
                        message: JSON.stringify(candidate)
                    });
                }
            };

        };
        this.createOffer = function (peer) {
            if (!peer) return;
            self.PeerConnections[peer.PeerId] = new self.rtcPeerConnection(options, peer.PeerId);
            localStreams.forEach(function (a, b) {
                self.PeerConnections[peer.PeerId].Connection.addStream(a, options.streamConstraints);
            });


            self.PeerConnections[peer.PeerId].Connection.createOffer(function (localDescription) {
                options.sdpExpressions.forEach(function (expr, b) {
                    localDescription.sdp = expr(localDescription.sdp);
                }, function (ex) {
                    self.onerror(ex);
                });
                self.PeerConnections[peer.PeerId].Connection.setLocalDescription(localDescription);
                controller.invoke("contextsignal", {
                    Sender: self.CurrentContext.PeerId,
                    Recipient: peer.PeerId,
                    Message: JSON.stringify(localDescription)
                });
            }, function (ex) { self.onerror(ex); }, options.sdpConstraints);

        };
        self.bind("connect", function (peer) {
            self.createOffer(peer);
        });
        self.bind("candidate", function (event) {
            var candidate = JSON.parse(event.Message);
            if (!self.PeerConnections[event.Sender]) return;
            self.PeerConnections[event.Sender].Connection.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.label,
                candidate: candidate.candidate
            }));
        });
        self.bind("answer", function (event) {
            self.dispatch(XSockets.WebRTC.Events.onanswer, {
                PeerId: event.Sender
            });
            self.PeerConnections[event.Sender].Connection.setRemoteDescription(new RTCSessionDescription(JSON.parse(event.Message)));
        });
        self.bind("offer", function (event) {

            self.dispatch(XSockets.WebRTC.Events.onoffer, {
                PeerId: event.Sender
            });
            self.PeerConnections[event.Sender] = new self.rtcPeerConnection(options, event.Sender);
            self.PeerConnections[event.Sender].Connection.setRemoteDescription(new RTCSessionDescription(JSON.parse(event.Message)));

            localStreams.forEach(function (a, b) {
                self.PeerConnections[event.Sender].Connection.addStream(a, options.streamConstraints);
            });

            self.PeerConnections[event.Sender].Connection.createAnswer(function (description) {
                self.PeerConnections[event.Sender].Connection.setLocalDescription(description);
                options.sdpExpressions.forEach(function (expr, b) {
                    description.sdp = expr(description.sdp);
                }, function (ex) { self.onerror(ex); });
                var answer = {
                    Sender: self.CurrentContext.PeerId,
                    Recipient: event.Sender,
                    Message: JSON.stringify(description)
                };
                controller.invoke("contextsignal", answer);
            }, function (ex) { self.onerror(ex); }, options.sdpConstraints);
        });


        controller.contextcreated = function (context) {

            self.CurrentContext = new XSockets.PeerContext(context.PeerId, context.Context);
            self.dispatch(XSockets.WebRTC.Events.oncontextcreated, context);
        };



        controller.contextsignal = function (signal) {
            var msg = JSON.parse(signal.Message);
            self.dispatch(msg.type, signal);
          
        };
        controller.contextchanged = function (change) {

            self.dispatch(XSockets.WebRTC.Events.oncontextchange, change);
        };
        controller.contextconnect = function (peers) {
            peers.forEach(function (peer) {
                self.dispatch("connect", peer);
                self.dispatch(XSockets.WebRTC.Events.onconnectionstart, peer);
            });
        };
        controller.connectiondisconnect = function (peer) {
            //if (self.PeerConnections[peer.Sender] !== undefined) {
            //    self.PeerConnections[peer.Sender].Connection.close();
            //    self.dispatch(XSockets.WebRTC.Events.onconnectionlost, {
            //        PeerId: peer.Sender
            //    });
                delete self.PeerConnections[peer.Sender];
           // }
        };
        controller.streamadded = function (event) {
            self.dispatch(XSockets.WebRTC.Events.onlocalstreamcreated, event);
        };
        controller.streamremoved = function (event) {
           
            self.dispatch(XSockets.WebRTC.Events.onremotestreamlost, {
                PeerId: event.Sender,
                StreamId: event.StreamId
            });
        };
        controller.connectionlost = function (peer) {
         
            //self.dispatch(XSockets.WebRTC.Events.onconnectionlost, {
            //    PeerId: peer.PeerId
            //});
            //if (self.PeerConnections[peer.PeerId] !== undefined) {
            //    self.PeerConnections[peer.PeerId].Connection.close();
            //    delete self.PeerConnections[peer.PeerId];
            //};
        };
    }
    return instance;
})();


XSockets.WebRTC.MediaSource = (function () {
    var mediaSources = function () {
        this.getSources = function (cb) {
            if (typeof window.MediaStreamTrack === 'undefined') {
                console.log('This browser does not support MediaStreamTrack');
                return null;
            } else {
                window.MediaStreamTrack.getSources(function (results) {
                    var sources = results.map(function (sourceInfo, i) {
                        return { id: sourceInfo.id, kind: sourceInfo.kind, label: sourceInfo.label || sourceInfo.kind + " - " + i };
                    });
                    cb(sources);
                });
            }
            return this;
        };
    };
    return mediaSources;
})();

XSockets.UserMediaConstraints = (function () {
    var constraints = function () {
        this.options = ["qvga", "vga", "hd"];

        this.audioOnly = function () {
            return new XSockets.UserMediaConstraint({
                video: false,
                audio: true
            });
        };

        this.qvga = function (audio) {
            return new XSockets.UserMediaConstraint({
                video: {
                    mandatory: {
                        maxWidth: 320,
                        maxHeight: 180
                    }
                },
                audio: typeof (audio) !== "boolean" ? false : audio,
            });
        };
        this.svga = function (audio) {
            return new XSockets.UserMediaConstraint({
                video: {
                    mandatory: {
                        maxWidth: 800,
                        maxHeight: 600
                    },
                    optional: []
                },
                audio: typeof (audio) !== "boolean" ? false : audio
            });
        };
        this.xga = function (audio) {
            return new XSockets.UserMediaConstraint({
                video: {
                    mandatory: {
                        maxWidth: 1024,
                        maxHeight: 768
                    },
                    optional: []
                },
                audio: typeof (audio) !== "boolean" ? false : audio
            });
        };
        this.vga = function (audio) {
            return new XSockets.UserMediaConstraint({
                video: {
                    mandatory: {
                        maxWidth: 640,
                        maxHeight: 360
                    },
                    optional: []
                },
                audio: typeof (audio) !== "boolean" ? false : audio
            });
        };
        this.hd = function (audio) {
            return new XSockets.UserMediaConstraint({
                video: {
                    mandatory: {
                        minWidth: 1280,
                        minHeight: 720
                    }, optional: []
                },
                audio: typeof (audio) !== "boolean" ? false : audio
            });
        };
        this.create = function (w, h, audio) {
            return new XSockets.UserMediaConstraint({
                video: {
                    mandatory: {
                        minWidth: w,
                        minHeight: h
                    }
                },
                optional: [],
                audio: typeof (audio) !== "boolean" ? false : audio
            });
        };
    };
    return constraints;
})();

XSockets.MediaRecorder = (function () {
    var recorder = function (stream, options) {
        var self = this;
        this.options = XSockets.Utils.extend( options || {} , {
             chunkSize: 500,
             mimeType: "video/webm", ignoreMutedMedia: false, recorderId: XSockets.Utils.guid()
        });
        var mediaRecorder = new MediaRecorder(stream, this.options);
        var handleStop = function (event) {
            self.isRecording = false;
            var blob = new Blob(self.blobs, { type: self.options.mimeType });
            self.oncompleted.apply(self, [blob, URL.createObjectURL(blob)]);
        };
        var handleDataAvailable = function (event) {
            if (event.data && event.data.size > 0) {
                self.blobs.push(event.data);
                if (self.onchunk) self.onchunk.apply(event, [event.data, self.options.recorderId]);
            }
        };
        mediaRecorder.onstop = handleStop;
        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.onchunk = undefined;
        this.mediaRecorder = mediaRecorder;
    };
    recorder.prototype.oncompleted = function () {
    };

    recorder.prototype.stop = function() {
        var mediaRecorder = this.mediaRecorder;
        mediaRecorder.stop();
    };




    recorder.prototype.blobs = [];
    recorder.prototype.start = function (stopafter) {
        this.blobs.length = 0;
        this.isRecording = true;
        var mediaRecorder = this.mediaRecorder;
        var timeOut = window.setTimeout(function () {
           
            mediaRecorder.stop();
            window.clearTimeout(timeOut);
        }, stopafter || 3000);
        mediaRecorder.start(this.options.chunkSize);
    };
    recorder.prototype.isRecording = false;
    return recorder;

})();


XSockets.Utils.blobToArrayBuffer = function (blob, fn) {
    var fileReader = new FileReader();
    fileReader.onload = function () {
        fn.apply(this.result, [blob.size, blob.type]);
    };
    fileReader.readAsArrayBuffer(blob);
};


XSockets.WebRTC.AudioPlayer = (function () {
    function audio() {
        this.audioBuffers = {};
        this.keys = [];
        this.context = new AudioContext();
        this.sources = {};
    }
    audio.prototype.load = function (key, url, fn) {
        var that = this;
        this.keys.unshift(key);
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            that.context.decodeAudioData(request.response, function (buffer) {
                that.audioBuffers[key] = buffer;
                if (fn) fn(key);
                if (that.completed)
                    that.completed(key);

            }, function (err) {
                that.error(err);
            });
        };
        request.send();
        return this;
    };

    audio.prototype.createBuffer = function (key, arrayBuffer) {
        var that = this;
        this.keys.unshift(key);

        var source = this.context.createBufferSource(); // Create Sound Source 
        var buffer = this.context.createBuffer(arrayBuffer, true);
        source.buffer = buffer; // Add Buffered Data to Object 
        source.connect(context.destination); // Connect Sound Source to Output 
        source.start(context.currentTime); // Play the Source when Triggered


    };

    audio.prototype.error = function () {
        console.error(error);
    }

    audio.prototype.completed = function () {
    };
    audio.prototype.play = function (key) {
        this.sources[key] = this.context.createBufferSource();

        this.sources[key].buffer = this.audioBuffers[key];
        this.sources[key].connect(this.context.destination);
        if (!this.sources[key].start) {
            this.sources[key].noteOn(0);
        } else {
            this.sources[key].start();
        }
        return this;
    };
    audio.prototype.pause = function (key) {
        this.sources[key].stop(0);
    };
    return audio;
})();

XSockets.WebRTC.MediaSourceChunksPlayer = (function() {
    var ctor = function(audioEl) {
        var self = this;
        var mediaSource = new MediaSource();
        this.audioEl = document.querySelector(audioEl);
        var sourceBuffer;
        var loadedBuffers = [];
        var itemsAppendedToSourceBuffer = 0;
        this.addChunk = function(result) {
            loadedBuffers.push(result);

            if (!sourceBuffer.updating) {
                getNextBuffer();
            }
            if (loadedBuffers.length == 0) {
                startPlayback();
            }
        }

        function getNextBuffer() {
            if (loadedBuffers.length) {
                sourceBuffer.appendBuffer(loadedBuffers.shift());
                itemsAppendedToSourceBuffer++;
            }
        }

        function sourceOpenCallback() {
            sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            sourceBuffer.addEventListener('updateend', getNextBuffer, false);
            console.log("sourceOpenCallback");
        }

        function sourceCloseCallback() {
            mediaSource.removeSourceBuffer(sourceBuffer);
        }

        function sourceEndedCallback() {
        }

        function startPlayback() {
            if (self.audioEl.paused) {
                self.audioEl.play();
            }
        }

        mediaSource.addEventListener('sourceopen', sourceOpenCallback, false);
        mediaSource.addEventListener('webkitsourceopen', sourceOpenCallback, false);
        mediaSource.addEventListener('sourceclose', sourceCloseCallback, false);
        mediaSource.addEventListener('webkitsourceclose', sourceCloseCallback, false);
        mediaSource.addEventListener('sourceended', sourceEndedCallback, false);
        mediaSource.addEventListener('webkitsourceended', sourceEndedCallback, false);

        self.audioEl.src = window.URL.createObjectURL(mediaSource);

        var audioContext = new AudioContext();
        var source = audioContext.createMediaElementSource(self.audioEl);
        source.connect(audioContext.destination);

    }
    return ctor;
}());

XSockets.UserMediaConstraint = (function () {
    var constraint = function (c) {
        var self = this;
        this.applySources = function () {
        };
        if (arguments.length > 2) {
            for (var a = 1; a < arguments.length; a++) {
                this.extend(self, arguments[a]);
            }
        } else {
            for (var i in c) {
                self[i] = c[i];
            }
        }
        this.applySources = function (videoSourceId, audioSourceId) {

            if (videoSourceId !== "") {
                if (self.video) (self["video"].optional = []).push({ sourceid: videoSourceId });
            } else self.video = false;

            if (audioSourceId !== "") {
                if (self.audio) (self["audio"].optional = []).push({ sourceid: audioSourceId });
            } else self.audio = false;
            return this;
        }
        return this;
    }
    return constraint;
})();


XSockets.WebRTC.DataChannel = (function () {
    function channel(name) {
        var self = this;
        this.subscriptions = new XSockets.Subscriptions();
        this.name = name;
        this.subscribe = function (topic, cb) {
            self.subscriptions.add(new XSockets.Subscription(topic, cb));
            return this;
        };
        this.publishBinary = function (topic, bytes, data) {

            if (!self.onpublishbinary) return this;

            self.onpublishbinary(topic, bytes, data);
            return this;
        }

        this.publishBinaryTo = function (id, topic, bytes, data) {
            if (!self.onpublishbinaryTo) return this;
            self.onpublishbinaryTo(topic, bytes, data);
            return this;
        }
        this.publish = function (topic, data, cb) {
            if (!self.onpublish) return this;
            self.onpublish(topic, data);
            if (cb) cb(data);
            return this;
        };
        this.publishTo = function (peerId, topic, data, cb) {
            if (!self.onpublishTo) return this;
            self.onpublishTo(peerId, topic, data);
            if (cb) cb(data);
            return this;
        };
        this.unsubscribe = function (topic, cb) {
            self.subscriptions.remove(topic);
            if (cb) cb();
            return this;
        };
        this.onpublish = undefined;
        this.onclose = undefined;
        this.onopen = undefined;
    }
    return channel;
})();
XSockets.WebRTC.Events = {
    onlocalstream: "localstream",
    onlocalstreamcreated: "streamadded",
    onremotestream: "remotestream",
    onremotestreamlost: "remotestreamlost",
    oncontextchange: "contextchanged",
    oncontextcreated: "contextcreated",
    onconnectionstart: "connectionstarted",
    onconnectioncreated: "connectioncreated",
    onconnectionlost: "connectionlost",
    onoffer: "_onoffer",
    onanswer: "_onanswer"
};