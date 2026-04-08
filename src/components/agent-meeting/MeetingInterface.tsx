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
      console.log("[MeetingInterface] Meeting joined successfully");
      setIsJoined(true);
      joinAttempted.current = true;
    },
    onMeetingLeft: () => {
      console.log("[MeetingInterface] Meeting left");
      setIsJoined(false);
      joinAttempted.current = false;
      onDisconnect();
    },
    onParticipantJoined: (participant) => {
      console.log("[MeetingInterface] Participant joined:", participant?.displayName, "id:", participant?.id, "metaData:", JSON.stringify(participant?.metaData));
    },
    onParticipantLeft: (participant) => {
      console.log("[MeetingInterface] Participant left:", participant?.displayName, participant?.id);
    },
    onError: (error) => {
      console.error("[MeetingInterface] Meeting error:", error);
    },
  });

  const handleConnect = () => {
    console.log("[MeetingInterface] Connect clicked, isJoined:", isJoined, "joinAttempted:", joinAttempted.current);
    if (!isJoined && !joinAttempted.current) {
      try {
        join();
        joinAttempted.current = true;
        console.log("[MeetingInterface] join() called");
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

  // Debug: log all participants and their metadata
  const participantsList = Array.from(participants.values());
  console.log("[MeetingInterface] All participants:", participantsList.map(p => ({
    id: p.id,
    displayName: p.displayName,
    metaData: p.metaData,
  })));

  const agentParticipant = participantsList.find((p) => {
    const meta = p.metaData as { is_videosdk_agent?: boolean } | null | undefined;
    return meta?.is_videosdk_agent === true;
  });

  // Fallback: also try matching by display name if metadata doesn't work
  const agentByName = !agentParticipant
    ? participantsList.find((p) => p.displayName?.toLowerCase().includes("agent"))
    : null;

  const resolvedAgent = agentParticipant || agentByName;

  if (agentByName && !agentParticipant) {
    console.warn("[MeetingInterface] Agent NOT found by metaData, but found by displayName:", agentByName.displayName, "metaData:", JSON.stringify(agentByName.metaData));
  }

  console.log("[MeetingInterface] agentParticipant (by meta):", agentParticipant?.id, "| agentByName:", agentByName?.id, "| resolved:", resolvedAgent?.id);

  const { webcamOn } = useParticipant(resolvedAgent?.id || "");

  const handleAgentStateChanged = useCallback((data: { state: string }) => {
    console.log("[MeetingInterface] onAgentStateChanged:", data.state);
    setAgentState(data.state);
  }, []);

  const handleAgentMetrics = useCallback((data: any) => {
    console.log("[MeetingInterface] onAgentMetrics:", JSON.stringify(data, null, 2));
    setLatestMetrics({ ...data, _ts: Date.now() });
  }, []);

  const handleAgentTranscription = useCallback((data: any) => {
    console.log("[MeetingInterface] onAgentTranscriptionReceived:", data);
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
