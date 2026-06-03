import type { MessageKey } from "@/i18n/messages";

export type TFunction = (key: MessageKey, options?: Record<string, unknown>) => string;
