
#XSockets.NET - WebRTC

This repo contains the full source code of the [XSockets.NET][1]  WebRTC experiments.  

###Simple WebRTC application

We have created a simple demo package available on Nuget. This package gives you a very simple "video conference". The demo allows 1-n clients to connect and share MediaStreems.

    PM> Install Package XSockets.Sample.WebRTC


##Pre-Req

In order to be able to use the XSockets.NET PeerBroker and the WebRTC JavaScript API's of ours you need to install XSockets.NET into your application. Since you are going to have a web-application we recomend you to use MVC, but it is up to you.

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


*To learn more about the WebRTC API, read the API-Guide below*

----------


  [1]: https://groups.google.com/forum/?hl=en#!forum/xsocketsgroup

##Supported platforms

###Server system requirements
Our WebRTC experiment requires a XSockets.NET generation 4.0  server setup.  The connection broker code provided is written and designed to run on XSockets.NET version 4.x. 

You can get XSockets.NET for free as a developer using Nuget. Read more about XSockets.NET 4.0 at http://xsockets.net/docs/4/getting-started-with-real-time.

The code  connection broker can be found in the XSockest.NET WebRTC repo

###Client support
The WebRTC experiment of ours ( Team XSockets.NET Sweden AB) is tested on the following browsers per the 10th of October 2014

     - Google Chrome 37 
     - Google Chrome Canary 40
     - Firefox 31
     - Firefox Aurora
     - Opera 24
    
*All functionality (RTCPeerConnection, MediaStreams and RTCDataChannels) works cross-browsers (according to the list above)* 

##JavaScript API - Documentation

Here follows a brief description of the JavaScript API. 

###Create a PeerConnection
In order to create a PeerConnection (`XSockets.WebRTC`) you need a PeerBroker to broker connections.

    var conn = new XSockets.WebSocket("ws://127.0.0.1:4502", ["connectionbroker"]);
    
    var broker = conn.controller("connectionbroker");
	    broker.onopen = function () {
	    rtc = new XSockets.WebRTC(broker);
    };
 

####Configuration (Customize)

By passing a custom *configuration* into the ctor of the `XSockets.WebRTC(broker,configuration)` you can easily modify the iceServers, `sdpConstraints` and `streamConstraints` and parameters.  You can also provide a set of expressions (sdpExpressions) that will be abale to intercept the SDP messages.
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
####oncontextcreated
This fires when you have a connection to the Broker controller

    
    rtc.oncontextcreated = function(ctx) {
      // do op
    }
    

####oncontextchange
This fires when something happens on the context. Someone joins or leaves! You will get a list of peers on the current context.

    
    rtc.oncontextchange = function(arr) {
     // do op
    });
    
    
    
###Context Methods
#### changeContext
Changes your context and connects to other Peers on the broker. Pass in the Id of the context to join/connect

    rtc.changeContext(ctxId);
    
####leaveContext
Leave the current context. "Hang up" on all other peers
    
    rtc.leaveContext();

####connectToContext
Connect to the CurrentContext.  i.e if you want to connect to a predefined context.

    rtc.connectToContext();
    

###Peer Events
####onconnectionstarted

Fires when the client starts to negotiation.

    rtc.onpeerconnectionstarted = function(peer){
    
    });
    
    

####onconnectioncreated
Fires when the client has established a peer connection

    
    rtc.onpeerconnectioncreated = functction(peer){
        // do op
    });

####onconnectionlost
Fires when a peer connection is lost (destroyed)

    
    rtc.onpeerconnectionlost = function(peer){
    
    });
    
### Other PeerConnection events 
Other PeerConnection (peer) events of interest may be the following.  Note that we are using the `.bind(event,fn)` method for those. 


    rtc.bind("signalingstatechange", function (evt)
    {
    });
    
    rtc.bind("iceconnectionstatechange", function (evt)
    {
    });
    
    rtc.bind("negotiationneeded", function (evt)
    {
    });

###Peer Methods
####removePeerConnection
Lets you remove a connection from the current context.

    rtc.removePeerConnection(peerId,callback);
    
####getRemotePeers
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

When a media stream is attached to the PeerConnection using `getUserMedia` och `addMediaStream` the API fires the `onlocalstream(stream)` event.

    
    rtc.onlocalstream = function(event){
         // do op
    });
    
    

#### onRemoteStream(event)

When a remote PeerConnection is connected the API fires the `onremotestream(event)` .

    rtc.onremotestream = function(event){
        // do op 
    });
    

#### onRemoteStreamLost

When a remote peer removes a stream (`.removeStream(mediaStreamId)`) the JavaScript API fires the `onRemoteStreamLost(streamId`) event on other peers connected to the same context
     
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
Create a subscription to a topic topic and pass  callback function that  will be invoked when the datachannel receives a message on the actual topic 

    // Where dc is your XSockets.WebRTC.DataChannel object instance
    
    dc.subscribe("foo", function(message)
    {
        console.log("received a message on foo", message);
    });

####subscribe(topic,cb) : BinaryMessages

Create a subscription to a topic and pass a callback function that will be invoked when a dataChannel  receives a message on the actual topic.  Working with `binaryMessages` is very similar to dealing with any arbitrary data. The example below uses jQuery to create a DOM element (`link`) . See `publishBinary`to get the context of this example.

    dc.subscribe("fileShare", function (file) {
    var blob = new Blob([file.binary], {
        type: file.data.type
    });
    var download = $("<a>").text(file.data.name).attr({
        download: file.data.filename,
        href: URL.createObjectURL(blob),
        target: "_blank"
    });
    // do op's with the download element
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
####publishTo(id,topic,data,*cb*)
To send (publish) a message to a specific PeerConnection , invoke the `publishTo` method using the PeerID of the target peer,  topic, *data* is the payload. the optinal callback (cb) function will be invoked after the payload is sent.

    dc.publishTo(rtc.getPeerConnections[0],"foo", {who:'Alexander Bard' what:'has a beard'});

*rtc.`getPeerConnections`[0] gets will give you the PeerID of the first peer connection.*

####publishbinary(topic,bytes,data)
To pass an binary message invoke the `publishBinary` method 

     dc.publishBinary("fileshare", bytes, {
                        name: file.name,
                        type: file.type,
                        size: file.size
                    });

Where bytes is an `arrayBuffer`.   the dataChannel will pass a `XSockets.BinaryMessage`, thats a wrapper object that combines  arbitrary data (objects)  and arrayBuffers. See deal with binary messages described under the .`subscription` section

####publishbinaryTo(id,topic,bytes, *data*)
To send (publish) a binary message to a specific PeerConnection , invoke the `publishbinaryTo` method using the PeerID of the target peer,  topic, bytes, and *data*. 


##XSockets.AudioAnalyser (experimental)

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





