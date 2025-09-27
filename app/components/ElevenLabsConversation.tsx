"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { useConversation } from "@elevenlabs/react";

interface ElevenLabsConversationProps {
  className?: string;
}

export default function ElevenLabsConversation({
  className,
}: ElevenLabsConversationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const realtimeWsRef = useRef<WebSocket | null>(null);
  const audioAnalysisRef = useRef<number | null>(null);

  // ElevenLabs Agent ID - you'll need to create this in your ElevenLabs dashboard
  const agentId =
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "your-agent-id-here";

  // Use the ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      addMessage("🔗 Connected to ElevenLabs agent");
    },
    onDisconnect: () => {
      addMessage("❌ Disconnected from ElevenLabs agent");
    },
    onError: (error: any) => {
      addMessage(
        `❌ Error: ${
          typeof error === "string" ? error : error?.message || "Unknown error"
        }`
      );
    },
    onMessage: (message) => {
      if (message.source === "ai") {
        addMessage(`🤖 Agent: ${message.message || "Speaking..."}`);
        // Simulate visemes from agent response
        if (message.message) {
          simulateVisemesFromSpeech(message.message);
        }
      } else {
        addMessage(`👤 You: ${message.message}`);
      }
    },
    onStatusChange: (status) => {
      addMessage(`📊 Status changed to: ${status}`);
      // Use conversation.isSpeaking to detect when agent is speaking
      // This will be handled in the component render logic
    },
    // Add audio processing callback
    onAudioData: (audioData: Float32Array) => {
      if (audioData && audioData.length > 0) {
        analyzeAudioForVisemes(audioData);
      }
    },
  });

  // Connect to our realtime server for viseme forwarding
  const realtimeWsUrl =
    process.env.NEXT_PUBLIC_REALTIME_WS_URL || "ws://localhost:4001";

  useEffect(() => {
    setIsMounted(true);
    connectRealtimeServer();
    return () => {
      if (realtimeWsRef.current) {
        realtimeWsRef.current.close();
      }
    };
  }, []);

  // Monitor conversation speaking state for audio analysis
  useEffect(() => {
    if (conversation.isSpeaking) {
      addMessage("🎵 Agent audio started");
      handleSpeechStart();
      startAudioAnalysis();
    } else {
      addMessage("🎵 Agent audio ended");
      handleSpeechEnd();
      handleViseme("sil", 0);
      stopAudioAnalysis();
    }
  }, [conversation.isSpeaking]);

  const connectRealtimeServer = () => {
    try {
      realtimeWsRef.current = new WebSocket(realtimeWsUrl);

      realtimeWsRef.current.onopen = () => {
        setIsConnected(true);
        addMessage("Connected to avatar animation server");
        console.log("Connected to realtime WebSocket for avatar animation");
      };

      realtimeWsRef.current.onclose = () => {
        setIsConnected(false);
        addMessage("Disconnected from avatar animation server");
        console.log("Disconnected from realtime WebSocket");

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!isConnected) {
            connectRealtimeServer();
          }
        }, 3000);
      };

      realtimeWsRef.current.onerror = (event: Event) => {
        const errorMessage =
          event instanceof ErrorEvent ? event.message : "Connection failed";

        console.error("Realtime WebSocket error:", errorMessage);
        addMessage("Avatar animation connection error");
      };
    } catch (error) {
      console.error("Failed to connect to realtime WebSocket:", error);
      addMessage("Failed to connect to avatar animation server");
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

  // Handle speech events from ElevenLabs
  const handleSpeechStart = () => {
    addMessage("🎤 Agent started speaking");
  };

  const handleSpeechEnd = () => {
    addMessage("🔇 Agent finished speaking");
  };

  // Audio analysis control functions
  const startAudioAnalysis = () => {
    setIsAnalyzing(true);
    addMessage("🎵 Starting real-time mouth animation");
  };

  const stopAudioAnalysis = () => {
    setIsAnalyzing(false);
    if (audioAnalysisRef.current) {
      clearInterval(audioAnalysisRef.current);
      audioAnalysisRef.current = null;
    }
    addMessage("🔇 Stopped mouth animation");
  };

  // Handle viseme data and forward to avatar
  const handleViseme = (viseme: string, value: number = 1.0) => {
    if (
      realtimeWsRef.current &&
      realtimeWsRef.current.readyState === WebSocket.OPEN
    ) {
      realtimeWsRef.current.send(
        JSON.stringify({
          type: "viseme",
          viseme: viseme,
          value: value,
          timestamp: Date.now(),
        })
      );
    }
  };

  // Enhanced audio analysis for better viseme detection
  const analyzeAudioForVisemes = (audioData: Float32Array) => {
    if (!isAnalyzing) return;

    // Calculate RMS for volume
    let rms = 0;
    for (let i = 0; i < audioData.length; i++) {
      rms += audioData[i] * audioData[i];
    }
    rms = Math.sqrt(rms / audioData.length);

    if (rms < 0.005) {
      // Silence - close mouth
      handleViseme("sil", 0);
      return;
    }

    // Enhanced frequency analysis for better viseme detection
    const intensity = Math.min(1.0, rms * 15);

    // Analyze frequency content for better viseme mapping
    const lowFreq = calculateFrequencyBand(
      audioData,
      0,
      audioData.length * 0.2
    );
    const midFreq = calculateFrequencyBand(
      audioData,
      audioData.length * 0.2,
      audioData.length * 0.6
    );
    const highFreq = calculateFrequencyBand(
      audioData,
      audioData.length * 0.6,
      audioData.length
    );

    // Map frequency characteristics to visemes
    let dominantViseme = "aa";
    let visemeIntensity = intensity;

    if (highFreq > midFreq && highFreq > lowFreq) {
      // High frequency content - "ee" or "ih" sounds
      dominantViseme = Math.random() > 0.5 ? "ee" : "ih";
      visemeIntensity = intensity * 0.9;
    } else if (lowFreq > midFreq && lowFreq > highFreq) {
      // Low frequency content - "oh" or "ou" sounds
      dominantViseme = Math.random() > 0.5 ? "oh" : "ou";
      visemeIntensity = intensity * 0.8;
    } else {
      // Mid frequency content - "aa" sounds
      dominantViseme = "aa";
      visemeIntensity = intensity;
    }

    // Add some randomness for more natural movement
    const randomFactor = 0.8 + Math.random() * 0.4;
    handleViseme(dominantViseme, visemeIntensity * randomFactor);
  };

  // Helper function to calculate frequency band energy
  const calculateFrequencyBand = (
    audioData: Float32Array,
    start: number,
    end: number
  ) => {
    let energy = 0;
    const startIdx = Math.floor(start);
    const endIdx = Math.floor(Math.min(end, audioData.length));

    for (let i = startIdx; i < endIdx; i++) {
      energy += Math.abs(audioData[i]);
    }
    return energy / (endIdx - startIdx);
  };

  // Enhanced text-based viseme generation as fallback
  const simulateVisemesFromSpeech = (text: string) => {
    if (!text) return;

    addMessage("🎭 Simulating mouth movements from text");
    const words = text.split(" ");
    let delay = 0;

    words.forEach((word, wordIndex) => {
      setTimeout(() => {
        // Enhanced phoneme to viseme mapping
        for (let i = 0; i < word.length; i++) {
          const char = word.toLowerCase()[i];
          const nextChar = word.toLowerCase()[i + 1] || "";

          setTimeout(() => {
            let viseme = "aa"; // default
            let intensity = 0.6 + Math.random() * 0.4;

            // Vowel sounds
            if ("aeiou".includes(char)) {
              switch (char) {
                case "a":
                  viseme = "aa";
                  intensity = 0.8 + Math.random() * 0.2;
                  break;
                case "e":
                  viseme = "ee";
                  intensity = 0.7 + Math.random() * 0.2;
                  break;
                case "i":
                  viseme = "ih";
                  intensity = 0.6 + Math.random() * 0.3;
                  break;
                case "o":
                  viseme = "oh";
                  intensity = 0.8 + Math.random() * 0.2;
                  break;
                case "u":
                  viseme = "ou";
                  intensity = 0.7 + Math.random() * 0.2;
                  break;
              }
            }
            // Consonant sounds (simplified mapping)
            else if ("bpm".includes(char)) {
              viseme = "aa"; // Closed mouth sounds use default
              intensity = 0.3 + Math.random() * 0.2;
            } else if ("fv".includes(char)) {
              viseme = "aa";
              intensity = 0.4 + Math.random() * 0.2;
            } else if ("tdnl".includes(char)) {
              viseme = "aa";
              intensity = 0.5 + Math.random() * 0.2;
            }

            handleViseme(viseme, intensity);
          }, delay);
          delay += 80 + Math.random() * 40; // More natural timing variation
        }

        // Add pause between words
        delay += 150 + Math.random() * 100;
      }, delay);
    });

    // Close mouth at the end
    setTimeout(() => {
      handleViseme("sil", 0);
    }, delay + 500);
  };

  return (
    <div className={`bg-black/80 backdrop-blur-sm rounded-lg p-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          ElevenLabs AI Agent
        </h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-300">
              Avatar Animation: {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isAnalyzing ? "bg-blue-500 animate-pulse" : "bg-gray-500"
              }`}
            />
            <span className="text-sm text-gray-300">
              Mouth Sync: {isAnalyzing ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="mb-4 h-20 overflow-y-auto text-xs text-gray-400 space-y-1">
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </div>

      {/* ElevenLabs Conversation Interface */}
      <div className="mb-4">
        {isMounted ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">
                Status: {conversation.status || "Disconnected"}
              </span>
              {!conversation.isConnected ? (
                <Button
                  onClick={() => conversation.startSession({ agentId })}
                  className="bg-green-600 hover:bg-green-700 text-sm px-3 py-1"
                >
                  Start Conversation
                </Button>
              ) : (
                <Button
                  onClick={() => conversation.endSession()}
                  className="bg-red-600 hover:bg-red-700 text-sm px-3 py-1"
                >
                  End Conversation
                </Button>
              )}
            </div>

            {conversation.isConnected && (
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">
                  {conversation.isSpeaking
                    ? "🎤 Listening..."
                    : "💬 Speak to the agent"}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(conversation.volume || 0) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-4">
            Loading conversation interface...
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500">
        <div>• Click to start conversation with AI agent</div>
        <div>• Avatar will animate mouth movements during speech</div>
        <div>• Agent ID: {agentId}</div>
      </div>
    </div>
  );
}
