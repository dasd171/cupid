/** Canonical internal representation of a chat message. */
export type ChatSender = "A" | "B" | "unknown";

export interface ChatMessage {
  sender: ChatSender;
  /** ISO-8601 timestamp when the export provided one. */
  timestamp?: string;
  content: string;
}

export interface ParsedChat {
  messages: ChatMessage[];
  /** Format that was detected during parsing. */
  format: "json" | "csv" | "html" | "txt";
  /** Non-fatal notes, e.g. lines that could not be attributed. */
  warnings: string[];
}

export interface ChatFileConstraints {
  maxBytes: number;
  allowedMimeTypes: readonly string[];
}
