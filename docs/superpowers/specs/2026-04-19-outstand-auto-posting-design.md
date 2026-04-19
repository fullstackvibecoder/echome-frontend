# Outstand Auto-Posting Integration — Design Spec

**Goal:** Enable EchoMe users to connect their social media accounts and schedule automatic posts — all within the EchoMe platform, no third-party UI. Powered by Outstand's unified API behind the scenes.

**Scope:** Backend integration with Outstand API, frontend "Connect Accounts" UI, scheduled posting from content kit detail page, calendar page showing scheduled/posted content.

---

## How It Works (User Perspective)

1. **Connect accounts (one-time):** User goes to Settings → Connected Accounts. Clicks "Connect Instagram." OAuth popup shows Instagram's login. User authorizes. Popup closes. Account connected.

2. **Schedule a post:** User opens a content kit → sees their LinkedIn post → clicks "Schedule" → picks date/time + platform → confirms. Done.

3. **Post goes live:** At the scheduled time, EchoMe's backend calls Outstand API → post publishes to the user's account. User sees "Posted ✓" in their calendar.

4. **Calendar view:** Shows all scheduled and posted content on a timeline. Each item shows platform, status (scheduled/posted/failed), and the content preview.

No Outstand branding anywhere. No offsite redirects. Everything is EchoMe.

---

## Outstand API Overview

**Base URL:** `https://api.outstand.so/v1`
**Auth:** Bearer token via `Authorization: Bearer {API_KEY}`
**Pricing:** $5/mo base + $0.01/post over 1,000
**Managed Keys:** Outstand handles all platform OAuth approvals

### Key Endpoints We'll Use

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/social-networks/auth-url` | POST | Get OAuth URL for user to connect a platform |
| `/social-accounts` | GET | List user's connected social accounts |
| `/social-accounts/{id}` | DELETE | Disconnect an account |
| `/media/upload-url` | POST | Get presigned URL for media upload |
| `/media/confirm` | POST | Confirm media upload complete |
| `/posts` | POST | Create/schedule a post |
| `/posts` | GET | List posts (with status filtering) |
| `/posts/{id}` | GET | Get post details + status |
| `/posts/{id}` | DELETE | Cancel a scheduled post |
| `/posts/{id}/analytics` | GET | Get engagement metrics |

### Supported Platforms
Instagram, LinkedIn, X (Twitter), TikTok, YouTube, Facebook, Threads, Bluesky, Pinterest, Google Business

---

## Backend Integration

### 1. Outstand Service

**New file:** `src/services/social-posting/outstand-service.ts`

A service class that wraps the Outstand API:

```typescript
class OutstandService {
  // Account management
  getAuthUrl(platform: string, userId: string): Promise<string>
  listConnectedAccounts(userId: string): Promise<SocialAccount[]>
  disconnectAccount(accountId: string): Promise<void>

  // Posting
  createPost(params: {
    socialAccountIds: string[];
    text: string;
    mediaUrls?: string[];
    scheduledAt?: string; // ISO 8601
  }): Promise<Post>
  
  cancelPost(postId: string): Promise<void>
  getPostStatus(postId: string): Promise<PostStatus>
  listPosts(filters: { status?: string; limit?: number }): Promise<Post[]>

  // Media
  uploadMedia(fileUrl: string): Promise<string> // returns media ID
}
```

**User-to-Outstand mapping:** Each EchoMe user's connected social accounts are stored in a new `user_social_accounts` table that maps `user_id` → `outstand_social_account_id` + `platform` + `platform_username`.

### 2. New Database Table

```sql
CREATE TABLE user_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outstand_account_id TEXT NOT NULL, -- Outstand's social account ID
  platform TEXT NOT NULL, -- 'instagram', 'linkedin', 'twitter', etc.
  platform_username TEXT, -- '@handle' or display name
  platform_avatar_url TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_social_user ON user_social_accounts(user_id);
ALTER TABLE user_social_accounts DISABLE ROW LEVEL SECURITY;
```

### 3. New API Routes

**New file:** `src/routes/social-posting.ts`

| Route | Method | Purpose |
|-------|--------|---------|
| `/social-posting/auth-url` | POST | Get OAuth URL for a platform. Body: `{ platform }`. Returns `{ url }`. |
| `/social-posting/callback` | GET | OAuth callback — Outstand redirects here after user authorizes. Saves account to DB. |
| `/social-posting/accounts` | GET | List user's connected accounts |
| `/social-posting/accounts/:id` | DELETE | Disconnect an account |
| `/social-posting/schedule` | POST | Schedule a post. Body: `{ contentKitId, platform, text, mediaUrls?, scheduledAt }` |
| `/social-posting/posts` | GET | List scheduled/posted items for the user |
| `/social-posting/posts/:id` | DELETE | Cancel a scheduled post |

### 4. Scheduling Flow

When a user schedules a post:

1. Frontend sends `POST /social-posting/schedule` with content + platform + time
2. Backend looks up user's connected account for that platform
3. If content has images/video, uploads media via Outstand's media endpoints
4. Calls `POST /posts` with `scheduledAt` parameter
5. Saves a record to `scheduled_posts` table (tracks Outstand post ID + EchoMe content kit ID)
6. At scheduled time, Outstand publishes automatically
7. Webhooks notify our backend of success/failure → updates `scheduled_posts` status

### 5. Scheduled Posts Table

```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_kit_id UUID REFERENCES content_kits(id),
  outstand_post_id TEXT, -- Outstand's post ID
  platform TEXT NOT NULL,
  text TEXT NOT NULL,
  media_urls TEXT[], -- Array of media URLs
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, posted, failed, cancelled
  posted_at TIMESTAMPTZ,
  error_message TEXT,
  analytics JSONB, -- engagement metrics after posting
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
ALTER TABLE scheduled_posts DISABLE ROW LEVEL SECURITY;
```

### 6. Webhook Handler

Outstand sends webhooks when post status changes. 

**Route:** `POST /webhooks/outstand`

Handles: `post.published`, `post.failed` events. Updates `scheduled_posts` status accordingly.

---

## Frontend Integration

### 1. Connected Accounts (Settings Page)

**New section in Settings:** "Connected Accounts"

Shows list of connected platforms with:
- Platform icon + name + username
- "Connected" badge
- "Disconnect" button

"Connect" buttons for unconnected platforms. Each opens OAuth popup → callback → refreshes list.

### 2. Schedule from Content Kit

On the content kit detail page, each platform post (LinkedIn, Instagram, etc.) gets a "Schedule" button next to "Copy."

**Schedule flow:**
1. User clicks "Schedule" on a platform post
2. Inline date/time picker appears (or small modal)
3. User picks when → clicks "Schedule"
4. Backend creates the scheduled post via Outstand
5. Toast: "Scheduled for [date] on [platform]"

If the user hasn't connected that platform: show "Connect [Platform] to schedule" with a connect button inline.

### 3. Calendar Page Redesign

Replace the current calendar page with a timeline/list of scheduled and posted content.

**Layout:**
```
┌─ Calendar
│  "Your content schedule — see what's coming up and what's been posted"
│
├─ Upcoming (expanded)
│  [date] [platform icon] [content preview] [status: Scheduled] [Cancel]
│  [date] [platform icon] [content preview] [status: Scheduled] [Cancel]
│
├─ Posted (collapsed)
│  [date] [platform icon] [content preview] [status: Posted ✓] [analytics]
│
└─ Connect accounts prompt (if none connected)
│  "Connect your social accounts to start scheduling"
│  [Connect Instagram] [Connect LinkedIn] [Connect X]
```

### 4. API Client Methods

```typescript
api.socialPosting = {
  getAuthUrl: (platform: string) => POST /social-posting/auth-url
  listAccounts: () => GET /social-posting/accounts
  disconnectAccount: (id: string) => DELETE /social-posting/accounts/:id
  schedule: (data: { contentKitId, platform, text, mediaUrls?, scheduledAt }) => POST /social-posting/schedule
  listPosts: (filters?) => GET /social-posting/posts
  cancelPost: (id: string) => DELETE /social-posting/posts/:id
}
```

---

## Environment Variables

```bash
OUTSTAND_API_KEY=out_...        # From Outstand dashboard
OUTSTAND_WEBHOOK_SECRET=whsec_... # For webhook verification
OUTSTAND_CALLBACK_URL=https://api.tryechome.com/social-posting/callback
```

---

## Implementation Order

1. **Backend: Outstand service + DB tables** — service wrapper, migrations, route stubs
2. **Backend: OAuth flow** — auth-url + callback endpoints, account storage
3. **Backend: Schedule + webhook** — posting, scheduling, status tracking
4. **Frontend: Connected Accounts in Settings** — connect/disconnect UI
5. **Frontend: Schedule button on content kit** — date picker, schedule action
6. **Frontend: Calendar page** — scheduled/posted timeline

---

## What This Does NOT Include

- Auto-posting without user-initiated scheduling (no AI-decided posting times)
- Analytics dashboard (just basic post status for now)
- Multi-image carousel posting (single image/video per post initially)
- Draft/preview on platform before posting
- Editing a scheduled post (cancel and reschedule instead)
- Google Calendar sync (separate feature)

---

## File Summary

**Backend (echome-platform-v2):**
| Action | File |
|--------|------|
| Create | `src/services/social-posting/outstand-service.ts` |
| Create | `src/routes/social-posting.ts` |
| Create | `src/routes/webhooks/outstand.ts` |
| Create | `supabase/migrations/20260419_social_posting.sql` |

**Frontend (echome-frontend):**
| Action | File |
|--------|------|
| Create | `src/app/app/settings/ConnectedAccounts.tsx` |
| Modify | `src/app/app/settings/SettingsContent.tsx` |
| Modify | `src/app/app/content-kit/[id]/ContentKitDetailContent.tsx` |
| Rewrite | `src/app/app/calendar/CalendarContent.tsx` |
| Modify | `src/lib/api-client.ts` |
