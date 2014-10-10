using System;

namespace XSockets.WebRTC.Broker.Models
{
    public class StreamModel : IStreamModel
    {
        public Guid Sender { get; set; }
        public string StreamId { get; set; }
        public string Description { get; set; }
    }
}