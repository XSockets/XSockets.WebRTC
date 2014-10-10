
#XSockets.NET - WebRTC

This repo contains the full source code of the [XSockets.NET][1]  WebRTC 

###Demo

We dropped a simple example (index.htm) that gives you a very simple "video conference". The demo allows 1-n clients to connect and share MediaStreems.

http://xsockets.github.io/WebRTC/

##Pre-Req

In order to be able to use the XSockets.NET PeerBroker and the WebRTC JavaScript API's of ours. You need to install XSockets.NET into your application. Since you are going to have a web-application we recomend you to use MVC, but it is up to you.

Install XSockets.NET Realtime framework into your Visual Studio solution by using the [Nuget][2] package. 

Open the Package Manager console and type the following command.

    PM> Install-Package XSockets.Sample.WebRTC

##Testing WebRTC
When installation is completed just follow these steps

 1. Under WebRTCSample\Client right click on index.html and select "set as startpage"
 2. Right click the project and select properties.
 3. Under the "Web" tab go to the "Servers" section and set Use Visual Studio Development Server
 4. Open a few instances of chrome to the same URL and try it out.

To build your own conference solution is really easy. Consult the [XSockets.NET developer forum][1] for help and guidance.

**NOTE: Remember to use Chrome!** 

*To learn more about the WebRTC API, read the API-Guide below*

----------


  [1]: https://groups.google.com/forum/?hl=en#!forum/xsocketsgroup
  
##JavaScript API - Documentation

Here follows a brief description of the JavaScript API. 

###Create a PeerConnection
In order to create a PeerConnection (`XSockets.WebRTC`) you need a PeerBroker to broker connections.

    var broker = new XSockets.WebSocket("ws://localhost:4502/MyCustomBroker");
    broker.subscribe(XSockets.Events.open, function(brokerClient) {
     console.log("Broker Connected and client Created", brokerClient)
     
     // Create the PeerConnection ( XSockets.WebRTC object )
     rtc = new XSockets.WebRTC(broker);
    });


####Configuration (Customize)

By passing a custom *configuration* into the ctor of the XSockets.WebRTC(broker,configuration) you can easily modify the iceServers, sdpConstraints and streamConstraints and parameters.  You can also provide a set of expressions (sdpExpressions) that will be abale to intercept the SDP messages.
#####default configuration

    {
    "iceServers": [{
        "url": "stun:stun.l.google.com:19302"
    }],
    "sdpConstraints": {
        "optional": [],
        "mandatory": {
            "OfferToReceiveAudio": true,
            "OfferToReceiveVideo": true
        }
    },
    "streamConstraints": {
        "mandatory": {},
        "optional": []
    },
    "sdpExpressions": []
}

##### Example modified iceServers & streamConstraints

    var rtc = new XSockets.WebRTC(broker, {
    iceServers: [{
        url: 'stun:404.idonotexist.net'
    }],
    streamConstraints: {
        optional: [{
            'bandwidth': 500
        }]
    }});
    
    
    // Will give you the following result;
    
    {
    "iceServers": [{
        "url": "stun:404.idonotexist.net"
    }],
    "sdpConstraints": {
        "optional": [],
        "mandatory": {
            "OfferToReceiveAudio": true,
            "OfferToReceiveVideo": true
        }
    },
    "streamConstraints": {
        "optional": [{
            "bandwidth": 500
        }]
    },
    "sdpExpressions": []
}
    
    
#####sdpExpressions 

This expression parses and modifies the sdp and limits the video bandwidth 256 kilobits per second.

    ...
    
    expression:[
     function (sdp) { 
         return sdp.replace(/a=mid:video\r\n/g,
             'a=mid:video\r\nb=AS:256\r\n');
    }]

Expressions are passed 

###Context Events
####OnContextCreated
This fires when you have a connection to the Broker controller

    rtc.bind(XSockets.WebRTC.Events.onContextCreated, function(ctx){
        console.log('OnContextCreated',ctx);
    });
    
    // or use
    
    rtc.oncontextcreated = function(ctx) {
      // do op
    }
    

####OnContextChange
This fires when something happens on the context. Someone joins or leaves! You will get a list of peers on the current context.

    rtc.bind(XSockets.WebRTC.Events.onContextChange, function(ctx){
        console.log('OnContextChange',ctx);
    });
    
    // or use
    
    rtc.oncontextchange = function(ctx) {
     // do op
    });
    
    
    
###Context Methods
####Change Context
Changes your context on the broker. Pass in the Id of the context to join!

    rtc.changeContext(ctxId);
    
####Leave Context
Leave the current context... Hang up on all other peers
    
    rtc.leaveContext();

###Peer Events
####OnPeerConnectionStarted
Fires when the client starts to negotiate with the server

    rtc.bind(XSockets.WebRTC.Events.onPeerConnectionStarted, function(peer){
        console.log('OnPeerConnectionStarted',peer);
    });
    
    // or use
    
    rtc.onpeerconnectionstarted = function(peer){
    
    });
    
    

####OnPeerConnectionCreated
Fires when the client has established a peer connection

    rtc.bind(XSockets.WebRTC.Events.onPeerConnectionCreated, function(peer){
        console.log('OnPeerConnectionCreated',peer);
    });
    
    // or use
    
    rtc.onpeerconnectioncreated = functction(peer){
        // do op
    });

####OnPeerConnectionLost
Fires when a peer connection is lost (destroyed)

    rtc.bind(XSockets.WebRTC.Events.onPeerConnectionLost, function(peer){
        console.log('OnPeerConnectionLost',peer);
    });
    
    // or use 
    
    rtc.onpeerconnectionlost = function(peer){
    
    });
    

###Peer Methods
####Remove Peer Connection
Lets you remove a connection from the current context.

    rtc.removePeerConnection(peerId,callback);
    
####Get Remote Peers
Get a list of peerId's on the current context
    
    rtc.getRemotePeers();
    
    // returns an Array of PeerID's  i.e ["d383b53bb29947b5b1f62903bbc64d82"]
    
    
###MediaStream Methods
#### getUserMedia(constrints,success,failure)
Attach a local media stream ( camera / audio ) to the PeerConnection by calling `.getUserMedia(constrints,success,failure)`

    rtc.getUserMedia(rtc.userMediaConstraints.hd(true), function(result){
    
    console.log("MediaStream using HD constrints and audio is added to the PeerConnection"
    ,result);
    
    });

#### addMediaStream(mediaStream,callback)
If you want to a (external) media stream to the PeerConnection (local) call the `addMediaStream(mediaStream,callback)`

      window.getUserMedia(rtc.userMediaConstraints.qvga(false), function (stream) {
                         // Add the MediaStream capured
                         rtc.addLocalStream(stream, function () {
                         console.log("Added yet another media stream...");
                   });

#### removeStream(streamId)

To remove a local media stream from the PeerConnection and all connected remote peerconnection call the .removeStream(streamID) method

     rtc.removeStream(streamId, function(id) {
                             console.log("local stream removed", id);
                         });

#### refreshStreams(peerId,callback)

When a media stream is added by using the .getUserMedia or .addMediaStream event you need to call refreshStreams method to initialize a renegotiation.

    rtc.refreshStreams(peerId, function (id) {
        console.log("Streams refreshed and renegotiation is done..");
    });

** to get a list of all remote peerconnections call the .`getRemotePeers()` method.

####getLocalStreams()

To get a list of the peerconnection (clients ) media-streams call the `.getLocalStreams()` method

    var myLocalStreams = rtc.getLocalStreams();

###MediaStream Events
#### onLocalStream(event)

When a media stream is attached to the PeerConnection using `getUserMedia` och `addMediaStream` the API fires the `onLocalStream(stream)` event.

    rtc.bind(XSockets.WebRTC.Events.onLocalStream, function(stream) {
        // attach the stream to your <video> element or create a new <video> as you can add multiple streams     to a PeerConnection
    
    });
    
    // or use
    
    rtc.onlocalstream = function(event){
         // do op
    });
    
    

#### onRemoteStream(event)

When a remote PeerConnection is connected the API fires the `onRemoteStream(event)` .

    rtc.bind(XSockets.WebRTC.Events.onRemoteSteam, function(event) {
       console.log(event);
       
       // event: {
       //  PeerId: 'Guid' // Identity if the RemotePeerConnection,
       //  stream: MediaStream
       //}
       
       // Attach the remote stream to a <video> an exisiting <video> element
       attachMediaStream(document.querySelector("#remoteVideo"), event.stream);
       
    });
    
    
    // or use
    
    rtc.onremotestream = function(event){
        // do op 
    });
    
    

#### onRemoteStreamLost

When a remote stream removes a stream (`.removeStream(mediaStreamId)`) the JavaScript API fires the `onRemoteStreamLost(streamId`) event

     rtc.bind(XSockets.WebRTC.Events.onRemoteStreamLost, function(event) {
        console.log("a remote peerconnection removed a stream", event);
         // remove video element by using the event.StreamID property
     });
     
     // or use
     
     rtc.onremotestreamlost =  function(function) {
        // do op
     });
     


##DataChannels

DataChannels can be attached to a PeerConnection by using the following `XSockets.WebRTC.DataChannel` object.  upon each dataChannel you can publish and subscribe to any topic.  Subscriptions can be added, deleted and modified without  changing the underlying connection (no need for renegotiation).   

###Create a new Datachannel (RTCDataChannel)


     var dc = new XSockets.WebRTC.DataChannel("chat");
     
     // Note you will need to add your DataChannel by calling addDataChannel(dc)
     
     rtc.addDataChannel(dc);
     
     // any event binding (open,close) or subscriptions needs to be tone prior to adding the channel
     
     
     
     
     
     

###DataChannel events

When you created your DataChannel object you can attach event listeners for the following events (not to be mixed with subscriptions)

####onopen(peerId,event)
Fires when a DataChannel is open (ready)
     
    dc.onopen = function(peerId,event){
        // peerId is the identity of the PeerConnection 
        // event is the RTCDataChannel (native) event
    };
    
   
    
    
####onclose(peerId,event)
Fires when a DataChannel is closed (by remote peer )
     
    dc.onclose = function(peerId){
        // peerId is the identity of the PeerConnection 
        // event is the RTCDataChannel (native) event
    };

###DataChannel methods

As described shortly above you can take advantake of a simple publish/subscribe pattern unpon you DataChannel.


####subscribe(topic,cb)
Create a subscription to a topic (*topic*). callback function will be invoked when the datachannel receives a message on the actual topic 

    // Where dc is your XSockets.WebRTC.DataChannel object instance
    
    dc.subscribe("foo", function(message)
    {
        console.log("received a message on foo", message);
    });


####unsubscribe(topic, cb)

To remove (unsubscribe) a 'topic' pass the *topic* and an optional callback function that will be called when completed.

    dc.unsubscribe("foo", function() {
        console.log("i'm no longer subscribing to foo");
    });

####publish(topic,data, cb) 
To send (publish) invoke the publish method using the specific topic, *data* is the payload. the optinal callback (cb) function woll be invoked after the payload is sent.


    dc.publish("foo", { myMessage: 'Petter Northug did not get a medal?' }, function(data){
        // the payload passed will be available here as well...
    });
    
    // if you attach an event listener for onpublish the topic & data will be passed forward 
    
    dc.onpublish = function(topic, data) {
            // do op
    };


##XSockets.AudioAnalyser

Not yet documented fully documented.  The main purpose is to be able to detect of the current user is silent / speaking during a certain interval (ms)

    // Simple example where you on the onlocalstream event attaches a analyser anf grabs the results
    rtc.onlocalstream = function(stream) {
    
        // Attach the local stream captured
      
      attachMediaStream(document.querySelector("#localStream"), stream);
      
       // Create a an AudioAnalyzer, this detect if the current user is speaking (each second)    
       
       var analyze = new XSockets.AudioAnalyser(stream, 1000);
        
        analyze.onAnalysis = function (result) {
         console.log(result);
            if (result.IsSpeaking) {
                        $("#localStream").toggleClass("speaks").removeClass("silent");
                        }else {
                                $("#localStream").toggleClass("silent").removeClass("speaks");
                        }
            // Lets notify/share others,
            ws.publish("StreamInfo", { peerId: rtc.CurrentContext.PeerId,streamInfo: result });
            };
        }






...
