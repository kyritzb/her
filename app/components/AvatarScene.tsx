"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRM } from "@pixiv/three-vrm";

export default function AvatarScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- renderer / scene / camera ---
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111318);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.5, 2);

    // Lighting setup
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 1.0);
    scene.add(hemi);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Add a simple ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- Animation System ---
    let vrm: VRM | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let idleAction: THREE.AnimationAction | null = null;
    let walkAction: THREE.AnimationAction | null = null;
    let currentAnimation = "idle";
    let isMoving = false;
    
    // Animation state
    const animationState = {
      idle: { weight: 1.0, action: null as THREE.AnimationAction | null },
      walk: { weight: 0.0, action: null as THREE.AnimationAction | null },
      wave: { weight: 0.0, action: null as THREE.AnimationAction | null }
    };

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    // Try to load a VRM file - you'll need to place one in public/avatar.vrm
    loader.load(
      "/avatar.vrm",
      (gltf) => {
        vrm = (gltf as any).userData.vrm as VRM;
        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
          if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
        vrm.scene.position.set(0, 0, 0);
        scene.add(vrm.scene);
        
        // Initialize animation mixer
        mixer = new THREE.AnimationMixer(vrm.scene);
        
        // Create procedural animations
        createProceduralAnimations();
        
        console.log("VRM loaded successfully with animations!");
      },
      (progress) => {
        console.log(
          "Loading progress:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (err) => {
        console.error("Failed to load VRM:", err);
        console.log("Make sure to place a VRM file at public/avatar.vrm");

        // Create a simple fallback cube if VRM fails to load
        const geometry = new THREE.BoxGeometry(1, 2, 0.5);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 1, 0);
        cube.castShadow = true;
        scene.add(cube);
      }
    );

    // --- Input handling (WASD + mouse look) ---
    const keys: Record<string, boolean> = {};
    const mouse = { x: 0, y: 0, isDown: false };

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      mouse.isDown = true;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const onMouseUp = () => {
      mouse.isDown = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!mouse.isDown) return;

      const deltaX = e.clientX - mouse.x;
      const deltaY = e.clientY - mouse.y;

      // Rotate camera around the avatar
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi += deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 1, 0);

      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    function driveLocomotion(delta: number) {
      if (!vrm) return;

      const speed = 1.5; // m/s
      const dir = new THREE.Vector3(
        (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0),
        0,
        (keys["KeyS"] ? 1 : 0) - (keys["KeyW"] ? 1 : 0)
      );

      if (dir.lengthSq() > 0) {
        dir.normalize().multiplyScalar(speed * delta);
        vrm.scene.position.add(dir);

        // Face movement direction
        const yaw = Math.atan2(dir.x, dir.z);
        vrm.scene.rotation.y = yaw;
      }
    }

    // --- Automatic blinking ---
    let blinkTimer = 0;
    function doBlink(delta: number) {
      if (!vrm?.expressionManager) return;

      blinkTimer += delta;
      if (blinkTimer > 3.5 + Math.random() * 2.0) {
        vrm.expressionManager.setValue("blink", 1.0);
        setTimeout(() => {
          if (vrm?.expressionManager) {
            vrm.expressionManager.setValue("blink", 0.0);
          }
        }, 80);
        blinkTimer = 0;
      }
    }

    // --- Microphone lip-sync ---
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;
    let mediaStream: MediaStream | null = null;

    async function initMic() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        audioCtx = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(mediaStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        src.connect(analyser);

        console.log("Microphone initialized for lip-sync");
      } catch (error) {
        console.log(
          "Microphone permission denied or not available - lip-sync disabled"
        );
      }
    }

    // Initialize mic with user gesture (click to enable)
    const enableMic = () => {
      initMic();
      container.removeEventListener("click", enableMic);
    };
    container.addEventListener("click", enableMic);

    function lipSync() {
      if (!vrm?.expressionManager || !analyser || !dataArray) return;

      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const open = Math.min(1, rms * 8); // Adjust sensitivity as needed

      // VRM 1.0 preset often uses "aa" for mouth open
      vrm.expressionManager.setValue("aa", open);
    }

    // --- Emotion controls ---
    function handleEmotions() {
      if (!vrm?.expressionManager) return;

      // Number keys for emotions
      if (keys["Digit1"]) vrm.expressionManager.setValue("happy", 1.0);
      else vrm.expressionManager.setValue("happy", 0.0);

      if (keys["Digit2"]) vrm.expressionManager.setValue("angry", 1.0);
      else vrm.expressionManager.setValue("angry", 0.0);

      if (keys["Digit3"]) vrm.expressionManager.setValue("sad", 1.0);
      else vrm.expressionManager.setValue("sad", 0.0);

      if (keys["Digit4"]) vrm.expressionManager.setValue("surprised", 1.0);
      else vrm.expressionManager.setValue("surprised", 0.0);
    }

    // --- Resize handling ---
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // --- Animation loop ---
    const clock = new THREE.Clock();
    let raf = 0;

    const tick = () => {
      const delta = clock.getDelta();

      driveLocomotion(delta);
      doBlink(delta);
      lipSync();
      handleEmotions();

      // Update VRM
      if (vrm) {
        vrm.update(delta);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();

      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close();
      }

      renderer.dispose();
      scene.traverse((obj) => {
        if ((obj as any).geometry) (obj as any).geometry.dispose?.();
        if ((obj as any).material) {
          const material = (obj as any).material;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose?.());
          } else {
            material.dispose?.();
          }
        }
      });

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="avatar-container">
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100vh",
          display: "block",
          overflow: "hidden",
          cursor: "grab",
        }}
      />

      {/* Controls overlay */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "white",
          fontFamily: "monospace",
          fontSize: "14px",
          background: "rgba(0,0,0,0.7)",
          padding: "15px",
          borderRadius: "8px",
          pointerEvents: "none",
          lineHeight: "1.4",
        }}
      >
        <div>
          <strong>VRM Avatar Controller</strong>
        </div>
        <div>WASD: Move avatar</div>
        <div>Mouse: Drag to rotate camera</div>
        <div>Click: Enable microphone lip-sync</div>
        <div>1-4: Emotions (Happy, Angry, Sad, Surprised)</div>
        <div style={{ marginTop: "10px", fontSize: "12px", opacity: 0.8 }}>
          Place your VRM file at: public/avatar.vrm
        </div>
      </div>
    </div>
  );
}
