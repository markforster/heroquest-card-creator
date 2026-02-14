import "@testing-library/jest-dom";

const originalEmitWarning = process.emitWarning.bind(process);
type EmitWarningParams = Parameters<typeof process.emitWarning>;
type EmitWarningRest = EmitWarningParams extends [unknown, unknown?, unknown?, ...infer Rest]
  ? Rest
  : [];
process.emitWarning = ((
  warning: EmitWarningParams[0],
  type?: EmitWarningParams[1],
  code?: EmitWarningParams[2],
  ...args: EmitWarningRest
) => {
  const message = typeof warning === "string" ? warning : warning?.message;
  if (
    type === "DeprecationWarning" &&
    (code === "DEP0040" || message?.includes("punycode"))
  ) {
    return;
  }
  return originalEmitWarning(warning as string, type as string, code as string, ...args);
}) as typeof process.emitWarning;
