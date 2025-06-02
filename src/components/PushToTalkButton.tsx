import React, { useEffect, useState } from 'react';
import { useMeeting } from '@videosdk.live/react-sdk';

export const PushToTalkButton: React.FC = () => {
  const { unmuteMic, muteMic, localMicOn } = useMeeting();
  const [isPressed, setIsPressed] = useState(false);

  // Handle spacebar push-to-talk
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isPressed) {
        setIsPressed(true);
        unmuteMic();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsPressed(false);
        muteMic();
      }
    };

    // Also handle blur/focus events to ensure mic is muted if window loses focus
    const handleBlur = () => {
      if (isPressed) {
        setIsPressed(false);
        muteMic();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [unmuteMic, muteMic, isPressed]);

  return (
    <button 
      className={`push-to-talk-button ${localMicOn ? 'active' : ''}`}
    >
      <span className="mic-icon">🎤</span>
      {localMicOn ? 'Speaking...' : 'Push to Talk'}
    </button>
  );
}; 