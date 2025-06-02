import React from 'react';

interface JoinButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const JoinButton: React.FC<JoinButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="join-button"
    >
      Join Conversation
    </button>
  );
}; 