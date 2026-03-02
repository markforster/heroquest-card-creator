import { addPngTextChunk } from "@/lib/png-metadata";
import { APP_VERSION } from "@/version";

const ONE_BY_ONE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9Fq6QAAAAASUVORK5CYII=";

const decodePng = () => new Uint8Array(Buffer.from(ONE_BY_ONE_PNG_BASE64, "base64"));

const readChunkType = (buffer: Uint8Array, offset: number) =>
  String.fromCharCode(
    buffer[offset],
    buffer[offset + 1],
    buffer[offset + 2],
    buffer[offset + 3],
  );

describe("addPngTextChunk", () => {
  it("adds a tEXt chunk before IEND with the keyword and value", async () => {
    const original = new Blob([decodePng()], { type: "image/png" });
    const updated = await addPngTextChunk(
      original,
      "Made using",
      `HeroQuest Card Creator ${APP_VERSION}`,
    );

    const buffer = new Uint8Array(await updated.arrayBuffer());
    const chunkTypes: string[] = [];
    const textChunks: Array<{ keyword: string; value: string }> = [];
    let offset = 8;
    while (offset + 8 <= buffer.length) {
      const length = new DataView(buffer.buffer, buffer.byteOffset + offset, 4).getUint32(0);
      const type = readChunkType(buffer, offset + 4);
      const dataOffset = offset + 8;
      const nextOffset = dataOffset + length + 4;
      chunkTypes.push(type);
      if (type === "tEXt") {
        const bytes = buffer.slice(dataOffset, dataOffset + length);
        const text = new TextDecoder().decode(bytes);
        const [keyword, value] = text.split("\0");
        textChunks.push({ keyword, value });
      }
      if (type === "IEND") break;
      offset = nextOffset;
    }

    const textIndex = chunkTypes.indexOf("tEXt");
    const endIndex = chunkTypes.indexOf("IEND");
    expect(textIndex).toBeGreaterThan(-1);
    expect(endIndex).toBeGreaterThan(-1);
    expect(textIndex).toBeLessThan(endIndex);

    expect(textChunks).toEqual([
      { keyword: "Made using", value: `HeroQuest Card Creator ${APP_VERSION}` },
    ]);
  });
});
