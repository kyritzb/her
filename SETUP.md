# VRM Avatar Conversation Setup Guide

This guide will help you set up a working conversation system with your VRM avatar that responds to ElevenLabs AI agent speech with realistic mouth animations.

## Prerequisites

1. **ElevenLabs Account**: Sign up at [elevenlabs.io](https://elevenlabs.io)
2. **VRM Avatar**: Place your VRM file at `public/avatar.vrm`
3. **Node.js**: Version 18 or higher

## Step 1: Install Dependencies

### Main App Dependencies

```bash
npm install
```

### Realtime Server Dependencies

```bash
cd realtime-server
npm install
cd ..
```

## Step 2: Environment Setup

Create a `.env.local` file in your project root:

```env
# ElevenLabs Configuration
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here

# Realtime WebSocket Server
NEXT_PUBLIC_REALTIME_WS_URL=ws://localhost:4001
```

### Getting Your ElevenLabs Credentials:

1. **API Key**:

   - Go to [ElevenLabs Profile](https://elevenlabs.io/app/profile)
   - Copy your API key

2. **Agent ID**:
   - Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
   - Create a new agent or use an existing one
   - Copy the Agent ID from the agent settings

## Step 3: Start the Services

### Terminal 1 - Start the Realtime Server

```bash
cd realtime-server
npm run dev
```

You should see:

```
Realtime viseme server running on port 4001
WebSocket endpoint: ws://localhost:4001
Health check: http://localhost:4001/health
```

### Terminal 2 - Start the Next.js App

```bash
npm run dev
```

## Step 4: Test the Setup

1. **Open your browser** to `http://localhost:3000`
2. **Check the avatar loads** - you should see your VRM character
3. **Check connections**:
   - Avatar Animation should show "Connected" (green dot)
   - ElevenLabs agent connection will show when you start a conversation
4. **Start a conversation**:
   - Click the conversation interface in the bottom right
   - Allow microphone access when prompted
   - Start talking to your AI agent
   - Watch the avatar's mouth move as the agent responds!

## Troubleshooting

### Avatar Not Loading

- Ensure your VRM file is at `public/avatar.vrm`
- Check browser console for loading errors
- Try a different VRM file if issues persist

### No Mouth Animation

- Check that both services are running (realtime server + Next.js)
- Verify WebSocket connection in browser dev tools
- Check console for viseme messages

### ElevenLabs Connection Issues

- Verify your API key and Agent ID are correct
- Check your ElevenLabs account has sufficient credits
- Ensure your agent is properly configured

### WebSocket Connection Failed

- Make sure the realtime server is running on port 4001
- Check if port 4001 is available (not used by other services)
- Try restarting both services

## How It Works

1. **ElevenLabs Conversation**: Handles voice-to-voice conversation with AI
2. **Viseme Generation**: Analyzes speech audio to generate mouth shapes
3. **WebSocket Relay**: Forwards viseme data from conversation to avatar
4. **VRM Animation**: Applies visemes to avatar's facial expressions

## Customization

### Adjust Animation Sensitivity

In `AvatarScene.tsx`, modify the decay rate:

```typescript
const decayPerSecond = 8.0; // Higher = faster mouth closing
```

### Add More Visemes

Extend the `expressionWeights` object with additional mouth shapes supported by your VRM model.

### Custom Agent Behavior

Configure your ElevenLabs agent with specific personality, voice, and conversation flow in the ElevenLabs dashboard.

## Next Steps

- Fine-tune viseme mapping for your specific VRM model
- Add emotion detection and facial expressions
- Implement gesture animations
- Add background music or ambient sounds
- Create multiple conversation scenarios

Enjoy your talking VRM avatar! 🎭✨
