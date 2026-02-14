import { AdditiveBlending, BackSide, ShaderMaterial, Vector3 } from "three";

import type { ShaderMaterialParameters } from "three";

type SparkleOverlayOptions = {
  opacity: number;
  aspect: number;
  radius: number;
  color: { r: number; g: number; b: number };
  enableParallax?: boolean;
};

export function createSparkleOverlayMaterial({
  opacity,
  aspect,
  radius,
  color,
  enableParallax = true,
}: SparkleOverlayOptions): ShaderMaterial {
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
      uDensity: { value: 32.0 },
      uSize: { value: 0.08 },
      uTwinkle: { value: 1.4 },
      uYaw: { value: 0.0 },
      uPitch: { value: 0.0 },
      uParallaxEnabled: { value: enableParallax ? 1.0 : 0.0 },
      uLightDir: { value: new Vector3(0.4, 0.6, 1.0).normalize() },
      uLightIntensity: { value: 0.8 },
      uSpecPower: { value: 24.0 },
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
      uniform float uDensity;
      uniform float uSize;
      uniform float uTwinkle;
      uniform float uYaw;
      uniform float uPitch;
      uniform float uParallaxEnabled;
      uniform vec3 uLightDir;
      uniform float uLightIntensity;
      uniform float uSpecPower;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      vec2 rand2(vec2 p) {
        return vec2(hash(p), hash(p + 17.13));
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

        float yawSin = sin(uYaw);
        float pitchSin = sin(uPitch);
        float scale = 1.0 + abs(yawSin) * 1.6 + abs(pitchSin) * 1.2;
        vec2 parallax = vec2(-yawSin, -pitchSin) * 0.16 * scale * uParallaxEnabled;
        vec2 uv = (vUv + parallax) * uDensity;
        vec2 cell = floor(uv);
        vec2 f = fract(uv);
        float sparkle = 0.0;

        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 p = cell + offset;
            vec2 r = rand2(p);
            vec2 center = r;
            float d = length((f - center) + offset);
            float size = uSize * (0.6 + r.x * 0.8);
            float twinkleSpeed = mix(0.35, 1.5, r.x);
            float twinkle = 0.6 + 0.4 * sin(uTime * uTwinkle * twinkleSpeed + r.y * 6.283);
            float glow = smoothstep(size, 0.0, d) * twinkle;
            sparkle = max(sparkle, glow);
          }
        }

        float glow = pow(sparkle, 0.6);
        vec3 normal = vec3(0.0, 0.0, 1.0);
        float ndl = clamp(dot(normal, normalize(uLightDir)), 0.0, 1.0);
        float spec = pow(ndl, uSpecPower) * uLightIntensity;
        float lightBoost = 0.4 + 0.6 * ndl + spec * 3.2;
        float alpha = glow * uOpacity * mask;
        gl_FragColor = vec4(uColor * 3.2 * lightBoost, alpha);
      }
    `,
  };

  return new ShaderMaterial(params);
}
