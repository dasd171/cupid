import { describe, expect, it } from "vitest";
import { parseChat } from "@/lib/analysis/parser";

describe("parseChat", () => {
  it("parses WhatsApp-style txt and attributes senders by name", () => {
    const text = [
      "[12/08/2026, 20:30] Alice: 今天吃饭了吗？",
      "[12/08/2026, 20:32] Bob: 还没有，你呢？",
      "[12/08/2026, 20:33] Alice: 我吃了",
    ].join("\n");
    const parsed = parseChat(text, { personA: "Alice", personB: "Bob" }, "chat.txt");
    expect(parsed.format).toBe("txt");
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.messages[0]?.sender).toBe("A");
    expect(parsed.messages[1]?.sender).toBe("B");
    expect(parsed.messages[0]?.timestamp).toBeDefined();
    expect(parsed.messages[0]?.content).toBe("今天吃饭了吗？");
  });

  it("parses simple 'Name: message' pasted text", () => {
    const text = "Alice: Hey\nBob: Hi there\nAlice: How are you?";
    const parsed = parseChat(text, { personA: "Alice", personB: "Bob" });
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.messages.map((m) => m.sender)).toEqual(["A", "B", "A"]);
  });

  it("marks unrecognized speakers as unknown", () => {
    const text = "Alice: hi\nStranger: hello\nBob: hey";
    const parsed = parseChat(text, { personA: "Alice", personB: "Bob" });
    expect(parsed.messages.map((m) => m.sender)).toEqual(["A", "unknown", "B"]);
  });

  it("parses JSON arrays with sender/content fields", () => {
    const text = JSON.stringify([
      { sender: "Alice", timestamp: "2026-08-10T20:30:00", content: "hi" },
      { name: "Bob", text: "hello" },
      { author: "Alice", message: "how are you?", time: "2026-08-10 20:31" },
    ]);
    const parsed = parseChat(text, { personA: "Alice", personB: "Bob" }, "export.json");
    expect(parsed.format).toBe("json");
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.messages.map((m) => m.sender)).toEqual(["A", "B", "A"]);
    expect(parsed.messages[0]?.timestamp).toBe("2026-08-10T20:30:00");
  });

  it("parses CSV with a header row", () => {
    const text = [
      "timestamp,sender,content",
      "2026-08-10 20:30,Alice,hello",
      "2026-08-10 20:31,Bob,\"hi, how are you?\"",
    ].join("\n");
    const parsed = parseChat(text, { personA: "Alice", personB: "Bob" }, "chat.csv");
    expect(parsed.format).toBe("csv");
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages[1]?.content).toBe("hi, how are you?");
    expect(parsed.messages.map((m) => m.sender)).toEqual(["A", "B"]);
  });

  it("parses Telegram-style HTML exports", () => {
    const html = `
      <div class="message default clearfix" id="message1">
        <div class="pull_right date details" title="10.08.2026 20:30:00">20:30</div>
        <div class="from_name">Alice</div>
        <div class="text">hey there</div>
      </div>
      <div class="message default clearfix" id="message2">
        <div class="pull_right date details" title="10.08.2026 20:31:00">20:31</div>
        <div class="from_name">Bob</div>
        <div class="text">hi!</div>
      </div>`;
    const parsed = parseChat(html, { personA: "Alice", personB: "Bob" }, "chat.html");
    expect(parsed.format).toBe("html");
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages.map((m) => m.sender)).toEqual(["A", "B"]);
    expect(parsed.messages[0]?.content).toBe("hey there");
  });

  it("joins continuation lines onto the previous message", () => {
    const text = "Alice: first line\nsecond line\nBob: reply";
    const parsed = parseChat(text, { personA: "Alice", personB: "Bob" });
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages[0]?.content).toBe("first line\nsecond line");
  });

  it("returns warnings instead of throwing for empty input", () => {
    const parsed = parseChat("   ", { personA: "A", personB: "B" });
    expect(parsed.messages).toHaveLength(0);
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });
});
