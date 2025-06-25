import React, { useEffect, useState, useRef } from "react";
import { useParticipant } from "@videosdk.live/react-sdk";

interface WaveAvatarProps {
  participantId?: string;
  isConnected: boolean;
  className?: string;
}

export const WaveAvatar: React.FC<WaveAvatarProps> = ({
  participantId,
  isConnected,
  className = "",
}) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Always call useParticipant to avoid hook order violations
  const { micStream, isActiveSpeaker } = useParticipant(participantId || "");

  useEffect(() => {
    // Only proceed if we have a valid participant and micStream
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
    analyser.smoothingTimeConstant = 0.2; // Much more responsive
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.fftSize);

    const updateAudioLevel = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS (Root Mean Square) for better voice detection
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const amplitude = (dataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Apply sensitivity and normalize
      const normalizedLevel = Math.min(rms * 3, 1); // Increased sensitivity

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

  // Use a 0-100 scale for intensity, similar to the reference
  const waveIntensity = isActiveSpeaker ? audioLevel * 100 : 0;

  return (
    <div className={`orb-avatar-container ${className}`}>
      {isConnected && (
        <>
          {/* Animated wave rings */}
          {[1, 2, 3].map((ring) => (
            <div
              key={ring}
              className="orb-avatar-ring"
              style={{
                animationDelay: `${ring * 0.5}s`,
                animationDuration: "2.5s",
                transform: `scale(${0.8 + waveIntensity * 0.005 * ring})`,
                opacity: isActiveSpeaker ? 0.6 - ring * 0.15 : 0.2,
              }}
            />
          ))}

          {/* Pulsing glow effect */}
          <div
            className="orb-avatar-glow"
            style={{
              transform: `scale(${1 + waveIntensity * 0.01})`,
              opacity: isActiveSpeaker ? 0.8 : 0.3,
            }}
          />
        </>
      )}

      {/* Main avatar orb */}
      <div
        className="orb-avatar-main"
        style={{
          transform: `scale(${1 + waveIntensity * 0.002})`,
        }}
      />
    </div>
  );
};
