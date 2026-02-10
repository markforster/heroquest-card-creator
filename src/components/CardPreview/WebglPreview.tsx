"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import type { Group } from "three";
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  MultiplyBlending,
  NoToneMapping,
  NoColorSpace,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector3,
} from "three";

import styles from "./WebglPreview.module.css";

import blueprintFallback from "@/assets/blueprint.png";
import linenNormal2 from "@/assets/linen-2.png";
import linenNormal3 from "@/assets/linen-3.png";
import { useWebglPreviewSettings } from "@/components/WebglPreviewSettingsContext";

type WebglPreviewProps = {
  className?: string;
  textureCanvas?: HTMLCanvasElement | null;
  textureVersion?: number;
  fallbackTextureSrc?: string;
};

const CARD_ASPECT = 1050 / 750;
const MAX_ROTATION_X_DEG = 25;
const MAX_ROTATION_Y_DEG = 60;
const ROTATION_SMOOTHING = 0.12;
const LINEN_NORMAL_MAP = linenNormal3;
const USE_DEBUG_NORMAL_MAP = false;
const BLUEPRINT_DELAY_MS = 20;

function CardPlane({
  texture,
  sheenPower,
  sheenIntensity,
}: {
  texture: Texture;
  sheenPower: number;
  sheenIntensity: number;
}) {
  const geometry = useMemo(() => new PlaneGeometry(1, CARD_ASPECT), []);
  texture.colorSpace = SRGBColorSpace;
  texture.premultiplyAlpha = true;
  const linenNormalTexture = useLoader(TextureLoader, LINEN_NORMAL_MAP.src);
  linenNormalTexture.colorSpace = NoColorSpace;
  linenNormalTexture.wrapS = RepeatWrapping;
  linenNormalTexture.wrapT = RepeatWrapping;
  linenNormalTexture.repeat.set(1.6, 2.2);
  linenNormalTexture.needsUpdate = true;

  const debugNormalTexture = useMemo(() => {
    if (!USE_DEBUG_NORMAL_MAP) return null;
    const size = 128;
    const cell = 8;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const isEven = ((x + y) / cell) % 2 === 0;
        // Encode strong normals in RGB (0-255).
        const color = isEven ? "rgb(255,128,255)" : "rgb(128,255,255)";
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cell, cell);
      }
    }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = NoColorSpace;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const activeNormalTexture = USE_DEBUG_NORMAL_MAP ? debugNormalTexture : linenNormalTexture;
  const glintMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uWidth: { value: 0.18 },
        uIntensity: { value: 1.6 },
        uColor: { value: new Vector3(1, 1, 1) },
        uAlpha: { value: texture },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vUv = uv;
          vNormal = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uWidth;
        uniform float uIntensity;
        uniform vec3 uColor;
        uniform sampler2D uAlpha;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float alphaMask = texture2D(uAlpha, vUv).a;
          float viewTilt = (vViewDir.x + vViewDir.y) * 0.5;
          float bandPos = (vUv.x * 0.65 + vUv.y * 0.65) + viewTilt * 0.6;
          float center = 0.55;
          float halfWidth = uWidth * 0.5;
          float band = 1.0 - smoothstep(center - halfWidth, center + halfWidth, bandPos);
          float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 1.8);
          float alpha = band * fresnel * uIntensity * alphaMask;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    return material;
  }, [texture]);
  useEffect(() => {
    glintMaterial.uniforms.uWidth.value = Math.max(0.05, Math.min(0.5, sheenPower));
    glintMaterial.uniforms.uIntensity.value = sheenIntensity;
  }, [glintMaterial, sheenPower, sheenIntensity]);
  const grainTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const value = 140 + Math.random() * 80;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    const tex = new CanvasTexture(canvas);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(6, 8.4);
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);
  const { width, height } = useThree((state) => state.viewport);
  // const scale = Math.min(width, height / CARD_ASPECT) * 0.98;
  const scale = Math.min(width, height / CARD_ASPECT) * 1.0;

  return (
    <group scale={[scale, scale, 1]}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={0.45}
          normalMap={activeNormalTexture ?? undefined}
          normalScale={[2.0, 2.0]}
          roughness={0.6}
          metalness={0.02}
          clearcoat={0.3}
          clearcoatRoughness={0.25}
          side={DoubleSide}
          transparent
          alphaTest={0.5}
        />
      </mesh>
      {activeNormalTexture ? (
        <mesh geometry={geometry} position={[0, 0, 0.001]} renderOrder={1}>
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.45}
            blending={AdditiveBlending}
            depthWrite={false}
            roughness={0.3}
            normalMap={activeNormalTexture}
            normalScale={[1.1, 1.1]}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.2}
            side={DoubleSide}
            alphaMap={texture}
            alphaTest={0.5}
          />
        </mesh>
      ) : null}
      {/* Linen overlay removed; using normal map for visible grain response. */}
      <mesh geometry={geometry} position={[0, 0, 0.0022]} renderOrder={3}>
        <primitive object={glintMaterial} attach="material" />
      </mesh>
      {grainTexture ? (
        <mesh geometry={geometry} position={[0, 0, 0.0032]} renderOrder={4}>
          <meshBasicMaterial
            map={grainTexture}
            blending={MultiplyBlending}
            opacity={0.22}
            transparent
            depthWrite={false}
            side={DoubleSide}
            alphaMap={texture}
            alphaTest={0.5}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function WebglScene({
  texture,
  yawGroupRef,
  pitchGroupRef,
  targetRotationRef,
  sheenPower,
  sheenIntensity,
}: {
  texture: Texture;
  yawGroupRef: RefObject<Group>;
  pitchGroupRef: RefObject<Group>;
  targetRotationRef: MutableRefObject<{ x: number; y: number }>;
  sheenPower: number;
  sheenIntensity: number;
}) {
  useFrame(() => {
    const yawGroup = yawGroupRef.current;
    const pitchGroup = pitchGroupRef.current;
    if (!yawGroup || !pitchGroup) return;
    pitchGroup.rotation.x +=
      (targetRotationRef.current.x - pitchGroup.rotation.x) * ROTATION_SMOOTHING;
    yawGroup.rotation.y +=
      (targetRotationRef.current.y - yawGroup.rotation.y) * ROTATION_SMOOTHING;
  });

  return (
    <group ref={yawGroupRef}>
      <group ref={pitchGroupRef}>
        <CardPlane texture={texture} sheenPower={sheenPower} sheenIntensity={sheenIntensity} />
      </group>
    </group>
  );
}

export default function WebglPreview({
  className,
  textureCanvas,
  textureVersion = 0,
  fallbackTextureSrc,
}: WebglPreviewProps) {
  const rootClassName = className ? `${styles.root} ${className}` : styles.root;
  const { sheenAngle, sheenIntensity } = useWebglPreviewSettings();
  const glintPower = Math.max(0.06, Math.min(0.45, 0.55 - sheenAngle * 0.35));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const yawGroupRef = useRef<Group | null>(null);
  const pitchGroupRef = useRef<Group | null>(null);
  const fallbackTexture = useLoader(TextureLoader, fallbackTextureSrc ?? blueprintFallback.src);
  fallbackTexture.colorSpace = SRGBColorSpace;
  fallbackTexture.premultiplyAlpha = true;
  const [isReadyForCanvas, setIsReadyForCanvas] = useState(false);
  const [hasRenderedOnce, setHasRenderedOnce] = useState(false);
  const canvasTexture = useMemo(() => {
    if (!textureCanvas) return null;
    const tex = new CanvasTexture(textureCanvas);
    tex.colorSpace = SRGBColorSpace;
    tex.premultiplyAlpha = true;
    return tex;
  }, [textureCanvas]);
  useEffect(() => {
    if (canvasTexture) {
      canvasTexture.needsUpdate = true;
    }
  }, [canvasTexture, textureVersion]);
  useEffect(() => {
    if (!textureCanvas) {
      setIsReadyForCanvas(false);
      return;
    }
    if (hasRenderedOnce) {
      setIsReadyForCanvas(true);
      return;
    }
    setIsReadyForCanvas(false);
    const timeoutId = window.setTimeout(() => {
      setIsReadyForCanvas(true);
    }, BLUEPRINT_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [textureCanvas, textureVersion, hasRenderedOnce]);
  useEffect(() => {
    if (!hasRenderedOnce && canvasTexture && isReadyForCanvas) {
      setHasRenderedOnce(true);
    }
  }, [canvasTexture, hasRenderedOnce, isReadyForCanvas]);
  const activeTexture = canvasTexture && isReadyForCanvas ? canvasTexture : fallbackTexture;
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startRotX: number;
    startRotY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startRotX: 0,
    startRotY: 0,
  });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const clampRotation = (value: number, maxDeg: number) => {
    const max = (maxDeg * Math.PI) / 180;
    return Math.max(-max, Math.min(max, value));
  };

  const applyResistance = (value: number, maxDeg: number) => {
    const max = (maxDeg * Math.PI) / 180;
    const normalized = Math.min(1, Math.abs(value) / max);
    const eased = Math.pow(normalized, 0.7);
    return Math.sign(value) * max * eased;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    containerRef.current.setPointerCapture(event.pointerId);
    const currentYaw = yawGroupRef.current;
    const currentPitch = pitchGroupRef.current;
    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startRotX: currentPitch?.rotation.x ?? 0,
      startRotY: currentYaw?.rotation.y ?? 0,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxY = (MAX_ROTATION_Y_DEG * Math.PI) / 180;
    const maxX = (MAX_ROTATION_X_DEG * Math.PI) / 180;
    const dx = (event.clientX - drag.startX) / Math.max(rect.width, 1);
    const dy = (event.clientY - drag.startY) / Math.max(rect.height, 1);
    const nextY = drag.startRotY + dx * maxY * 2;
    const nextX = drag.startRotX + dy * maxX * 2;
    targetRotationRef.current = {
      x: clampRotation(applyResistance(nextX, MAX_ROTATION_X_DEG), MAX_ROTATION_X_DEG),
      y: clampRotation(applyResistance(nextY, MAX_ROTATION_Y_DEG), MAX_ROTATION_Y_DEG),
    };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    containerRef.current.releasePointerCapture(event.pointerId);
    dragStateRef.current.active = false;
    setIsDragging(false);
    targetRotationRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      ref={containerRef}
      className={rootClassName}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <Canvas
        className={styles.canvas}
        camera={{ position: [0, 0, 1.3], fov: 30 }}
        gl={{
          alpha: true,
          outputColorSpace: SRGBColorSpace,
          toneMapping: NoToneMapping,
          toneMappingExposure: 1,
        }}
      >
        <ambientLight intensity={0.4} />
        <spotLight
          position={[2.5, 3.2, 4]}
          intensity={sheenIntensity * 2.4}
          angle={Math.max(0.2, sheenAngle * 0.65)}
          penumbra={0.25}
        />
        <directionalLight position={[-2.5, -1.5, 3.5]} intensity={0.4} />
        <WebglScene
          texture={activeTexture}
          yawGroupRef={yawGroupRef}
          pitchGroupRef={pitchGroupRef}
          targetRotationRef={targetRotationRef}
          sheenPower={glintPower}
          sheenIntensity={sheenIntensity}
        />
      </Canvas>
    </div>
  );
}
