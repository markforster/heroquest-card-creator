import { AdditiveBlending, BackSide, ShaderMaterial, Vector3 } from "three";

import type { ShaderMaterialParameters } from "three";

type MagicOverlayOptions = {
  opacity: number;
  aspect: number;
  radius: number;
  color: { r: number; g: number; b: number };
};

export function createMagicOverlayMaterial({
  opacity,
  aspect,
  radius,
  color,
}: MagicOverlayOptions): ShaderMaterial {
  const params: ShaderMaterialParameters = {
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: BackSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uAspect: { value: aspect },
      uRadius: { value: radius },
      uColor: { value: new Vector3(color.r, color.g, color.b) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uAspect;
      uniform float uRadius;
      uniform vec3 uColor;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float hash3(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amp = 0.6;
        for (int i = 0; i < 3; i++) {
          value += amp * noise(p);
          p *= 2.0;
          amp *= 0.55;
        }
        return value;
      }

      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        float a = hash3(i);
        float b = hash3(i + vec3(1.0, 0.0, 0.0));
        float c = hash3(i + vec3(0.0, 1.0, 0.0));
        float d = hash3(i + vec3(1.0, 1.0, 0.0));
        float e = hash3(i + vec3(0.0, 0.0, 1.0));
        float f1 = hash3(i + vec3(1.0, 0.0, 1.0));
        float g = hash3(i + vec3(0.0, 1.0, 1.0));
        float h = hash3(i + vec3(1.0, 1.0, 1.0));
        vec3 u = f * f * (3.0 - 2.0 * f);
        float x1 = mix(a, b, u.x);
        float x2 = mix(c, d, u.x);
        float x3 = mix(e, f1, u.x);
        float x4 = mix(g, h, u.x);
        float y1 = mix(x1, x2, u.y);
        float y2 = mix(x3, x4, u.y);
        return mix(y1, y2, u.z);
      }

      float fbm3(vec3 p) {
        float value = 0.0;
        float amp = 0.6;
        for (int i = 0; i < 3; i++) {
          value += amp * noise3(p);
          p *= 2.0;
          amp *= 0.55;
        }
        return value;
      }

      float roundedRectMask(vec2 uv, float radius, float aspect) {
        vec2 p = uv * 2.0 - 1.0;
        p.y *= aspect;
        vec2 b = vec2(1.0 - radius * 2.0, aspect - radius * 2.0);
        vec2 q = abs(p) - b;
        float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
        return smoothstep(0.01, -0.01, dist);
      }

      void main() {
        float mask = roundedRectMask(vUv, uRadius, uAspect);
        if (mask <= 0.0) discard;
        vec2 uv = vUv * vec2(2.4, 3.2);
        float n = fbm3(vec3(uv, uTime * 0.18));
        float wisps = smoothstep(0.35, 0.9, n);
        float alpha = wisps * uOpacity * mask;
        gl_FragColor = vec4(uColor * 1.8, alpha);
      }
    `,
  };

  return new ShaderMaterial(params);
}
