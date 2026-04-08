import React, { useRef, useEffect } from "react";
import { useAgentParticipant } from "@videosdk.live/react-sdk";

interface AgentAudioPlayerProps {
  participantId: string;
  onAgentStateChanged?: (data: { state: string }) => void;
  onAgentMetrics?: (data: any) => void;
  onAgentTranscriptionReceived?: (data: any) => void;
}

export const AgentAudioPlayer: React.FC<AgentAudioPlayerProps> = ({
  participantId,
  onAgentStateChanged,
  onAgentMetrics,
  onAgentTranscriptionReceived,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastStateRef = useRef<string>("");

  const { micStream, agentState } = useAgentParticipant(participantId, {
    onAgentStateChanged: (data) => {
      onAgentStateChanged?.(data);
    },
    onAgentMetrics: (data) => {
      onAgentMetrics?.(data);
    },
    onAgentTranscriptionReceived: (data) => {
      onAgentTranscriptionReceived?.(data);
    },
  });

  useEffect(() => {
    if (agentState && agentState !== lastStateRef.current) {
      lastStateRef.current = agentState;
      onAgentStateChanged?.({ state: agentState });
    }
  }, [agentState, onAgentStateChanged]);

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
