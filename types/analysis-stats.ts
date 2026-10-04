/** Deterministic, rule-computed statistics about a parsed conversation. */
export interface ConversationStats {
  totalMessages: number;
  countA: number;
  countB: number;
  countUnknown: number;
  /** Share of attributed messages, 0..1 */
  shareA: number;
  shareB: number;
  avgLengthA: number;
  avgLengthB: number;
  /** Share of messages containing a question mark, 0..1 */
  questionRatioA: number;
  questionRatioB: number;
  /** Share of conversation initiations (gap > 6h starts a new thread), 0..1 */
  initiationRatioA: number;
  initiationRatioB: number;
  /** Median reply latency in ms between the two people, null if unknowable. */
  medianReplyMs: number | null;
  /** Number of distinct calendar days with messages. */
  activeDays: number;
  /** Total characters across all messages (for context sizing). */
  totalChars: number;
}
