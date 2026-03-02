"use client";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readChunkType(buffer: Uint8Array, offset: number): string {
  return String.fromCharCode(
    buffer[offset],
    buffer[offset + 1],
    buffer[offset + 2],
    buffer[offset + 3],
  );
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const length = data.length;
  const chunk = new Uint8Array(8 + length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const crc = crc32(new Uint8Array([...typeBytes, ...data]));
  view.setUint32(8 + length, crc);
  return chunk;
}

export async function addPngTextChunk(
  blob: Blob,
  keyword: string,
  text: string,
): Promise<Blob> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  if (buffer.length < PNG_SIGNATURE.length) return blob;
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (buffer[i] !== PNG_SIGNATURE[i]) return blob;
  }

  const safeKeyword = keyword.replace(/\0/g, "");
  const safeText = text.replace(/\0/g, "");
  const textData = new TextEncoder().encode(`${safeKeyword}\0${safeText}`);
  const textChunk = makeChunk("tEXt", textData);

  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= buffer.length) {
    const length = new DataView(buffer.buffer, buffer.byteOffset + offset, 4).getUint32(0);
    const typeOffset = offset + 4;
    const type = readChunkType(buffer, typeOffset);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + length + 4;
    if (type === "IEND") {
      const before = buffer.slice(0, offset);
      const after = buffer.slice(offset);
      const combined = new Uint8Array(before.length + textChunk.length + after.length);
      combined.set(before, 0);
      combined.set(textChunk, before.length);
      combined.set(after, before.length + textChunk.length);
      return new Blob([combined], { type: blob.type || "image/png" });
    }
    if (nextOffset > buffer.length) break;
    offset = nextOffset;
  }

  return blob;
}
