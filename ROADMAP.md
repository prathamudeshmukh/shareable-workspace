# Dropzone — Product Roadmap

> Last updated: 2026-03-18

---

## Current State

Dropzone is a focused, ephemeral file-sharing tool. It does one thing well: create → upload → share → auto-expire. The core loop is solid. The gaps are around **trust** (users don't know if files arrived safely), **control** (no options beyond defaults), **reach** (mobile UX, accessibility), and **monetization** (no upgrade path).

---

## Tier 1 — Quick Wins (High Impact, Low Effort)

### 1. Configurable TTL at workspace creation
Users get a hardcoded 10-minute expiry today. Power users sharing large files over slow connections get burned.

- Let users choose: 10 min / 1 hr / 24 hr / 7 days at creation
- Add `ttl` param to `POST /api/workspace` and `ttl_ms` column to `workspaces` table
- Longer TTLs can be gated behind a Pro flag later
- **Impact:** reduces "my link expired before they could download" abandonment

### 2. Local upload history (session memory)
Users close the tab and lose their workspace forever. Store recent workspace IDs in `localStorage` with timestamps.

- Pure frontend — zero backend changes
- "Recent workspaces" panel on the home page
- Auto-clean expired entries client-side
- **Impact:** major DX improvement, pure retention play, zero cost

### 3. Paste-to-upload
`Ctrl+V` anywhere in the workspace should upload clipboard contents — screenshots, copied text as `.txt`, etc.

- Browser `paste` event handler on the workspace page
- Handle `image/png` blobs and plain text
- **Impact:** huge for developers and designers sharing screenshots

### 4. Download all as ZIP
"Download everything" is the #1 recipient friction point. Downloading 10 files one-by-one is painful.

- Server-side streaming ZIP using `fflate` or Cloudflare Workers' native streams
- Single `GET /api/workspace/[id]/download` endpoint
- **Impact:** dramatically improves recipient experience

---

## Tier 2 — Medium Effort, High Strategic Value

### 5. Workspace password protection
Any guessable 7-char ID is currently public. Add optional password protection at creation.

- Store `password_hash` in `workspaces` table
- Gate `GET /api/workspace/[id]` behind a 401 when password not provided
- Simple PIN-entry modal on the workspace page
- **Impact:** unblocks enterprise and sensitive use cases

### 6. Upload from URL
Let users paste a URL and have Dropzone fetch and store the remote file.

- `POST /api/workspace/[id]/fetch` with a `url` body param
- Validate URL, stream directly into R2
- Respect max file size limits
- **Impact:** expands use cases, differentiates from simple upload tools

### 7. Workspace templates
Pre-configured workspace types reduce setup friction for common scenarios.

- Examples: *Design Review* (image-only, 24hr TTL), *Quick Share* (defaults), *Secure Drop* (password + 1hr TTL)
- Templates map to a `CreateWorkspaceOptions` payload, selectable on the home page
- **Impact:** reduces cognitive load, improves conversion

### 8. Named workspaces / vanity slugs
`/ws/xk72bqp` is not memorable or trustworthy. Let users set a slug like `/ws/team-standup`.

- Slug uniqueness enforced in D1 with a unique index
- **Impact:** improves shareability, makes links memorable

### 9. File viewer improvements
Current previewer is minimal. Expand support for:

- Audio playback (MP3, WAV, OGG) — currently no audio preview
- Markdown rendering (`.md` → formatted HTML)
- Syntax highlighting for code files (`.ts`, `.py`, `.json`, etc.)
- ZIP file contents listing without download

---

## Tier 3 — Higher Effort, Long-Term Differentiation

### 10. Read receipts / download log
Senders want to know if their file was actually downloaded.

- New `events(workspace_id, file_id, event_type, client_ip_hash, timestamp)` table
- Log on `GET /api/files/[...path]`
- Activity feed shown in workspace view
- Hashed IP (not raw) for privacy
- **Impact:** high value for "did they get it?" anxiety, enables Pro tier

### 11. User accounts (optional, progressive)
Add optional sign-in (GitHub/Google OAuth) for power users.

- Persistent workspace ownership and cross-device access
- Dashboard of all owned workspaces
- Gate for Pro features: longer TTLs, larger files, more files
- **Impact:** retention, monetization foundation

### 12. API access + developer mode
Issue API keys to signed-in users for programmatic file sharing.

- `Authorization: Bearer <key>` support on upload endpoint
- `GET /api/developer/workspaces` for owned workspace list
- SDK snippet shown in workspace settings
- **Impact:** developer adoption, PLG flywheel, CI/CD integrations

### 13. Team workspaces
Share edit access with multiple collaborators.

- Two link types per workspace: `editor_token` (can upload) and `viewer_token` (download only)
- Role enforcement on upload endpoint
- **Impact:** enables collaborative workflows, strong B2B signal

### 14. Webhook notifications
POST to a user-configured URL when files are uploaded or expire.

- `webhooks(workspace_id, url, events[])` table
- Fired async from cron worker and upload handler
- **Impact:** integrates Dropzone into automation workflows (Zapier, n8n, etc.)

---

## Tier 4 — Speculative / Exploratory

### 15. Client-side E2E encryption
Encrypt files in the browser before upload using the Web Crypto API. Decryption key lives in the URL fragment (`#key=...`) — never sent to the server.

- Zero-knowledge architecture: Cloudflare never sees plaintext
- **Tradeoff:** breaks server-side preview, adds significant complexity

### 16. PWA + mobile share target
Add a Web App Manifest and service worker for installable mobile experience.

- Register as a share destination on iOS/Android share sheet
- Captures the "move a file from phone to laptop" use case

### 17. Workspace analytics dashboard
Aggregate, anonymized usage stats: total files shared, bytes transferred, peak usage times.

---

## Prioritization Matrix

| # | Feature | Effort | Impact | Priority |
|---|---------|--------|--------|----------|
| 2 | Local upload history | S | High | **P0** |
| 3 | Paste-to-upload | S | High | **P0** |
| 1 | Configurable TTL | S | High | **P0** |
| 4 | Download all as ZIP | M | High | **P1** |
| 5 | Password protection | M | High | **P1** |
| 9 | Better file previews | M | Med | **P1** |
| 6 | Upload from URL | M | Med | **P2** |
| 7 | Workspace templates | S | Med | **P2** |
| 8 | Vanity slugs | M | Med | **P2** |
| 10 | Read receipts | M | High | **P2** |
| 11 | User accounts | L | High | **P3** |
| 12 | API access | L | High | **P3** |
| 13 | Team workspaces | L | High | **P3** |
| 14 | Webhooks | M | Med | **P3** |
| 15 | E2E encryption | L | Med | **P4** |
| 16 | PWA / mobile | M | Med | **P4** |
| 17 | Analytics dashboard | M | Low | **P4** |

---

## Top 3 Bets

If shipping in the next sprint, these three deliver the most value with the least risk:

1. **Local upload history** — zero backend cost, immediately makes repeat users feel at home
2. **Configurable TTL** — the single most common reason ephemeral tools fail users; unblocks use cases without architecture changes
3. **Download all as ZIP** — the recipient experience is currently painful; this makes Dropzone feel complete
