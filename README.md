# VRM Avatar Controller

A Next.js application for programmatically controlling VRChat-style avatars in the browser using Three.js and VRM format.

## Features

- **VRM Avatar Support**: Load and display VRM format avatars (VRChat-style models)
- **Real-time Controls**:
  - WASD movement
  - Mouse camera controls
  - Microphone lip-sync
  - Emotion controls (1-4 keys)
- **Automatic Behaviors**:
  - Realistic blinking
  - Smooth animations
  - Shadow rendering
- **Web-based**: Runs entirely in the browser with WebGL

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:

- Next.js 15+ with App Router
- Three.js for 3D rendering
- @pixiv/three-vrm for VRM avatar support
- TypeScript for type safety

### 2. Add Your VRM Avatar

Place a VRM file at `public/avatar.vrm`. You can get VRM avatars from:

- **VRoid Studio**: Create custom avatars and export as VRM
- **Ready Player Me**: Generate avatars and convert to VRM format
- **VRChat**: Export existing avatars (if you have permission)
- **Booth.pm**: Purchase VRM-compatible models

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Enable Microphone (Optional)

Click anywhere on the screen to enable microphone access for lip-sync functionality.

## Controls

| Input          | Action                     |
| -------------- | -------------------------- |
| **WASD**       | Move avatar around         |
| **Mouse Drag** | Rotate camera view         |
| **Click**      | Enable microphone lip-sync |
| **1**          | Happy expression           |
| **2**          | Angry expression           |
| **3**          | Sad expression             |
| **4**          | Surprised expression       |

## Project Structure

```
├── app/
│   ├── components/
│   │   └── AvatarScene.tsx    # Main 3D scene component
│   ├── globals.css            # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page with dynamic import
├── public/
│   └── avatar.vrm            # Place your VRM file here
├── next.config.js            # Next.js configuration
├── package.json              # Dependencies
└── tsconfig.json            # TypeScript configuration
```

## Technical Details

### VRM Format

- Uses VRM 1.0 specification for maximum compatibility
- Supports humanoid rigging, facial expressions, and spring bones
- Automatic frustum culling disabled for better VRM compatibility

### Three.js Integration

- WebGL renderer with shadow mapping
- Hemisphere and directional lighting
- Automatic resizing and cleanup

### Audio Processing

- Real-time microphone input analysis
- RMS-based lip-sync mapping to VRM blendshapes
- Automatic gain control and noise suppression

## Extending the Project

### Adding Animations

```typescript
// Load GLB animation files
const animationLoader = new GLTFLoader();
animationLoader.load("/animations/idle.glb", (gltf) => {
  const mixer = new THREE.AnimationMixer(vrm.scene);
  const action = mixer.clipAction(gltf.animations[0]);
  action.play();
});
```

### WebXR Support

```typescript
// Enable VR mode
renderer.xr.enabled = true;
// Add VR button and handle controller input
```

### Face Tracking

```typescript
// Add MediaPipe integration for webcam face tracking
import { FaceMesh } from "@mediapipe/face_mesh";
// Map face landmarks to VRM head rotation and expressions
```

## Troubleshooting

### VRM Not Loading

- Ensure your VRM file is at `public/avatar.vrm`
- Check browser console for loading errors
- Verify VRM file is valid (test in VRM viewers)

### Performance Issues

- Reduce shadow map resolution in `AvatarScene.tsx`
- Lower renderer pixel ratio for mobile devices
- Optimize VRM model polygon count

### Microphone Not Working

- Ensure HTTPS (required for microphone access)
- Check browser permissions
- Test with different browsers

## Building for Production

```bash
npm run build
npm start
```

For deployment to Vercel:

```bash
vercel deploy
```

## License

MIT License - feel free to use this project as a starting point for your own VRM avatar applications.
