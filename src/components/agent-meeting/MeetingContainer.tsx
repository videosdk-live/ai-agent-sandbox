import React from "react";
import { WaveAvatar } from "./WaveAvatar";

interface MeetingContainerProps {
  onConnect: () => void;
  isConnecting: boolean;
}

export const MeetingContainer: React.FC<MeetingContainerProps> = ({
  onConnect,
  isConnecting,
}) => {
  return (
    <div className="meeting-container">
      <div className="meeting-content">
        {/* Agent Avatar with status text */}
        <div className="agent-display-container">
          <WaveAvatar isConnected={false} />
          <div className="agent-status-text">
            <div className="agent-mic-status">
              {isConnecting ? "Connecting..." : "Offline"}
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="controls-panel">
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className={`join-button ${isConnecting ? "disabled" : ""}`}
          >
            {isConnecting ? "Connecting..." : "Join Conversation"}
          </button>
        </div>
      </div>
    </div>
  );
};
