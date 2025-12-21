import * as React from "react";

export default function SvgMock(props: React.SVGProps<SVGSVGElement>) {
  // Minimal svg stub for component imports
  return <svg data-testid="svg-mock" {...props} />;
}

export const ReactComponent = SvgMock;
