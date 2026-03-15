import { formatMessage } from "@/components/Stockpile/stockpile-utils";

export default function formatMessageWith<K extends string>(
  t: (key: K) => string,
  key: K,
  vars: Record<string, string | number>,
) {
  return formatMessage(t(key), vars);
}
