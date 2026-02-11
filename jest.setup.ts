import "@testing-library/jest-dom";

const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning, type, code, ...args) => {
  const message = typeof warning === "string" ? warning : warning?.message;
  if (
    type === "DeprecationWarning" &&
    (code === "DEP0040" || message?.includes("punycode"))
  ) {
    return;
  }
  return originalEmitWarning(warning as string, type as string, code as string, ...args);
}) as typeof process.emitWarning;
