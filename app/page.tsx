"use client";

import dynamic from "next/dynamic";

// Dynamically import the AvatarScene component with SSR disabled
// This prevents Three.js from trying to run on the server
const AvatarScene = dynamic(() => import("./components/AvatarScene"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111318",
        color: "white",
        fontFamily: "monospace",
      }}
    >
      Loading VRM Avatar Controller...
    </div>
  ),
});

// Dynamically import the ElevenLabs conversation component
const ElevenLabsConversation = dynamic(
  () => import("./components/ElevenLabsConversation"),
  {
    ssr: false,
  }
);

export default function HomePage() {
  return (
    <main
      style={{
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <AvatarScene />

      {/* ElevenLabs Conversation Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          width: "400px",
          zIndex: 1000,
        }}
      >
        <ElevenLabsConversation />
      </div>
    </main>
  );
}
