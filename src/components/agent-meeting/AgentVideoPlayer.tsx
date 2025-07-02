import React, { useRef, useEffect, useState } from "react";
import { useParticipant } from "@videosdk.live/react-sdk";

interface AgentVideoPlayerProps {
  participantId: string;
  className?: string;
}

export const AgentVideoPlayer: React.FC<AgentVideoPlayerProps> = ({
  participantId,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [audioLevel, setAudioLevel] = useState(0);

  const { webcamStream, micStream, isActiveSpeaker } =
    useParticipant(participantId);

  useEffect(() => {
    if (videoRef.current && webcamStream) {
      const mediaStream = new MediaStream([webcamStream.track]);
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(console.error);
    }
  }, [webcamStream]);

  // Audio level detection for visual feedback
  useEffect(() => {
    if (!micStream) {
      setAudioLevel(0);
      return;
    }

    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(
      new MediaStream([micStream.track])
    );

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.fftSize);

    const updateAudioLevel = () => {
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const amplitude = (dataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLevel = Math.min(rms * 3, 1);

      setAudioLevel(normalizedLevel);
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      source.disconnect();
      audioContext.close().catch(console.error);
    };
  }, [micStream]);

  const soundIntensity = isActiveSpeaker ? audioLevel * 100 : 0;

  return (
    <div className="agent-video-container">
      {/* Sound frame indicators */}
      <div className="sound-frame">
        {/* Pulsing border effect */}
        <div
          className="sound-border"
          style={{
            borderColor: isActiveSpeaker
              ? `rgba(59, 130, 246, ${0.6 + soundIntensity * 0.004})`
              : "rgba(255, 255, 255, 0.3)",
            boxShadow: isActiveSpeaker
              ? `0 0 ${20 + soundIntensity * 0.3}px rgba(59, 130, 246, ${
                  0.4 + soundIntensity * 0.003
                })`
              : "0 0 10px rgba(255, 255, 255, 0.1)",
          }}
        />
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`agent-video-player ${className}`}
      />

      {!webcamStream && (
        <div className="video-loading">
          <div className="loading-text">Loading video...</div>
        </div>
      )}
    </div>
  );
};
