import { describe, expect, it } from "vitest";

import { parseSseBuffer, streamDistrictEvents } from "./sse.js";

function sseChunk(id: string, data: unknown): string {
  return `id: ${id}\nevent: district\ndata: ${JSON.stringify(data)}\n\n`;
}

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

describe("parseSseBuffer", () => {
  it("parses complete frames and keeps the incomplete remainder", () => {
    const { frames, rest } = parseSseBuffer(`${sseChunk("1:0", { a: 1 })}id: 1:1\ndata: {"b"`);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ id: "1:0", event: "district", data: '{"a":1}' });
    expect(rest).toBe('id: 1:1\ndata: {"b"');
  });
});

describe("streamDistrictEvents", () => {
  it("delivers events and reconnects with the last delivered event id", async () => {
    const requests: (string | null)[] = [];
    const received: string[] = [];
    let handleClose: () => void = () => {};

    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      requests.push(headers["last-event-id"] ?? null);
      if (requests.length === 1) {
        return streamResponse([
          sseChunk("1:0", { sequence: 1, eventSeq: 0, event: { eventType: "x" } }),
          sseChunk("1:1", { sequence: 1, eventSeq: 1, event: { eventType: "y" } }),
        ]);
      }
      // Second connection: deliver one more frame, then the test closes.
      return streamResponse([
        sseChunk("2:0", { sequence: 2, eventSeq: 0, event: { eventType: "z" } }),
      ]);
    }) as typeof fetch;

    await new Promise<void>((resolve) => {
      const handle = streamDistrictEvents({
        url: "http://test/api/events",
        token: "t",
        onEvent: (view) => {
          received.push(`${view.sequence}:${view.eventSeq}`);
          if (received.length === 3) {
            handle.close();
            resolve();
          }
        },
        reconnectDelayMs: 5,
        fetchImpl,
      });
      handleClose = handle.close;
    });
    handleClose();

    expect(received).toEqual(["1:0", "1:1", "2:0"]);
    expect(requests[0]).toBeNull(); // first connect: no resume header
    expect(requests[1]).toBe("1:1"); // reconnect resumes at the exact last id
  });
});
