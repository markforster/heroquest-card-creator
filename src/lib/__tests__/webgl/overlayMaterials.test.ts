import { ShaderMaterial, Vector3 } from "three";

import { createMagicOverlayMaterial } from "@/lib/webgl/magicOverlayShader";
import { createSparkleOverlayMaterial } from "@/lib/webgl/sparkleOverlayShader";

describe("WebGL overlay material factories", () => {
  it("creates a magic material with configured uniforms", () => {
    const material = createMagicOverlayMaterial({
      opacity: 0.5,
      aspect: 1.4,
      radius: 0.1,
      color: { r: 1, g: 0.5, b: 0.25 },
    });

    expect(material).toBeInstanceOf(ShaderMaterial);
    expect(material.uniforms.uOpacity.value).toBe(0.5);
    expect(material.uniforms.uColor.value).toEqual(new Vector3(1, 0.5, 0.25));
  });

  it("creates sparkle materials with optional parallax state", () => {
    const material = createSparkleOverlayMaterial({
      opacity: 0.8,
      aspect: 1.4,
      radius: 0.1,
      color: { r: 0.2, g: 0.4, b: 0.6 },
      enableParallax: false,
    });

    expect(material).toBeInstanceOf(ShaderMaterial);
    expect(material.uniforms.uParallaxEnabled.value).toBe(0);
    expect(material.uniforms.uLightDir.value).toBeInstanceOf(Vector3);
  });
});
