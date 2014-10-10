using System;
using System.Collections.Generic;
using System.Linq;
using XSockets.Core.Common.Socket.Event.Arguments;
using XSockets.Core.Common.Socket.Event.Attributes;
using XSockets.Core.Common.Socket.Event.Interface;
using XSockets.Core.XSocket;
using XSockets.Core.XSocket.Helpers;
using XSockets.WebRTC.Broker.Constants;
using XSockets.WebRTC.Broker.Models;

namespace XSockets.WebRTC.Broker
{
    /// <summary>
    /// A custom Peerbroker for WebRTC signaling and WebSocket communication on top of XSockets.NET
    /// </summary>
    public sealed class ConnectionBroker : XSocketController, IConnectionBroker
    {
        #region Public Properties

        /// <summary>
        /// List of PeerConnections that the Peer has connected to
        /// </summary>
        [NoEvent]
        public List<IPeerConnection> Connections { get; set; }

        /// <summary>
        /// The Peer for this client
        /// </summary>
        [NoEvent]
        public IPeerConnection Peer { get; set; }

        #endregion

        #region Ctor

        /// <summary>
        /// Ctor - setting up connectionlist and open/close events
        /// </summary>
        public ConnectionBroker()
        {
            Connections = new List<IPeerConnection>();

            this.OnClose += _OnClose;

            this.OnOpen += _OnOpen;
        }

        #endregion

        #region Private Methods & Events
        /// <summary>
        /// When a client connects create a new PeerConnection and send the information the the client
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="onClientConnectArgs"></param>
        private void _OnOpen(object sender, OnClientConnectArgs onClientConnectArgs)
        {

            // Get the context from a parameter if it exists
            var context = Guid.NewGuid();

            if (this.HasParameterKey("ctx"))
            {
                var p = this.GetParameter("ctx");
                context = Guid.Parse(p);
            }

            Peer = new PeerConnection
            {
                Context = context,
                PeerId = ConnectionId
            };

            this.Invoke(Peer, Events.Context.Created);
        }

        public void GetContext()
        {
            this.Invoke(Peer, Events.Context.Created);
        }

        /// <summary>
        /// When a client disconnects tell the other clients about the Peer being lost
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="onClientDisConnectArgs"></param>
        private void _OnClose(object sender, OnClientDisconnectArgs onClientDisConnectArgs)
        {
            this.NotifyPeerLost();
        }

        private void NotifyPeerLost()
        {
            if (Peer == null) return;
            this.InvokeTo(f => f.Peer.Context == Peer.Context, Peer, Events.Peer.Lost);
        }

        #endregion

        #region Overrides from XSocketController

        #endregion

        #region Signaling Methods

        /// <summary>
        /// Distribute signals (SDP's)
        /// </summary>
        /// <param name="signalingModel"></param>
        public void ContextSignal(SignalingModel signalingModel)
        {
            this.InvokeTo<ConnectionBroker>(f => f.ConnectionId == signalingModel.Recipient, signalingModel, Events.Context.Signal);
        }

        /// <summary>
        /// Leave a context
        /// </summary>
        public void LeaveContext()
        {
            this.NotifyPeerLost();

            this.Peer.Context = new Guid();
            this.Invoke(Peer, Events.Context.Created);
        }

        public void OfferContext(string a)
        {
            //var p = new {Peer = this.Peer};
            var users =
                this.FindOn<ConnectionBroker>(
                    u => u.Peer.Context == this.Peer.Context && u.PersistentId != this.PersistentId);

            foreach (var user in users)
            {
                user.Invoke(this.Peer, Events.Context.Offer);
            }
        }

        /// <summary>
        ///    Current client changes context
        /// </summary>
        /// <param name="context"></param>
        public void ChangeContext(Guid context)
        {
            this.Peer.Context = context;
            this.NotifyContextChange(context, this.ConnectToContext);
        }

     
        public void SetContext(Guid context)
        {
            this.Peer.Context = context;
        }

        public override void OnMessage(IMessage message)
        {

        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="recipient"></param>
        public void DisconnectPeer(Guid recipient)
        {
            this.PublishTo(p => p.ConnectionId == recipient, new { Sender = this.ConnectionId }, Events.Peer.Disconnect);
        }

        #endregion

        #region Stream Methods

        /// <summary>
        /// Notify PeerConnections on the current context that a MediaStream is removed.
        /// </summary>
        /// <param name="streamId"></param>
        public void RemoveStream(string streamId)
        {
            this.InvokeTo<ConnectionBroker>(f => f.Peer.Context == Peer.Context, new StreamModel { Sender = ConnectionId, StreamId = streamId }, Events.Stream.Remove);
        }

        /// <summary>
        /// Notify PeerConnections on the current context that a MediaStream is added.
        /// </summary>
        /// <param name="streamId"></param>
        /// <param name="description">JSON</param>
        public void AddStream(string streamId, string description)
        {
            this.InvokeTo<ConnectionBroker>(f => f.Peer.Context == Peer.Context,
                new StreamModel
                {
                    Sender = ConnectionId,
                    StreamId = streamId,
                    Description = description
                }, Events.Stream.Add);
        }


        public void ConnectToContext()
        {
            // Pass the client a list of Peers to Connect
            this.Invoke(this.GetConnections(this.Peer)
                       .Where(q => !q.Connections.Contains(this.Peer)).
                        Select(p => p.Peer).AsMessage(Events.Context.Connect));
        }

        private IEnumerable<ConnectionBroker> GetConnections(IPeerConnection peerConnection)
        {
            return this.Find(f => f.Peer.Context == peerConnection.Context).Select(p => p).Except(new List<ConnectionBroker> { this });
        }

        private void NotifyContextChange(Guid context, Action callback)
        {
            this.InvokeTo<ConnectionBroker>(c => c.Peer.Context == context, this.Find(q => q.Peer.Context == context).Select(p => p.Peer), Events.Context.Changed);
            if (callback != null)
                callback();
        }
        #endregion
    }
}