import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";
import { TransformStream } from "node:stream/web";

if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
}

if (!(globalThis as { structuredClone?: typeof structuredClone }).structuredClone) {
  (globalThis as { structuredClone?: typeof structuredClone }).structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
}

if (!(globalThis as { TransformStream?: unknown }).TransformStream) {
  (globalThis as { TransformStream?: unknown }).TransformStream = TransformStream as unknown;
}

const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const [typeOrOptions, maybeCode] = args;
  const message = typeof warning === "string" ? warning : warning?.message;
  const type =
    typeof typeOrOptions === "string"
      ? typeOrOptions
      : typeOrOptions &&
          typeof typeOrOptions === "object" &&
          "type" in typeOrOptions &&
          typeof typeOrOptions.type === "string"
        ? typeOrOptions.type
        : undefined;
  const code =
    typeOrOptions &&
    typeof typeOrOptions === "object" &&
    "code" in typeOrOptions &&
    typeof typeOrOptions.code === "string"
      ? typeOrOptions.code
      : typeof maybeCode === "string"
        ? maybeCode
        : undefined;
  if (type === "DeprecationWarning" && (code === "DEP0040" || message?.includes("punycode"))) {
    return;
  }
  return Reflect.apply(originalEmitWarning as (...callArgs: unknown[]) => unknown, process, [
    warning,
    ...args,
  ]);
}) as typeof process.emitWarning;
