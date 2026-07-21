import { getAuthContext } from "@/lib/auth-guard";
import { getChangedLiveEntities, getCompanyLiveVersions } from "@/lib/liveVersions";
import type { LiveVersions } from "@/lib/liveEntities";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SSE_POLL_MS = 15_000;
const SSE_HEARTBEAT_MS = 20_000;

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return new Response("Não autenticado", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let lastVersions: LiveVersions | null = null;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const poll = async () => {
        if (closed) return;
        try {
          const versions = await getCompanyLiveVersions(auth.companyId, auth.userId);

          if (!lastVersions) {
            lastVersions = versions;
            send({ type: "versions", versions, changed: [] });
            return;
          }

          const changed = getChangedLiveEntities(lastVersions, versions);
          if (changed.length > 0) {
            lastVersions = versions;
            send({ type: "versions", versions, changed });
          }
        } catch (error) {
          console.warn("Falha no SSE live sync:", error);
          send({ type: "error", message: "sync_failed" });
        }
      };

      send({ type: "connected" });
      await poll();

      pollTimer = setInterval(() => {
        void poll();
      }, SSE_POLL_MS);

      heartbeatTimer = setInterval(() => {
        send({ type: "heartbeat", at: Date.now() });
      }, SSE_HEARTBEAT_MS);
    },
    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  request.signal.addEventListener("abort", () => {
    closed = true;
    if (pollTimer) clearInterval(pollTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
