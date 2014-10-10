using System;

namespace XSockets.WebRTC.Broker.Models
{
    public interface IStreamModel
    {
        Guid Sender { get; set; }
        string StreamId { get; set; }
        string Description { get; set; }
    }
}