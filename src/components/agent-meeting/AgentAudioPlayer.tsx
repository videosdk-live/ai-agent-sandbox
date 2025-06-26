import React, { useRef, useEffect } from "react";
import { useParticipant } from "@videosdk.live/react-sdk";

interface AgentAudioPlayerProps {
  participantId: string;
}

export const AgentAudioPlayer: React.FC<AgentAudioPlayerProps> = ({
  participantId,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { micStream } = useParticipant(participantId);

  useEffect(() => {
    if (audioRef.current && micStream) {
      const mediaStream = new MediaStream([micStream.track]);
      audioRef.current.srcObject = mediaStream;
      audioRef.current.play().catch(console.error);
    }
  }, [micStream]);

  return (
    <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />
  );
};
