import type { PropsWithChildren, SVGProps } from "react";

type LayerProps = PropsWithChildren<SVGProps<SVGGElement>>;

export default function Layer({ children, ...rest }: LayerProps) {
  return <g {...rest}>{children}</g>;
}

