export type ResearchStreamEvent =
  | { type: "ready"; userMessageId: string; title?: string; usage: { used: number; limit: number } }
  | { type: "delta"; delta: string }
  | { type: "complete"; assistantMessageId: string; createdAt: string }
  | { type: "error"; code: string; message: string }
  | { type: "aborted" };

export function encodeSse(event: ResearchStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function parseSseBuffer(buffer: string) {
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";
  const events: ResearchStreamEvent[] = [];
  for (const part of parts) {
    const data = part.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
    if (!data) continue;
    events.push(JSON.parse(data) as ResearchStreamEvent);
  }
  return { events, remainder };
}
