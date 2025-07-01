import React, { useState } from "react";
import { MeetingProvider } from "@videosdk.live/react-sdk";
import { MeetingContainer } from "./agent-meeting/MeetingContainer";
import { MeetingInterface } from "./agent-meeting/MeetingInterface";

const AgentMeeting: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const meetingIdFromUrl = params.get("meetingId");
  const tokenFromUrl = params.get("token");

  const [meetingId, setMeetingId] = useState<string | null>(meetingIdFromUrl);
  const [token, setToken] = useState<string | null>(tokenFromUrl);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [inputToken, setInputToken] = useState(tokenFromUrl || "");
  const [inputMeetingId, setInputMeetingId] = useState(meetingIdFromUrl || "");
  const [userInteracted, setUserInteracted] = useState(false);

  // Check if we should auto-join (when URL has both token and meetingId)
  const shouldAutoJoin = !!(meetingIdFromUrl && tokenFromUrl && userInteracted);

  const handleUpdateParams = () => {
    const newUrl = `${window.location.pathname}?token=${inputToken}&meetingId=${inputMeetingId}`;
    window.history.pushState({}, "", newUrl);
    setToken(inputToken);
    setMeetingId(inputMeetingId);
  };

  // Show missing parameters UI if token or meetingId is not provided
  if (!token || !meetingId) {
    return (
      <div className="app-container">
        <div>
          <div className="missing-params">
            <p>Please provide the following parameters:</p>

            <div className="input-group">
              <div className="input-field">
                <label htmlFor="token">VideoSDK Token:</label>
                <input
                  type="text"
                  id="token"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Enter your VideoSDK token"
                />
              </div>

              <div className="input-field">
                <label htmlFor="meetingId">Meeting ID:</label>
                <input
                  type="text"
                  id="meetingId"
                  value={inputMeetingId}
                  onChange={(e) => setInputMeetingId(e.target.value)}
                  placeholder="Enter your meeting ID"
                />
              </div>

              <button
                onClick={handleUpdateParams}
                disabled={!inputToken || !inputMeetingId}
                className="update-button"
              >
                Start Conversation
              </button>
            </div>

            <p className="help-text">
              Or add them directly to the URL:
              <br />
              ?token=YOUR_TOKEN&meetingId=YOUR_MEETING_ID
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleConnect = () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setIsConnected(true);
  };

  const handleStartMeeting = () => {
    setUserInteracted(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsConnecting(false);
    setUserInteracted(false);
  };

  // If we have meeting details, render the meeting provider
  if (meetingId && token) {
    return (
      <MeetingProvider
        config={{
          meetingId,
          micEnabled: true,
          webcamEnabled: false,
          name: "User",
          debugMode: false,
          multiStream: false,
        }}
        token={token}
        reinitialiseMeetingOnConfigChange={false}
        joinWithoutUserInteraction={shouldAutoJoin}
      >
        {shouldAutoJoin ? (
          // Auto-join: go directly to MeetingInterface
          <MeetingInterface
            meetingId={meetingId}
            onDisconnect={handleDisconnect}
          />
        ) : meetingIdFromUrl && tokenFromUrl && !userInteracted ? (
          // Direct link but no user interaction yet (for autoplay policy)
          <MeetingContainer
            onConnect={handleStartMeeting}
            isConnecting={false}
          />
        ) : // Manual join: show container first, then interface after connection
        isConnected ? (
          <MeetingInterface
            meetingId={meetingId}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <MeetingContainer
            onConnect={handleConnect}
            isConnecting={isConnecting}
          />
        )}
      </MeetingProvider>
    );
  }

  // No meeting details provided - show input form
  return (
    <MeetingContainer onConnect={handleConnect} isConnecting={isConnecting} />
  );
};

export default AgentMeeting;
