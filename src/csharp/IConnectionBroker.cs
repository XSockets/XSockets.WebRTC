using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MyProject.RTC.Models;
using XSockets.Core.Common.Socket.Event.Interface;

namespace MyProject.RTC
{
    public interface IConnectionBroker
    {
     
        List<IPeerConnection> Connections { get; set; }
      
        IPeerConnection Peer { get; set; }
         


        Task  ContextSignal(SignalingModel signalingModel);
      
         Task OnMessage(IMessage message);
       
        Task LeaveContext();
  
        Task ChangeContext(Guid contextId);
    
        Task DisconnectPeer(Guid recipient);
       
        Task RemoveStream(Guid recipient,string streamId);
       
        Task AddStream(string streamId, string description);
       
        Task ConnectToContext();


     
    }
}