import React, { useState } from "react";
import { MeetingProvider } from "@videosdk.live/react-sdk";
import { JoinButton } from "./components/JoinButton";
import { MeetingView } from "./components/MeetingView";

function App() {
  const params = new URLSearchParams(window.location.search);
  const meetingId = params.get("meetingId");
  const token = params.get("token");
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [inputToken, setInputToken] = useState(token || "");
  const [inputMeetingId, setInputMeetingId] = useState(meetingId || "");

  const handleJoin = () => {
    if (!params) return;
    setIsInMeeting(true);
  };

  const handleMeetingLeave = () => {
    setIsInMeeting(false);
  };

  const handleUpdateParams = () => {
    const newUrl = `${window.location.pathname}?token=${inputToken}&meetingId=${inputMeetingId}`;
    window.history.pushState({}, "", newUrl);
    window.location.reload();
  };

  // Show missing parameters UI if token or meetingId is not provided
  if (!token || !meetingId) {
    return (
      <div className="app-container">
        <div className="join-content">
          <h1 className="title">Agents Sandbox</h1>
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
                className="update-button"
                onClick={handleUpdateParams}
                disabled={!inputToken || !inputMeetingId}
              >
                Update Parameters
              </button>
            </div>
            <p className="help-text">
              Or add them directly to the URL:
              ?token=YOUR_TOKEN&meetingId=YOUR_MEETING_ID
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show join screen if not in meeting
  if (!isInMeeting) {
    return (
      <div className="app-container">
        <div className="join-content">
          <h1 className="title">Agents Sandbox</h1>
          <JoinButton onClick={handleJoin} disabled={!token || !meetingId} />
        </div>
      </div>
    );
  }

  // Show meeting view if in meeting
  return token && meetingId && isInMeeting ? (
    <MeetingProvider
      config={{
        meetingId: meetingId,
        micEnabled: false,
        webcamEnabled: false,
        name: "Agent Tester",
        debugMode: false,
      }}
      token={token || ""}
      joinWithoutUserInteraction={true}
    >
      <MeetingView meetingId={meetingId} onMeetingLeave={handleMeetingLeave} />
    </MeetingProvider>
  ) : (
    <></>
  );
}

export default App;
