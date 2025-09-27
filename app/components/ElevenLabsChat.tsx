"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ElevenLabsChatProps {
  className?: string;
}

export default function ElevenLabsChat({ className }: ElevenLabsChatProps) {
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl =
    process.env.NEXT_PUBLIC_ELEVENLABS_WS_URL ||
    "ws://localhost:5001/text-to-speech/realtime";

  useEffect(() => {
    setIsMounted(true);
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        addMessage("Connected to ElevenLabs server");
        console.log("Connected to ElevenLabs WebSocket");
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        addMessage("Disconnected from ElevenLabs server");
        console.log("Disconnected from ElevenLabs WebSocket");

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!isConnected) {
            connectWebSocket();
          }
        }, 3000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "complete") {
            setIsProcessing(false);
            addMessage("✓ Speech generation complete");
          } else if (data.error) {
            setIsProcessing(false);
            addMessage(`Error: ${data.error}`);
          }
        } catch (error) {
          console.log("Received non-JSON message:", event.data);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        addMessage("WebSocket connection error");
        setIsProcessing(false);
      };
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      addMessage("Failed to connect to ElevenLabs server");
    }
  };

  const addMessage = (message: string) => {
    setMessages((prev) => [
      ...prev.slice(-4),
      `${
        typeof window !== "undefined" ? new Date().toLocaleTimeString() : ""
      }: ${message}`,
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim() || !isConnected || isProcessing) return;

    setIsProcessing(true);
    addMessage(`Sending: "${text}"`);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(text);
      setText("");
    } else {
      setIsProcessing(false);
      addMessage("Not connected to server");
    }
  };

  return (
    <div className={`bg-black/80 backdrop-blur-sm rounded-lg p-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          ElevenLabs Chat
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-300">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="mb-4 h-20 overflow-y-auto text-xs text-gray-400 space-y-1">
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something for the avatar to say..."
          disabled={!isConnected || isProcessing}
          className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
        />
        <Button
          type="submit"
          disabled={!isConnected || isProcessing || !text.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isProcessing ? "Processing..." : "Send"}
        </Button>
      </form>

      <div className="mt-2 text-xs text-gray-500">
        The avatar will speak and animate when you send a message
      </div>
    </div>
  );
}
