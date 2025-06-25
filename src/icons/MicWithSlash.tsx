import React from "react";
import MicIcon from "./MicIcon";

const MicWithSlash: React.FC<{ disabled: boolean }> = ({ disabled }) => (
  <div
    style={{
      position: "relative",
      width: "24px",
      height: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <MicIcon
      style={{
        width: "24px",
        height: "24px",
        opacity: disabled ? 0.4 : 1,
        transition: "opacity 0.2s ease",
      }}
    />
    {disabled && (
      <div
        style={{
          position: "absolute",
          bottom: "-2px",
          right: "-2px",
          width: "8px",
          height: "8px",
          backgroundColor: "#ef4444",
          border: "1.5px solid var(--bg-secondary)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
    )}
  </div>
);

export default MicWithSlash;
