using System;
using XSockets.WebRTC.Broker.Models;

namespace XSockets.WebRTC.Broker.Models
{
    public interface IPresence
    {
        Guid Id { get; set; }
        bool Online { get; set; }
        string UserName { get; set; }
        Availability Availability { get; set; }        
    }
}