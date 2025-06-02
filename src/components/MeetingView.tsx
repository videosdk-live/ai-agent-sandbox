import React, { useEffect, useState, useRef } from "react";
import { useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import { PushToTalkButton } from "./PushToTalkButton";

interface MeetingViewProps {
  onMeetingLeave: () => void;
  meetingId: string;
}

// Component to handle individual participant
function ParticipantView({ participantId }: { participantId: string }) {
  const micRef = useRef<HTMLAudioElement>(null);
  const { micOn, displayName, micStream, isLocal } =
    useParticipant(participantId);

  useEffect(() => {
    if (micRef.current) {
      if (micOn && micStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(micStream.track);
        micRef.current.srcObject = mediaStream;
        micRef.current
          .play()
          .catch((error) =>
            console.error("micRef.current.play() failed", error)
          );
      } else {
        micRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`participant ${micOn ? "speaking" : ""}`}>
      <div className={`status-indicator ${micOn ? "active" : ""}`} />
      <div className="participant-avatar">
        {getInitials(displayName || "Participant")}
      </div>
      <span className="participant-name">{displayName || "Participant"}</span>
      <audio ref={micRef} autoPlay muted={isLocal} />
    </div>
  );
}

export const MeetingView: React.FC<MeetingViewProps> = ({ onMeetingLeave }) => {
  const [joined, setJoined] = useState<"JOINED" | "JOINING" | null>(null);

  const { leave, participants } = useMeeting({
    onMeetingJoined: () => {
      setJoined("JOINED");
    },
    onMeetingLeft: () => {
      onMeetingLeave();
    },
  });

  if (joined === "JOINING") {
    return <div className="container">Joining the meeting...</div>;
  }

  return (
    <div className="meeting-container">
      <div className="meeting-header">
        <button onClick={() => leave()} className="return-button">
          <span>←</span>
          <span>Return</span>
        </button>
      </div>

      {joined === "JOINED" && (
        <div className="meeting-content">
          <div className="participants-container">
            {Array.from(participants.keys())
              .filter(
                (participantId) => !participants.get(participantId)?.local
              )
              .map((participantId) => (
                <ParticipantView
                  key={participantId}
                  participantId={participantId}
                />
              ))}
          </div>
          <div className="push-to-talk-container">
            <PushToTalkButton />
          </div>
        </div>
      )}
    </div>
  );
};
