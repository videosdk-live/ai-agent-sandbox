import React, { useState, useEffect, useRef } from "react";
import { useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import { AgentAudioPlayer } from "./AgentAudioPlayer";
import { AgentVideoPlayer } from "./AgentVideoPlayer";
import { WaveAvatar } from "./WaveAvatar";
import { VoiceActivityIndicator } from "./VoiceActivityIndicator";
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
        console.log("Meeting joined successfully");
        setIsJoined(true);
        setConnectionError(null);
        joinAttempted.current = true;
      },
      onMeetingLeft: () => {
        console.log("Meeting left");
        setIsJoined(false);
        joinAttempted.current = false;
        onDisconnect();
      },
      onParticipantJoined: (participant) => {
        console.log("Participant joined:", participant.displayName);
      },
      onParticipantLeft: (participant) => {
        console.log("Participant left:", participant.displayName);
      },
      onError: (error) => {
        console.error("Meeting error:", error);
        setConnectionError(error.message || "Connection failed");
      },
    });

  useEffect(() => {
    if (!joinAttempted.current) {
      console.log("Attempting to join meeting:", meetingId);
      const timer = setTimeout(() => {
        if (!isJoined && !joinAttempted.current) {
          try {
            join();
            joinAttempted.current = true;
          } catch (error) {
            console.error("Error joining meeting:", error);
            setConnectionError("Failed to join meeting");
          }
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [join, meetingId, isJoined]);

  const handleToggleMic = () => {
    if (isJoined) {
      toggleMic();
    } else {
      console.log("Not Connected : Please connect to the meeting first");
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

  return (
    <div className="meeting-container">
      <div className="meeting-header">
        <button onClick={handleReturn} className="return-button">
          <span>←</span>
          <span>Return</span>
        </button>
      </div>

      <div className="meeting-content">
        {/* Agent Avatar with status text */}
        <div className="agent-display-container">
          {/* Conditionally render video or avatar based on webcamOn */}
          {isJoined && agentParticipant && webcamOn ? (
            <AgentVideoPlayer participantId={agentParticipant.id} />
          ) : (
            <WaveAvatar
              participantId={agentParticipant?.id}
              isConnected={isJoined}
            />
          )}
          <div className="agent-status-text">
            {/* <div className="agent-name">
              {isJoined ? "Waiting for Agent..." : "AI Agent"}
            </div> */}
            <div className="agent-mic-status">
              {isJoined
                ? agentParticipant
                  ? isActiveSpeaker
                    ? "Speaking..."
                    : "Listening"
                  : "Connecting..."
                : "Offline"}
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="controls-panel">
          <div
            className="mic-control-container"
            onClick={handleToggleMic}
            title={localMicOn ? "Mute microphone" : "Unmute microphone"}
          >
            <button className="mic-control-button" disabled={!isJoined}>
              <MicWithSlash disabled={!localMicOn} />
            </button>
            <VoiceActivityIndicator
              localParticipantId={localParticipant?.id}
              isEnabled={isJoined && localMicOn}
            />
          </div>
        </div>

        {/* Connection Status */}
        {connectionError && (
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              textAlign: "center",
            }}
          >
            {connectionError}
          </div>
        )}

        {!isJoined && !connectionError && (
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              textAlign: "center",
            }}
          >
            Joining meeting...
          </div>
        )}
      </div>

      {/* Agent Audio Player */}
      {agentParticipant && (
        <AgentAudioPlayer participantId={agentParticipant.id} />
      )}
    </div>
  );
};
