import React, { useState, useEffect, useRef } from "react";
import { useParticipant } from "@videosdk.live/react-sdk";

interface VoiceActivityIndicatorProps {
  localParticipantId?: string;
  isEnabled: boolean;
}

export const VoiceActivityIndicator: React.FC<VoiceActivityIndicatorProps> = ({
  localParticipantId,
  isEnabled,
}) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Get the local participant's audio stream
  const { micStream } = useParticipant(localParticipantId || "");

  useEffect(() => {
    // Only proceed if we have a valid mic stream and mic is enabled
    if (!micStream || !isEnabled) {
      setAudioLevel(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(
      new MediaStream([micStream.track])
    );

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.1; // Even more responsive for user feedback
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

      // Apply higher sensitivity for local participant feedback
      const normalizedLevel = Math.min(rms * 5, 1); // Higher sensitivity for immediate feedback

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
  }, [micStream, isEnabled]);

  // Generate heights for three lines based on audio level
  const getLineHeight = (lineIndex: number) => {
    if (!isEnabled || audioLevel === 0) {
      return 4; // Minimum height when inactive
    }

    // Create variation in line heights with different responsiveness
    const baseHeight = 4;
    const maxHeight = 16;
    const multiplier = [1.2, 0.8, 1.0][lineIndex] || 1; // Different responsiveness per line
    const height =
      baseHeight + audioLevel * (maxHeight - baseHeight) * multiplier;

    return Math.max(baseHeight, Math.min(maxHeight, height));
  };

  return (
    <div className="voice-activity-indicator">
      {[0, 1, 2].map((lineIndex) => (
        <div
          key={lineIndex}
          className="voice-activity-line"
          style={{
            height: `${getLineHeight(lineIndex)}px`,
            animationDelay: `${lineIndex * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};
