import type * as Party from "partykit/server";

// Each workspace maps to one room (identified by workspace ID).
// This server receives HTTP POSTs from the Next.js upload route and
// cron cleanup worker, then broadcasts the payload to all connected
// WebSocket clients watching that workspace.
export default class WorkspaceParty implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Called when a client opens a WebSocket connection.
  // No special handling needed — PartyKit manages the connection lifecycle.
  onConnect(_conn: Party.Connection): void {}

  // Called when the server receives an HTTP request (not a WebSocket).
  // Used exclusively by server-side routes to broadcast events.
  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const authHeader = req.headers.get("x-partykit-secret");
    const expectedSecret = (this.room as Party.Room & { env?: Record<string, string> }).env?.PARTYKIT_SECRET;

    // Only enforce the secret check in production (when env var is set)
    if (expectedSecret && authHeader !== expectedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.text();
    this.room.broadcast(body);

    return new Response("ok", { status: 200 });
  }
}
