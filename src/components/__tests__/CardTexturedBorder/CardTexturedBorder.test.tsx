import { render } from "@testing-library/react";

import CardTexturedBorder from "@/components/Cards/CardParts/CardTexturedBorder";

import type { StaticImageData } from "next/image";

function mockStaticImage(src: string): StaticImageData {
  return {
    src,
    width: 742,
    height: 1045,
  } as StaticImageData;
}

describe("CardTexturedBorder", () => {
  it("stretches border mask and texture to fill target bounds", () => {
    const alphaMask = mockStaticImage("/mask.png");
    const textureMask = mockStaticImage("/texture.png");

    const { container } = render(
      <svg>
        <CardTexturedBorder
          alphaMask={alphaMask}
          textureMask={textureMask}
          width={750}
          height={1050}
        />
      </svg>,
    );

    const borderMaskImage = container.querySelector('image[data-template-asset="border-mask"]');
    const borderTextureImage = container.querySelector(
      'feImage[data-template-asset="border-texture"]',
    );

    expect(borderMaskImage).toHaveAttribute("preserveAspectRatio", "none");
    expect(borderTextureImage).toHaveAttribute("preserveAspectRatio", "none");
  });
});
