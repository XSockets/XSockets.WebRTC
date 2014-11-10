using System;

namespace XSockets.WebRTC.Broker.Models
{
    public class VoiceMessage : IVoiceMessage
    {
        public Guid Recipient { get; set; }
        public Guid Sender { get; set; }
        public DateTime Created { get; set; }
        public Guid Id { get; set; }
        public byte[] Bytes { get; set; } 


        public VoiceMessage()
        {
            this.Id = Guid.NewGuid();
            this.Created = DateTime.Now;
        }
    }

  
}