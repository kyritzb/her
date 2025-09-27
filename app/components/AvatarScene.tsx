"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRM, VRMHumanBoneName } from "@pixiv/three-vrm";

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
    camera.position.set(0, 1.6, 0.5);

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

    // --- Load VRM ---
    let vrm: VRM | null = null;
    // Breathing / pose support
    let breathingBone: THREE.Object3D | null = null;
    let baseChestX = 0;
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
        vrm.scene.rotation.y = Math.PI; // Rotate 180 degrees horizontally
        scene.add(vrm.scene);
        console.log("VRM loaded successfully!");

        // Light relax from T-pose: rotate upper arms slightly down
        try {
          const leftUpperArm = vrm.humanoid?.getBoneNode(
            VRMHumanBoneName.LeftUpperArm
          );
          const rightUpperArm = vrm.humanoid?.getBoneNode(
            VRMHumanBoneName.RightUpperArm
          );
          if (leftUpperArm) leftUpperArm.rotation.z = -0.6;
          if (rightUpperArm) rightUpperArm.rotation.z = 0.6;

          // Breathing on chest/spine
          const chest = vrm.humanoid?.getBoneNode(VRMHumanBoneName.Chest);
          const spine = vrm.humanoid?.getBoneNode(VRMHumanBoneName.Spine);
          breathingBone = chest ?? spine ?? null;
          baseChestX = breathingBone?.rotation.x ?? 0;
        } catch {
          // optional bones may not exist
        }
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
      camera.lookAt(0, 1.6, 0);

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

        // Face movement direction (accounting for 180-degree base rotation)
        const yaw = Math.atan2(dir.x, dir.z);
        vrm.scene.rotation.y = yaw + Math.PI;
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

    // --- Microphone lip-sync (fallback when realtime is not connected) ---
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;
    let timeDomainBuffer: Uint8Array | null = null;
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
        timeDomainBuffer = new Uint8Array(analyser.fftSize);
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
      if (!vrm?.expressionManager || !analyser || !timeDomainBuffer) return;

      (analyser as any).getByteTimeDomainData(timeDomainBuffer);
      let sum = 0;
      for (let i = 0; i < timeDomainBuffer.length; i++) {
        const v = (timeDomainBuffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / timeDomainBuffer.length);
      const open = Math.min(1, rms * 8); // Adjust sensitivity as needed

      // VRM 1.0 preset often uses "aa" for mouth open
      vrm.expressionManager.setValue("aa", open);
    }

    // --- Realtime visemes over WebSocket (for ElevenLabs or other sources) ---
    let realtimeSocket: WebSocket | null = null;
    let useRemoteVisemes = false;

    // Track expression weights with decay for smooth visemes
    const expressionWeights: Record<string, number> = {
      aa: 0,
      ee: 0,
      ih: 0,
      oh: 0,
      ou: 0,
      sil: 0, // silence
    };

    function visemeToExpressionKey(v: string): keyof typeof expressionWeights {
      const s = (v || "").toLowerCase();
      if (s === "a" || s === "aa") return "aa";
      if (s === "e" || s === "ee") return "ee";
      if (s === "i" || s === "ih") return "ih";
      if (s === "o" || s === "oh") return "oh";
      if (s === "u" || s === "ou") return "ou";
      if (s === "sil" || s === "silence") return "sil";
      return "aa";
    }

    function phonemeToViseme(p: string): keyof typeof expressionWeights {
      const s = (p || "").toLowerCase();
      if (s === "a") return "aa";
      if (s === "e") return "ee";
      if (s === "i") return "ih";
      if (s === "o") return "oh";
      if (s === "u") return "ou";
      return "aa";
    }

    function handleVisemeEvent(
      kind: "viseme" | "phoneme",
      value: string,
      strength: number
    ) {
      const key =
        kind === "viseme"
          ? visemeToExpressionKey(value)
          : phonemeToViseme(value);
      expressionWeights[key] = Math.min(
        1,
        Math.max(expressionWeights[key], strength)
      );
    }

    function updateRemoteVisemes(delta: number) {
      if (!vrm?.expressionManager) return;
      const decayPerSecond = 8.0; // Faster decay for more responsive animation

      (
        Object.keys(expressionWeights) as (keyof typeof expressionWeights)[]
      ).forEach((k) => {
        const next = Math.max(0, expressionWeights[k] - decayPerSecond * delta);
        expressionWeights[k] = next;

        // Only set VRM expressions that exist (skip 'sil')
        if (k !== "sil" && vrm!.expressionManager) {
          try {
            vrm!.expressionManager!.setValue(k, next);
          } catch (error) {
            // Expression might not exist in this VRM model
            console.warn(`Expression '${k}' not found in VRM model`);
          }
        }
      });
    }

    function connectRealtime() {
      try {
        const wsUrl =
          (process.env.NEXT_PUBLIC_REALTIME_WS_URL as string) ||
          "ws://localhost:4001";
        realtimeSocket = new WebSocket(wsUrl);
        realtimeSocket.onopen = () => {
          useRemoteVisemes = true;
          console.log("Connected to realtime viseme server:", wsUrl);
        };
        realtimeSocket.onclose = () => {
          useRemoteVisemes = false;
          realtimeSocket = null;
          console.log("Disconnected from realtime viseme server");
        };
        realtimeSocket.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string);
            console.log("Received viseme message:", msg);

            if (msg?.type === "viseme" && typeof msg.viseme === "string") {
              handleVisemeEvent("viseme", msg.viseme, Number(msg.value ?? 1.0));
            } else if (
              msg?.type === "phoneme" &&
              typeof msg.phoneme === "string"
            ) {
              handleVisemeEvent(
                "phoneme",
                msg.phoneme,
                Number(msg.value ?? 1.0)
              );
            } else if (msg?.type === "connection") {
              console.log("Realtime server connection message:", msg.message);
            }
          } catch (error) {
            console.warn("Failed to parse viseme message:", error);
          }
        };
      } catch {
        // ignore connect errors
      }
    }
    connectRealtime();

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
      // Drive lips either from realtime visemes or fallback mic
      if (useRemoteVisemes) {
        updateRemoteVisemes(delta);
      } else {
        lipSync();
      }

      // Gentle breathing
      if (breathingBone) {
        breathingBone.rotation.x =
          baseChestX + Math.sin(clock.elapsedTime * 1.2) * 0.015;
      }
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

      if (realtimeSocket) {
        try {
          realtimeSocket.close();
        } catch {}
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
