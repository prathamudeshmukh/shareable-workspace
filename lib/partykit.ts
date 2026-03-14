import type { SSEEvent } from "@/types/workspace";

export async function broadcastToWorkspace(
  partykitHost: string,
  workspaceId: string,
  event: SSEEvent,
  secret?: string
): Promise<void> {
  const url = `https://${partykitHost}/parties/workspace/${workspaceId}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    headers["x-partykit-secret"] = secret;
  }

  // Fire-and-forget — broadcast failures should not block the upload response
  try {
    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
  } catch {
    // Log but do not propagate — real-time is best-effort
    console.warn(`[partykit] broadcast failed for workspace ${workspaceId}`);
  }
}
