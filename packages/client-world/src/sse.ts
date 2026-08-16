import type { CommittedEventView } from "./world.js";

/**
 * Fetch-based SSE client for the committed district event stream. Native
 * EventSource cannot send an Authorization header, so this reader speaks the
 * same wire format over fetch, tracks the last delivered event id, and
 * reconnects with Last-Event-ID so no event is skipped or duplicated
 * (server-side tuple cursor + client-side world cursor).
 */

export interface SseFrame {
  id: string | null;
  event: string | null;
  data: string;
}

/** Parses complete SSE frames out of `buffer`; returns frames and the remainder. */
export function parseSseBuffer(buffer: string): { frames: SseFrame[]; rest: string } {
  const frames: SseFrame[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    if (part.trim().length === 0) continue;
    const frame: SseFrame = { id: null, event: null, data: "" };
    for (const line of part.split("\n")) {
      if (line.startsWith("id: ")) frame.id = line.slice(4);
      else if (line.startsWith("event: ")) frame.event = line.slice(7);
      else if (line.startsWith("data: ")) frame.data += line.slice(6);
    }
    if (frame.data.length > 0) frames.push(frame);
  }
  return { frames, rest };
}

export type StreamStatus = "connecting" | "open" | "closed" | "error";

export interface StreamOptions {
  url: string;
  token: string;
  /** Resume after this event id ("sequence:eventSeq"); null starts from 0. */
  lastEventId?: string | null;
  onEvent: (view: CommittedEventView) => void;
  onStatus?: (status: StreamStatus) => void;
  reconnectDelayMs?: number;
  fetchImpl?: typeof fetch;
}

export interface StreamHandle {
  close: () => void;
}

export function streamDistrictEvents(options: StreamOptions): StreamHandle {
  // Bind explicitly: an unbound `fetch` reference throws "Illegal invocation"
  // in browsers because it loses its window receiver.
  const fetchImpl: typeof fetch =
    options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  const reconnectDelayMs = options.reconnectDelayMs ?? 2000;
  let lastEventId = options.lastEventId ?? null;
  let closed = false;
  const controller = { current: new AbortController() };

  const run = async () => {
    while (!closed) {
      options.onStatus?.("connecting");
      try {
        controller.current = new AbortController();
        const response = await fetchImpl(options.url, {
          headers: {
            authorization: `Bearer ${options.token}`,
            ...(lastEventId ? { "last-event-id": lastEventId } : {}),
          },
          signal: controller.current.signal,
        });
        if (!response.ok || !response.body) throw new Error(`stream failed: ${response.status}`);
        options.onStatus?.("open");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { frames, rest } = parseSseBuffer(buffer);
          buffer = rest;
          for (const frame of frames) {
            if (frame.id) lastEventId = frame.id;
            options.onEvent(JSON.parse(frame.data) as CommittedEventView);
          }
        }
      } catch {
        if (!closed) options.onStatus?.("error");
      }
      if (closed) break;
      await new Promise((resolve) => setTimeout(resolve, reconnectDelayMs));
    }
    options.onStatus?.("closed");
  };
  void run();

  return {
    close: () => {
      closed = true;
      controller.current.abort();
    },
  };
}
