"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  FrontSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  MultiplyBlending,
  NoToneMapping,
  NoColorSpace,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  Shape,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";

import blueprintFallback from "@/assets/blueprint.png";
import linenNormal3 from "@/assets/linen-3.png";
import { usePreviewRenderer } from "@/components/PreviewRendererContext";
import { useWebglPreviewSettings } from "@/components/WebglPreviewSettingsContext";
import { USE_WEBGL_SPARKLE_PARALLAX, WEBGL_BLUEPRINT_OVERLAY_MODE } from "@/config/flags";
import { createMagicOverlayMaterial } from "@/lib/webgl/magicOverlayShader";
import { createSparkleOverlayMaterial } from "@/lib/webgl/sparkleOverlayShader";

import styles from "./WebglPreview.module.css";

import type { MutableRefObject, RefObject } from "react";
import type { Group, Mesh, SpotLight, DirectionalLight } from "three";

type WebglPreviewProps = {
  className?: string;
  isVisible?: boolean;
  frontTextureCanvas?: HTMLCanvasElement | null;
  frontTextureVersion?: number;
  backTextureCanvas?: HTMLCanvasElement | null;
  backTextureVersion?: number;
  fallbackTextureSrc?: string;
  rotationResetToken?: number;
  recenterToken?: number;
};

const CARD_ASPECT = 1050 / 750;
const MAX_ROTATION_X_DEG = 25;
const MAX_ROTATION_Y_DEG = 60;
const ROTATION_SMOOTHING = 0.12;
const RECENTER_SMOOTHING = 0.26;
const RECENTER_DURATION_MS = 320;
const LINEN_NORMAL_MAP = linenNormal3;
const USE_DEBUG_NORMAL_MAP = false;
const BLUEPRINT_DELAY_MS = 20;
const ENABLE_SHEEN = true;
const SHEEN_INTENSITY_SCALE = 0.25;
const ENABLE_DEPTH = true;
const INVERT_VERTICAL_DRAG = false;
const CARD_THICKNESS = 0.0012;
const CARD_CORNER_RADIUS = 28 / 750;
const CARD_EDGE_INSET = 0.0085;
const EDGE_COLOR = "#310101";
const EDGE_BLUEPRINT_COLOR = "#2d6cc3";
const EDGE_BLUEPRINT_EMISSIVE = "#1a4f9a";
const EDGE_BLUEPRINT_OPACITY = 0.75;
const EDGE_ROUGHNESS = 0.72;
const EDGE_METALNESS = 0.05;
const EDGE_CLEARCOAT = 0.15;
const SPINNER_SIZE = 0.11;
const SPINNER_ROTATION_SPEED = -2.4;
const MAGIC_OVERLAY_OPACITY = 0.3;
const MAGIC_OVERLAY_SPEED = 6.6;

function CardPlane({
  texture,
  sheenPower,
  sheenIntensity,
  side,
  depthSign,
  depthOffset,
}: {
  texture: Texture;
  sheenPower: number;
  sheenIntensity: number;
  side: typeof FrontSide | typeof BackSide | typeof DoubleSide;
  depthSign: 1 | -1;
  depthOffset: number;
}) {
  const geometry = useMemo(() => new PlaneGeometry(1, CARD_ASPECT), []);
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
  const strongNormalScale = useMemo(() => new Vector2(2, 2), []);
  const lightNormalScale = useMemo(() => new Vector2(1.1, 1.1), []);
  const glintMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side,
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
  }, [side, texture]);
  useEffect(() => {
    glintMaterial.uniforms.uWidth.value = Math.max(0.05, Math.min(0.5, sheenPower));
    glintMaterial.uniforms.uIntensity.value = sheenIntensity * SHEEN_INTENSITY_SCALE;
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
      <mesh geometry={geometry} position={[0, 0, depthOffset]}>
        <meshPhysicalMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={0.45}
          normalMap={activeNormalTexture ?? undefined}
          normalScale={strongNormalScale}
          roughness={0.6}
          metalness={0.02}
          clearcoat={0.3}
          clearcoatRoughness={0.25}
          side={side}
          transparent
          alphaTest={0.5}
        />
      </mesh>
      {activeNormalTexture ? (
        <mesh
          geometry={geometry}
          position={[0, 0, depthOffset + 0.001 * depthSign]}
          renderOrder={1}
        >
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.45}
            blending={AdditiveBlending}
            depthWrite={false}
            roughness={0.3}
            normalMap={activeNormalTexture}
            normalScale={lightNormalScale}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.2}
            side={side}
            alphaMap={texture}
            alphaTest={0.5}
          />
        </mesh>
      ) : null}
      {/* Linen overlay removed; using normal map for visible grain response. */}
      {ENABLE_SHEEN ? (
        <mesh
          geometry={geometry}
          position={[0, 0, depthOffset + 0.0022 * depthSign]}
          renderOrder={3}
        >
          <primitive object={glintMaterial} attach="material" />
        </mesh>
      ) : null}
      {grainTexture ? (
        <mesh
          geometry={geometry}
          position={[0, 0, depthOffset + 0.0032 * depthSign]}
          renderOrder={4}
        >
          <meshBasicMaterial
            map={grainTexture}
            blending={MultiplyBlending}
            opacity={0.22}
            transparent
            depthWrite={false}
            side={side}
            alphaMap={texture}
            alphaTest={0.5}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function WebglScene({
  frontTexture,
  backTexture,
  yawGroupRef,
  pitchGroupRef,
  targetRotationRef,
  recenterBoostUntilRef,
  sheenPower,
  sheenIntensity,
  useBlueprintEdge,
  showSpinner,
  hasTwoSidedRender,
  showMagicOverlay,
  spotLightRef,
  directionalLightRef,
}: {
  frontTexture: Texture;
  backTexture: Texture;
  yawGroupRef: RefObject<Group>;
  pitchGroupRef: RefObject<Group>;
  targetRotationRef: MutableRefObject<{ x: number; y: number }>;
  recenterBoostUntilRef: MutableRefObject<number>;
  sheenPower: number;
  sheenIntensity: number;
  useBlueprintEdge: boolean;
  showSpinner: boolean;
  hasTwoSidedRender: boolean;
  showMagicOverlay: boolean;
  spotLightRef: RefObject<SpotLight>;
  directionalLightRef: RefObject<DirectionalLight>;
}) {
  const { width, height, gl } = useThree((state) => ({
    width: state.viewport.width,
    height: state.viewport.height,
    gl: state.gl,
  }));
  const scale = Math.min(width, height / CARD_ASPECT) * 1.0;
  const depthGeometry = useMemo(() => {
    if (!ENABLE_DEPTH) return null;
    const width = Math.max(0.1, 1 - CARD_EDGE_INSET * 2);
    const height = Math.max(0.1, CARD_ASPECT - CARD_EDGE_INSET * 2);
    const radius = Math.max(
      0.001,
      Math.min(CARD_CORNER_RADIUS - CARD_EDGE_INSET, Math.min(width, height) * 0.5),
    );
    const shape = new Shape();
    const left = -width / 2;
    const right = width / 2;
    const top = height / 2;
    const bottom = -height / 2;
    shape.moveTo(left + radius, bottom);
    shape.lineTo(right - radius, bottom);
    shape.quadraticCurveTo(right, bottom, right, bottom + radius);
    shape.lineTo(right, top - radius);
    shape.quadraticCurveTo(right, top, right - radius, top);
    shape.lineTo(left + radius, top);
    shape.quadraticCurveTo(left, top, left, top - radius);
    shape.lineTo(left, bottom + radius);
    shape.quadraticCurveTo(left, bottom, left + radius, bottom);
    const geometry = new ExtrudeGeometry(shape, {
      depth: CARD_THICKNESS,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 8,
    });
    geometry.translate(0, 0, -CARD_THICKNESS / 2);
    return geometry;
  }, []);

  const depthMaterial = useMemo(() => {
    if (!useBlueprintEdge) {
      return {
        color: EDGE_COLOR,
        roughness: EDGE_ROUGHNESS,
        metalness: EDGE_METALNESS,
        clearcoat: EDGE_CLEARCOAT,
        clearcoatRoughness: 0.4,
      };
    }
    return {
      color: EDGE_BLUEPRINT_COLOR,
      emissive: EDGE_BLUEPRINT_EMISSIVE,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.05,
      clearcoat: 0.08,
      clearcoatRoughness: 0.6,
      transparent: true,
      opacity: EDGE_BLUEPRINT_OPACITY,
      depthWrite: false,
      depthTest: true,
    };
  }, [useBlueprintEdge]);
  const capMaterial = useMemo(
    () => ({
      visible: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    }),
    [],
  );

  const overlayMaterial = useMemo(
    () =>
      WEBGL_BLUEPRINT_OVERLAY_MODE === "sparkle"
        ? createSparkleOverlayMaterial({
            opacity: MAGIC_OVERLAY_OPACITY,
            aspect: CARD_ASPECT,
            radius: CARD_CORNER_RADIUS,
            color: { r: 0.2, g: 0.85, b: 1.0 },
            enableParallax: USE_WEBGL_SPARKLE_PARALLAX,
          })
        : createMagicOverlayMaterial({
            opacity: MAGIC_OVERLAY_OPACITY,
            aspect: CARD_ASPECT,
            radius: CARD_CORNER_RADIUS,
            color: { r: 0.15, g: 0.75, b: 1.0 },
          }),
    [],
  );

  useEffect(() => {
    overlayMaterial.uniforms.uOpacity.value = MAGIC_OVERLAY_OPACITY;
  }, [overlayMaterial]);

  useEffect(() => {
    const configureTexture = (texture: Texture, flipX: boolean) => {
      texture.colorSpace = SRGBColorSpace;
      texture.premultiplyAlpha = true;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      const repeatX = Math.abs(texture.repeat.x || 1) || 1;
      texture.repeat.set(flipX ? -repeatX : repeatX, texture.repeat.y || 1);
      texture.offset.set(flipX ? 1 : 0, texture.offset.y || 0);
      texture.generateMipmaps = true;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.magFilter = LinearFilter;
      texture.anisotropy = Math.min(gl.capabilities.getMaxAnisotropy?.() ?? 1, 8);
      texture.needsUpdate = true;
    };
    configureTexture(frontTexture, false);
    configureTexture(backTexture, true);
  }, [backTexture, frontTexture, gl]);

  const spinnerTexture = useLoader(TextureLoader, "/spinner-blueprint.svg");
  const spinnerRef = useRef<Mesh | null>(null);
  useEffect(() => {
    spinnerTexture.colorSpace = SRGBColorSpace;
    spinnerTexture.needsUpdate = true;
  }, [spinnerTexture]);

  useFrame(() => {
    const yawGroup = yawGroupRef.current;
    const pitchGroup = pitchGroupRef.current;
    if (!yawGroup || !pitchGroup) return;
    const smoothing =
      recenterBoostUntilRef.current > performance.now() ? RECENTER_SMOOTHING : ROTATION_SMOOTHING;
    pitchGroup.rotation.x += (targetRotationRef.current.x - pitchGroup.rotation.x) * smoothing;
    yawGroup.rotation.y += (targetRotationRef.current.y - yawGroup.rotation.y) * smoothing;
  });
  useFrame((_, delta) => {
    if (!showSpinner) return;
    if (spinnerRef.current) {
      spinnerRef.current.rotation.z += delta * SPINNER_ROTATION_SPEED;
    }
  });
  useFrame((state) => {
    if (!showMagicOverlay) return;
    overlayMaterial.uniforms.uTime.value = state.clock.getElapsedTime() * MAGIC_OVERLAY_SPEED;
    const yaw = yawGroupRef.current?.rotation.y ?? 0;
    const pitch = pitchGroupRef.current?.rotation.x ?? 0;
    if ("uYaw" in overlayMaterial.uniforms) {
      overlayMaterial.uniforms.uYaw.value = yaw;
    }
    if ("uPitch" in overlayMaterial.uniforms) {
      overlayMaterial.uniforms.uPitch.value = pitch;
    }
    if ("uLightDir" in overlayMaterial.uniforms) {
      const lightDir = overlayMaterial.uniforms.uLightDir.value;
      const spot = spotLightRef.current;
      const dir = directionalLightRef.current;
      if (spot) {
        spot.getWorldDirection(lightDir);
        overlayMaterial.uniforms.uLightIntensity.value = spot.intensity;
      } else if (dir) {
        dir.getWorldDirection(lightDir);
        overlayMaterial.uniforms.uLightIntensity.value = dir.intensity;
      } else {
        lightDir.set(0.4, 0.6, 1.0).normalize();
        overlayMaterial.uniforms.uLightIntensity.value = 0.8;
      }
      overlayMaterial.uniforms.uSpecPower.value = 24.0;
    }
  });

  return (
    <group ref={yawGroupRef}>
      <group ref={pitchGroupRef}>
        {depthGeometry ? (
          <group scale={[scale, scale, 1]}>
            <mesh geometry={depthGeometry} renderOrder={0}>
              <meshBasicMaterial {...capMaterial} />
              <meshPhysicalMaterial {...depthMaterial} />
            </mesh>
          </group>
        ) : null}
        <CardPlane
          texture={frontTexture}
          sheenPower={sheenPower}
          sheenIntensity={sheenIntensity}
          side={hasTwoSidedRender ? FrontSide : DoubleSide}
          depthSign={1}
          depthOffset={CARD_THICKNESS / 2 + 0.002}
        />
        <CardPlane
          texture={backTexture}
          sheenPower={sheenPower}
          sheenIntensity={sheenIntensity}
          side={BackSide}
          depthSign={-1}
          depthOffset={-(CARD_THICKNESS / 2 + 0.002)}
        />
        {showMagicOverlay ? (
          <group scale={[scale, scale, 1]}>
            <mesh position={[0, 0, -(CARD_THICKNESS / 2 + 0.0032)]} renderOrder={2}>
              <planeGeometry args={[1, CARD_ASPECT]} />
              <primitive object={overlayMaterial} attach="material" />
            </mesh>
          </group>
        ) : null}
        {showSpinner ? (
          <mesh ref={spinnerRef} position={[0, 0, CARD_THICKNESS / 2 + 0.006]} renderOrder={2}>
            <planeGeometry args={[SPINNER_SIZE, SPINNER_SIZE]} />
            <meshBasicMaterial map={spinnerTexture} transparent opacity={0.85} depthWrite={false} />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}

export default function WebglPreview({
  className,
  isVisible = true,
  frontTextureCanvas,
  frontTextureVersion = 0,
  backTextureCanvas,
  backTextureVersion = 0,
  fallbackTextureSrc,
  rotationResetToken = 0,
  recenterToken = 0,
}: WebglPreviewProps) {
  const rootClassName = className ? `${styles.root} ${className}` : styles.root;
  const { sheenAngle, sheenIntensity } = useWebglPreviewSettings();
  const { rotationMode } = usePreviewRenderer();
  const glintPower = Math.max(0.06, Math.min(0.45, 0.55 - sheenAngle * 0.35));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const yawGroupRef = useRef<Group | null>(null);
  const pitchGroupRef = useRef<Group | null>(null);
  const spotLightRef = useRef<SpotLight | null>(null);
  const directionalLightRef = useRef<DirectionalLight | null>(null);
  const fallbackTexture = useLoader(TextureLoader, fallbackTextureSrc ?? blueprintFallback.src);
  const fallbackFrontTexture = useMemo(() => fallbackTexture.clone(), [fallbackTexture]);
  const fallbackBackTexture = useMemo(() => fallbackTexture.clone(), [fallbackTexture]);
  const [isReadyForFrontCanvas, setIsReadyForFrontCanvas] = useState(false);
  const [hasFrontRenderedOnce, setHasFrontRenderedOnce] = useState(false);
  const [isReadyForBackCanvas, setIsReadyForBackCanvas] = useState(false);
  const [hasBackRenderedOnce, setHasBackRenderedOnce] = useState(false);
  const frontCanvasTexture = useMemo(() => {
    if (!frontTextureCanvas) return null;
    return new CanvasTexture(frontTextureCanvas);
  }, [frontTextureCanvas]);
  const backCanvasTexture = useMemo(() => {
    if (!backTextureCanvas) return null;
    return new CanvasTexture(backTextureCanvas);
  }, [backTextureCanvas]);
  useEffect(() => {
    if (frontCanvasTexture) {
      frontCanvasTexture.needsUpdate = true;
    }
  }, [frontCanvasTexture, frontTextureVersion]);
  useEffect(() => {
    if (backCanvasTexture) {
      backCanvasTexture.needsUpdate = true;
    }
  }, [backCanvasTexture, backTextureVersion]);
  useEffect(() => {
    if (!frontTextureCanvas) {
      setIsReadyForFrontCanvas(false);
      return;
    }
    if (hasFrontRenderedOnce) {
      setIsReadyForFrontCanvas(true);
      return;
    }
    setIsReadyForFrontCanvas(false);
    const timeoutId = window.setTimeout(() => {
      setIsReadyForFrontCanvas(true);
    }, BLUEPRINT_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [frontTextureCanvas, frontTextureVersion, hasFrontRenderedOnce]);
  useEffect(() => {
    if (!backTextureCanvas) {
      setIsReadyForBackCanvas(false);
      return;
    }
    if (hasBackRenderedOnce) {
      setIsReadyForBackCanvas(true);
      return;
    }
    setIsReadyForBackCanvas(false);
    const timeoutId = window.setTimeout(() => {
      setIsReadyForBackCanvas(true);
    }, BLUEPRINT_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [backTextureCanvas, backTextureVersion, hasBackRenderedOnce]);
  useEffect(() => {
    if (!hasFrontRenderedOnce && frontCanvasTexture && isReadyForFrontCanvas) {
      setHasFrontRenderedOnce(true);
    }
  }, [frontCanvasTexture, hasFrontRenderedOnce, isReadyForFrontCanvas]);
  useEffect(() => {
    if (!hasBackRenderedOnce && backCanvasTexture && isReadyForBackCanvas) {
      setHasBackRenderedOnce(true);
    }
  }, [backCanvasTexture, hasBackRenderedOnce, isReadyForBackCanvas]);
  const activeFrontTexture =
    frontCanvasTexture && isReadyForFrontCanvas ? frontCanvasTexture : fallbackFrontTexture;
  const activeBackTexture =
    backCanvasTexture && isReadyForBackCanvas ? backCanvasTexture : fallbackBackTexture;
  const hasTwoSidedRender = Boolean(backTextureCanvas);
  const useBlueprintEdge = !hasFrontRenderedOnce || !hasTwoSidedRender;
  const showSpinner = !hasFrontRenderedOnce;
  const showMagicOverlay = WEBGL_BLUEPRINT_OVERLAY_MODE !== "off" && useBlueprintEdge;
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
  const recenterBoostUntilRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const isPanMode = rotationMode === "pan";

  useEffect(() => {
    if (rotationMode === "pan") {
      if (yawGroupRef.current) {
        yawGroupRef.current.rotation.y = normalizeAngle(yawGroupRef.current.rotation.y);
      }
      targetRotationRef.current = { x: 0, y: 0 };
    }
  }, [rotationMode]);

  useEffect(() => {
    if (dragStateRef.current.active) {
      dragStateRef.current.active = false;
      setIsDragging(false);
    }
    targetRotationRef.current = { x: 0, y: 0 };
    if (yawGroupRef.current) {
      yawGroupRef.current.rotation.y = 0;
    }
    if (pitchGroupRef.current) {
      pitchGroupRef.current.rotation.x = 0;
    }
  }, [rotationResetToken]);

  useEffect(() => {
    targetRotationRef.current = { x: 0, y: 0 };
    recenterBoostUntilRef.current = performance.now() + RECENTER_DURATION_MS;
  }, [recenterToken]);

  const clampRotation = (value: number, maxDeg: number) => {
    const max = (maxDeg * Math.PI) / 180;
    return Math.max(-max, Math.min(max, value));
  };

  const normalizeAngle = (value: number) => {
    const twoPi = Math.PI * 2;
    return ((((value + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
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
    const yawRange = isPanMode ? maxY : Math.PI;
    const dx = (event.clientX - drag.startX) / Math.max(rect.width, 1);
    const dy = (event.clientY - drag.startY) / Math.max(rect.height, 1);
    const verticalSign = INVERT_VERTICAL_DRAG ? -1 : 1;
    const nextY = drag.startRotY + dx * yawRange * 2;
    const nextX = drag.startRotX + dy * maxX * 2 * verticalSign;
    if (isPanMode) {
      targetRotationRef.current = {
        x: clampRotation(applyResistance(nextX, MAX_ROTATION_X_DEG), MAX_ROTATION_X_DEG),
        y: clampRotation(applyResistance(nextY, MAX_ROTATION_Y_DEG), MAX_ROTATION_Y_DEG),
      };
      return;
    }
    targetRotationRef.current = {
      x: clampRotation(nextX, MAX_ROTATION_X_DEG),
      y: nextY,
    };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    containerRef.current.releasePointerCapture(event.pointerId);
    dragStateRef.current.active = false;
    setIsDragging(false);
    if (isPanMode) {
      targetRotationRef.current = { x: 0, y: 0 };
    }
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
        frameloop={isVisible ? "always" : "never"}
      >
        <ambientLight intensity={0.4} />
        <spotLight
          ref={spotLightRef}
          position={[2.5, 3.2, 4]}
          intensity={sheenIntensity * 2.4}
          angle={Math.max(0.2, sheenAngle * 0.65)}
          penumbra={0.25}
        />
        <directionalLight
          ref={directionalLightRef}
          position={[-2.5, -1.5, 3.5]}
          intensity={0.4}
        />
        <WebglScene
          frontTexture={activeFrontTexture}
          backTexture={activeBackTexture}
          yawGroupRef={yawGroupRef}
          pitchGroupRef={pitchGroupRef}
          targetRotationRef={targetRotationRef}
          recenterBoostUntilRef={recenterBoostUntilRef}
          sheenPower={glintPower}
          sheenIntensity={sheenIntensity}
          useBlueprintEdge={useBlueprintEdge}
          showSpinner={showSpinner}
          hasTwoSidedRender={hasTwoSidedRender}
          showMagicOverlay={showMagicOverlay}
          spotLightRef={spotLightRef}
          directionalLightRef={directionalLightRef}
        />
      </Canvas>
    </div>
  );
}
