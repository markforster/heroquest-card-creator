import { formatMessage } from "@/components/Stockpile/stockpile-utils";

export default function formatMessageWith(
  t: (key: string) => string,
  key: string,
  vars: Record<string, string | number>,
) {
  return formatMessage(t(key as never), vars);
}
