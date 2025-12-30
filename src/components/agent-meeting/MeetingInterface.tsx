import React, { useState, useEffect, useRef } from "react";
import { useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import { AgentAudioPlayer } from "./AgentAudioPlayer";
import { AgentVideoPlayer } from "./AgentVideoPlayer";
import { WaveAvatar } from "./WaveAvatar";
import { VoiceActivityIndicator } from "./VoiceActivityIndicator";
import { AgentDashboard } from "./AgentDashboard";
import MicWithSlash from "../../icons/MicWithSlash";

interface MeetingInterfaceProps {
  meetingId: string;
  onDisconnect: () => void;
}

export const MeetingInterface: React.FC<MeetingInterfaceProps> = ({
  meetingId,
  onDisconnect,
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const joinAttempted = useRef(false);

  const { join, leave, toggleMic, participants, localParticipant, localMicOn } =
    useMeeting({
      onMeetingJoined: () => {

        setIsJoined(true);
        setConnectionError(null);
        joinAttempted.current = true;
      },
      onMeetingLeft: () => {

        setIsJoined(false);
        joinAttempted.current = false;
        onDisconnect();
      },
      onParticipantJoined: (participant) => {

      },
      onParticipantLeft: (participant) => {

      },
      onError: (error) => {
        console.error("Meeting error:", error);
        setConnectionError(error.message || "Connection failed");
      },
    });

  useEffect(() => {
    // We no longer auto-join here. The user must click "Connect".
    // But if we wanted to support auto-join via prop, we could do it here.
  }, []);

  const handleConnect = () => {
    if (!isJoined && !joinAttempted.current) {
      try {
        join();
        joinAttempted.current = true;
      } catch (error) {
        console.error("Error joining meeting:", error);
        setConnectionError("Failed to join meeting");
      }
    }
  };

  const handleToggleMic = () => {
    if (isJoined) {
      toggleMic();
    } else {

    }
  };

  const handleDisconnect = () => {
    try {
      leave();
    } catch (error) {
      console.error("Error during disconnect:", error);
      leave();
    }
  };

  const handleReturn = () => {
    // First disconnect from the meeting
    handleDisconnect();

    // Navigate to home page without URL parameters
    window.history.pushState({}, "", window.location.pathname);

    // Trigger a page reload to reset the app state
    window.location.reload();
  };

  const participantsList = Array.from(participants.values());
  const agentParticipant = participantsList.find(
    (p) => p.displayName?.includes("Agent") || p.displayName?.includes("Haley")
  );

  const { isActiveSpeaker, webcamOn } = useParticipant(
    agentParticipant?.id || ""
  );

  const urlParams = new URLSearchParams(window.location.search);
  const hasTokenAndMeetingId = urlParams.has("token") && urlParams.has("meetingId");

  return (
    <div className="meeting-container">
      {!hasTokenAndMeetingId && (
        <div className="meeting-header">
          <button onClick={handleReturn} className="return-button">
            <span>←</span>
            <span>Return</span>
          </button>
        </div>
      )}

      <div className="meeting-content sandbox-mode">
        <AgentDashboard
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          isJoined={isJoined}
          agentParticipantId={agentParticipant?.id}
          webcamOn={webcamOn}
        />
      </div>

      {/* Hidden players for audio/video processing */}
      {agentParticipant && (
        <div style={{ display: "none" }}>
          <AgentAudioPlayer participantId={agentParticipant.id} />
          {webcamOn && <AgentVideoPlayer participantId={agentParticipant.id} />}
        </div>
      )}
    </div>
  );
};
