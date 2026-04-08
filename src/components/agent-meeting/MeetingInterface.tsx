import React, { useState, useRef, useCallback } from "react";
import { useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import { AgentAudioPlayer } from "./AgentAudioPlayer";
import { AgentVideoPlayer } from "./AgentVideoPlayer";
import { AgentDashboard } from "./AgentDashboard";

interface MeetingInterfaceProps {
  meetingId: string;
  onDisconnect: () => void;
}

export const MeetingInterface: React.FC<MeetingInterfaceProps> = ({
  meetingId,
  onDisconnect,
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const joinAttempted = useRef(false);

  const [agentState, setAgentState] = useState<string>("idle");
  const [latestMetrics, setLatestMetrics] = useState<any>(null);
  const [latestTranscription, setLatestTranscription] = useState<any>(null);

  const { join, leave, participants } = useMeeting({
    onMeetingJoined: () => {
      setIsJoined(true);
      joinAttempted.current = true;
    },
    onMeetingLeft: () => {
      setIsJoined(false);
      joinAttempted.current = false;
      onDisconnect();
    },
    onParticipantJoined: () => {},
    onParticipantLeft: () => {},
    onError: (error) => {
      console.error("[MeetingInterface] Meeting error:", error);
    },
  });

  const handleConnect = () => {
    if (!isJoined && !joinAttempted.current) {
      try {
        join();
        joinAttempted.current = true;
      } catch (error) {
        console.error("[MeetingInterface] Error joining meeting:", error);
      }
    }
  };

  const handleDisconnect = () => {
    try {
      leave();
    } catch (error) {
      console.error("[MeetingInterface] Error during disconnect:", error);
      leave();
    }
  };

  const handleReturn = () => {
    handleDisconnect();
    window.history.pushState({}, "", window.location.pathname);
    window.location.reload();
  };

  const participantsList = Array.from(participants.values());

  const resolvedAgent = participantsList.find((p) => {
    return (p as any).isAgent === true;
  });

  const { webcamOn } = useParticipant(resolvedAgent?.id || "");

  const handleAgentStateChanged = useCallback((data: { state: string }) => {
    setAgentState(data.state);
  }, []);

  const handleAgentMetrics = useCallback((data: any) => {
    setLatestMetrics({ ...data, _ts: Date.now() });
  }, []);

  const handleAgentTranscription = useCallback((data: any) => {
    setLatestTranscription({ ...data, _ts: Date.now() });
  }, []);

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
          agentParticipantId={resolvedAgent?.id}
          webcamOn={webcamOn}
          agentState={agentState}
          latestMetrics={latestMetrics}
          latestTranscription={latestTranscription}
        />
      </div>

      {resolvedAgent && (
        <div style={{ display: "none" }}>
          <AgentAudioPlayer
            participantId={resolvedAgent.id}
            onAgentStateChanged={handleAgentStateChanged}
            onAgentMetrics={handleAgentMetrics}
            onAgentTranscriptionReceived={handleAgentTranscription}
          />
          {webcamOn && <AgentVideoPlayer participantId={resolvedAgent.id} />}
        </div>
      )}
    </div>
  );
};
