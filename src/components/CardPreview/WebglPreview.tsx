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
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  TextureLoader,
  Vector3,
} from "three";

import styles from "./WebglPreview.module.css";

import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import { useWebglPreviewSettings } from "@/components/WebglPreviewSettingsContext";

type WebglPreviewProps = {
  className?: string;
  textureUrl?: string | null;
};

const CARD_ASPECT = 1050 / 750;
const MAX_ROTATION_DEG = 60;
const ROTATION_SMOOTHING = 0.12;

function CardPlane({
  textureUrl,
  sheenPower,
  sheenIntensity,
}: {
  textureUrl?: string | null;
  sheenPower: number;
  sheenIntensity: number;
}) {
  const geometry = useMemo(() => new PlaneGeometry(1, CARD_ASPECT), []);
  const textureSource = textureUrl ?? parchmentBackground.src;
  const texture = useLoader(TextureLoader, textureSource);
  texture.colorSpace = SRGBColorSpace;
  texture.premultiplyAlpha = true;
  const linenRoughnessMap = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(70,70,70,0.9)";
    ctx.lineWidth = 1.2;
    for (let i = -size; i < size * 2; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - size, size);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(190,190,190,0.9)";
    for (let i = -size; i < size * 2; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, size);
      ctx.lineTo(i + size, 0);
      ctx.stroke();
    }

    const tex = new CanvasTexture(canvas);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(24, 32);
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);
  const linenOverlayTexture = linenRoughnessMap;
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
        <meshBasicMaterial map={texture} side={DoubleSide} transparent alphaTest={0.5} />
      </mesh>
      {linenRoughnessMap ? (
        <mesh geometry={geometry} position={[0, 0, 0.001]} renderOrder={1}>
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.45}
            blending={AdditiveBlending}
            depthWrite={false}
            roughness={0.5}
            roughnessMap={linenRoughnessMap}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.2}
            side={DoubleSide}
            alphaMap={texture}
            alphaTest={0.5}
          />
        </mesh>
      ) : null}
      {linenOverlayTexture ? (
        <mesh geometry={geometry} position={[0, 0, 0.0018]} renderOrder={2}>
          <meshBasicMaterial
            map={linenOverlayTexture}
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
      {/* Glint layer temporarily disabled. */}
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
  textureUrl,
  cardGroupRef,
  targetRotationRef,
  sheenPower,
  sheenIntensity,
}: {
  textureUrl?: string | null;
  cardGroupRef: RefObject<Group>;
  targetRotationRef: MutableRefObject<{ x: number; y: number }>;
  sheenPower: number;
  sheenIntensity: number;
}) {
  useFrame(() => {
    const group = cardGroupRef.current;
    if (!group) return;
    group.rotation.x += (targetRotationRef.current.x - group.rotation.x) * ROTATION_SMOOTHING;
    group.rotation.y += (targetRotationRef.current.y - group.rotation.y) * ROTATION_SMOOTHING;
  });

  return (
    <group ref={cardGroupRef}>
      <CardPlane
        textureUrl={textureUrl}
        sheenPower={sheenPower}
        sheenIntensity={sheenIntensity}
      />
    </group>
  );
}

export default function WebglPreview({ className, textureUrl }: WebglPreviewProps) {
  const rootClassName = className ? `${styles.root} ${className}` : styles.root;
  const { sheenAngle, sheenIntensity } = useWebglPreviewSettings();
  const glintPower = Math.max(0.06, Math.min(0.45, 0.55 - sheenAngle * 0.35));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardGroupRef = useRef<Group | null>(null);
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

  const clampRotation = (value: number) => {
    const max = (MAX_ROTATION_DEG * Math.PI) / 180;
    return Math.max(-max, Math.min(max, value));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    containerRef.current.setPointerCapture(event.pointerId);
    const current = cardGroupRef.current;
    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startRotX: current?.rotation.x ?? 0,
      startRotY: current?.rotation.y ?? 0,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const max = (MAX_ROTATION_DEG * Math.PI) / 180;
    const dx = (event.clientX - drag.startX) / Math.max(rect.width, 1);
    const dy = (event.clientY - drag.startY) / Math.max(rect.height, 1);
    const nextY = drag.startRotY + dx * max * 2;
    const nextX = drag.startRotX + dy * max * 2;
    targetRotationRef.current = {
      x: clampRotation(nextX),
      y: clampRotation(nextY),
    };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    containerRef.current.releasePointerCapture(event.pointerId);
    dragStateRef.current.active = false;
    setIsDragging(false);
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
          intensity={sheenIntensity}
          angle={sheenAngle}
          penumbra={0.45}
        />
        <directionalLight position={[-2.5, -1.5, 3.5]} intensity={0.4} />
        <WebglScene
          textureUrl={textureUrl}
          cardGroupRef={cardGroupRef}
          targetRotationRef={targetRotationRef}
          sheenPower={glintPower}
          sheenIntensity={sheenIntensity}
        />
      </Canvas>
    </div>
  );
}
