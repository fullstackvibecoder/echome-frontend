# Outstand Auto-Posting Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable EchoMe users to connect social media accounts and schedule automatic posts from content kits, powered by Outstand's unified API behind the scenes.

**Architecture:** The backend gets a new `OutstandService` wrapping the Outstand REST API, new `social-posting` routes for OAuth/scheduling/management, and a webhook handler for post status updates. Two new DB tables (`user_social_accounts`, `scheduled_posts`) track connected accounts and scheduled content. The frontend adds a `socialPosting` namespace to the API client, a Connected Accounts section in Settings, a Schedule button on content kit platform posts, and a redesigned Calendar page showing the posting timeline.

**Tech Stack:** Backend: Express, TypeScript, Supabase (Postgres), Outstand REST API. Frontend: React, TypeScript, Tailwind CSS, Next.js App Router.

**Spec:** `docs/superpowers/specs/2026-04-19-outstand-auto-posting-design.md`

**Repos:**
- Frontend: `/Users/aramammo/Side Quests/echome-frontend`
- Backend: `/Users/aramammo/Side Quests/echome-platform-v2`

---

## File Structure

### Backend

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/services/social-posting/outstand-service.ts` | Outstand API wrapper with typed methods |
| Create | `src/routes/social-posting.ts` | OAuth flow, account management, scheduling routes |
| Create | `src/routes/webhooks/outstand.ts` | Webhook handler for post.published, post.error, account.token_expired |
| Modify | `src/app.ts` | Wire new routes into Express app |

### Frontend

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/app/settings/ConnectedAccounts.tsx` | Connected Accounts UI component for Settings page |
| Modify | `src/app/app/settings/SettingsContent.tsx` | Add "connections" tab rendering ConnectedAccounts |
| Modify | `src/app/app/content-kit/[id]/ContentKitDetailContent.tsx` | Add Schedule button to platform posts |
| Rewrite | `src/app/app/calendar/CalendarContent.tsx` | Timeline of scheduled + posted content from Outstand |
| Modify | `src/lib/api-client.ts` | Add `socialPosting` namespace with all endpoints |

### Database (via Supabase MCP)

| Table | Purpose |
|-------|---------|
| `user_social_accounts` | Maps EchoMe users to Outstand social account IDs |
| `scheduled_posts` | Tracks scheduled/posted content with Outstand post IDs |

---

### Task 1: Database Migrations

**Apply via Supabase MCP** (`mcp__plugin_supabase_supabase__apply_migration`)

- [ ] **Step 1: Create `user_social_accounts` table**

Apply this migration with name `social_posting_accounts`:

```sql
CREATE TABLE user_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outstand_account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_username TEXT,
  platform_avatar_url TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_social_accounts_user ON user_social_accounts(user_id);
ALTER TABLE user_social_accounts DISABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Create `scheduled_posts` table**

Apply this migration with name `social_posting_scheduled_posts`:

```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_kit_id UUID REFERENCES content_kits(id) ON DELETE SET NULL,
  outstand_post_id TEXT,
  platform TEXT NOT NULL,
  text TEXT NOT NULL,
  media_urls TEXT[],
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  posted_at TIMESTAMPTZ,
  error_message TEXT,
  analytics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
ALTER TABLE scheduled_posts DISABLE ROW LEVEL SECURITY;
```

- [ ] **Step 3: Verify tables exist**

Run `SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_social_accounts', 'scheduled_posts');` via the Supabase MCP `execute_sql` tool to confirm both tables were created.

---

### Task 2: Backend Outstand Service

**Files:**
- Create: `echome-platform-v2/src/services/social-posting/outstand-service.ts`

- [ ] **Step 1: Read existing service patterns**

Read `echome-platform-v2/src/services/scheduling/scheduling-service.ts` (first 80 lines) to understand the service class pattern (constructor, Supabase usage, error handling, logger).

- [ ] **Step 2: Create the Outstand service**

Create `src/services/social-posting/outstand-service.ts`:

```typescript
/**
 * Outstand Service
 *
 * Wraps the Outstand REST API for social media account management and posting.
 * All platform OAuth, posting, and media upload goes through Outstand's unified API.
 *
 * Outstand API docs: https://api.outstand.so/v1
 * Auth: Bearer token via OUTSTAND_API_KEY env var
 */

import { logger } from '../../utils/logger';

const OUTSTAND_BASE_URL = 'https://api.outstand.so/v1';
const OUTSTAND_API_KEY = process.env.OUTSTAND_API_KEY;

// ============================================================
// TYPES
// ============================================================

export interface OutstandSocialAccount {
  id: string;
  platform: string;
  username: string;
  avatarUrl?: string;
  status: string;
}

export interface OutstandPost {
  id: string;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  content: string;
  socialAccountIds: string[];
  scheduledAt?: string;
  publishedAt?: string;
  error?: string;
  media?: Array<{ id: string; url: string; type: string }>;
}

export interface OutstandMediaUpload {
  uploadUrl: string;
  mediaId: string;
}

export interface CreatePostParams {
  content: string;
  socialAccountIds: string[];
  scheduledAt?: string; // ISO 8601
  media?: string[]; // media IDs from upload flow
}

// ============================================================
// SERVICE
// ============================================================

class OutstandService {
  private apiKey: string;

  constructor() {
    if (!OUTSTAND_API_KEY) {
      throw new Error('OUTSTAND_API_KEY environment variable is not set');
    }
    this.apiKey = OUTSTAND_API_KEY;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${OUTSTAND_BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    logger.info(`[OutstandService] ${method} ${path}`);

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      logger.error(`[OutstandService] ${method} ${path} failed: ${response.status} ${errorBody}`);
      throw new Error(`Outstand API error ${response.status}: ${errorBody}`);
    }

    // DELETE responses may have no body
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // ---- Account Management ----

  /**
   * Get OAuth URL for a platform. User visits this URL to authorize their account.
   * Outstand handles all OAuth complexity — we just redirect the user.
   */
  async getAuthUrl(platform: string, callbackUrl: string): Promise<{ url: string }> {
    return this.request<{ url: string }>('POST', '/social-networks/auth-url', {
      platform,
      callbackUrl,
    });
  }

  /**
   * List all social accounts connected through our Outstand API key.
   * We filter by user on our side using the user_social_accounts table.
   */
  async listAccounts(): Promise<{ accounts: OutstandSocialAccount[] }> {
    return this.request<{ accounts: OutstandSocialAccount[] }>('GET', '/social-accounts');
  }

  /**
   * Get a specific social account by Outstand account ID.
   */
  async getAccount(accountId: string): Promise<OutstandSocialAccount> {
    return this.request<OutstandSocialAccount>('GET', `/social-accounts/${accountId}`);
  }

  /**
   * Disconnect a social account.
   */
  async disconnectAccount(accountId: string): Promise<void> {
    await this.request<void>('DELETE', `/social-accounts/${accountId}`);
  }

  // ---- Posting ----

  /**
   * Create a post (immediate or scheduled).
   * If scheduledAt is provided, the post will be published at that time.
   * If omitted, the post is published immediately.
   */
  async createPost(params: CreatePostParams): Promise<OutstandPost> {
    return this.request<OutstandPost>('POST', '/posts', {
      content: params.content,
      socialAccountIds: params.socialAccountIds,
      scheduledAt: params.scheduledAt,
      media: params.media,
    });
  }

  /**
   * Cancel a scheduled post. Only works for posts with status 'scheduled'.
   */
  async cancelPost(postId: string): Promise<void> {
    await this.request<void>('DELETE', `/posts/${postId}`);
  }

  /**
   * Get post details including current status.
   */
  async getPostStatus(postId: string): Promise<OutstandPost> {
    return this.request<OutstandPost>('GET', `/posts/${postId}`);
  }

  /**
   * List posts with optional status filter.
   */
  async listPosts(filters?: { status?: string; limit?: number }): Promise<{ posts: OutstandPost[] }> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.limit) params.limit = String(filters.limit);
    return this.request<{ posts: OutstandPost[] }>('GET', '/posts', undefined, params);
  }

  // ---- Media ----

  /**
   * Get a presigned upload URL for media (images/video).
   * Flow: get URL -> upload file to URL -> confirm upload -> use media ID in post.
   */
  async getUploadUrl(fileName: string, contentType: string): Promise<OutstandMediaUpload> {
    return this.request<OutstandMediaUpload>('POST', '/media/upload-url', {
      fileName,
      contentType,
    });
  }

  /**
   * Confirm that a media file has been uploaded to the presigned URL.
   */
  async confirmUpload(mediaId: string): Promise<void> {
    await this.request<void>('POST', `/media/${mediaId}/confirm`);
  }

  /**
   * Upload media from a public URL. Downloads from the URL and uploads to Outstand.
   * Returns the Outstand media ID ready for use in posts.
   */
  async uploadMediaFromUrl(fileUrl: string, fileName: string, contentType: string): Promise<string> {
    // 1. Get presigned upload URL
    const { uploadUrl, mediaId } = await this.getUploadUrl(fileName, contentType);

    // 2. Download the file from source URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download media from ${fileUrl}: ${fileResponse.status}`);
    }
    const fileBuffer = await fileResponse.arrayBuffer();

    // 3. Upload to presigned URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: fileBuffer,
    });
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload media to Outstand: ${uploadResponse.status}`);
    }

    // 4. Confirm upload
    await this.confirmUpload(mediaId);

    logger.info(`[OutstandService] Media uploaded: ${mediaId} from ${fileUrl}`);
    return mediaId;
  }
}

// Singleton instance
let outstandServiceInstance: OutstandService | null = null;

export function getOutstandService(): OutstandService {
  if (!outstandServiceInstance) {
    outstandServiceInstance = new OutstandService();
  }
  return outstandServiceInstance;
}
```

---

### Task 3: Backend API Routes

**Files:**
- Create: `echome-platform-v2/src/routes/social-posting.ts`
- Modify: `echome-platform-v2/src/app.ts`

- [ ] **Step 1: Read existing route patterns**

Read `echome-platform-v2/src/routes/scheduling.ts` fully to understand the Express route pattern: imports, authenticateUser middleware, zod validation, error handling with `AppError`, response format `{ success: true, data: ... }`.

- [ ] **Step 2: Create social-posting routes**

Create `src/routes/social-posting.ts`:

```typescript
/**
 * Social Posting Routes
 *
 * API endpoints for Outstand-powered social media posting.
 * Handles OAuth flow, account management, and post scheduling.
 *
 * Endpoints:
 * - POST   /api/social-posting/auth-url       - Get OAuth URL for a platform
 * - GET    /api/social-posting/callback        - OAuth callback from Outstand
 * - GET    /api/social-posting/accounts        - List connected accounts
 * - DELETE /api/social-posting/accounts/:id    - Disconnect an account
 * - POST   /api/social-posting/schedule        - Schedule a post
 * - GET    /api/social-posting/posts           - List scheduled/posted items
 * - DELETE /api/social-posting/posts/:id       - Cancel a scheduled post
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { supabase } from '../utils/supabase';
import { getOutstandService } from '../services/social-posting/outstand-service';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const authUrlSchema = z.object({
  platform: z.enum([
    'instagram', 'linkedin', 'twitter', 'tiktok', 'youtube',
    'facebook', 'threads', 'bluesky', 'pinterest', 'google_business',
  ]),
});

const scheduleSchema = z.object({
  contentKitId: z.string().uuid().optional(),
  platform: z.string().min(1),
  text: z.string().min(1).max(10000),
  mediaUrls: z.array(z.string().url()).optional(),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be a valid ISO datetime' }),
});

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /auth-url
 * Get an OAuth URL for the user to connect a social platform.
 * Frontend opens this in a popup window.
 */
router.post('/auth-url', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const { platform } = authUrlSchema.parse(req.body);
    const userId = req.user!.id;
    const outstand = getOutstandService();

    // Callback URL includes user ID so we can map the account on return
    const callbackUrl = `${process.env.OUTSTAND_CALLBACK_URL}?userId=${userId}`;

    const { url } = await outstand.getAuthUrl(platform, callbackUrl);

    res.json({ success: true, data: { url } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, error.errors[0].message);
    }
    logger.error('[social-posting] Failed to get auth URL:', error);
    throw new AppError(500, 'Failed to get authorization URL');
  }
});

/**
 * GET /callback
 * OAuth callback — Outstand redirects here after user authorizes.
 * Extracts the Outstand account ID, saves mapping to DB, closes popup.
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { userId, accountId } = req.query as { userId?: string; accountId?: string };

    if (!userId || !accountId) {
      logger.error('[social-posting] Callback missing userId or accountId');
      return res.status(400).send('Missing required parameters');
    }

    const outstand = getOutstandService();

    // Fetch account details from Outstand
    const account = await outstand.getAccount(accountId);

    // Save to our DB (upsert — same user + same outstand account = update)
    const { error: dbError } = await supabase
      .from('user_social_accounts')
      .upsert(
        {
          user_id: userId,
          outstand_account_id: accountId,
          platform: account.platform,
          platform_username: account.username,
          platform_avatar_url: account.avatarUrl || null,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,outstand_account_id' }
      );

    if (dbError) {
      logger.error('[social-posting] Failed to save account:', dbError);
      return res.status(500).send('Failed to save connected account');
    }

    logger.info(`[social-posting] User ${userId} connected ${account.platform} account: ${account.username}`);

    // Return HTML that closes the popup and notifies the parent window
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connected!</title></head>
        <body>
          <p>Account connected! This window will close.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'social-account-connected', platform: '${account.platform}' }, '*');
            }
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    logger.error('[social-posting] Callback error:', error);
    res.status(500).send('Failed to connect account');
  }
});

/**
 * GET /accounts
 * List the current user's connected social accounts.
 */
router.get('/accounts', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const userId = req.user!.id;

    const { data: accounts, error } = await supabase
      .from('user_social_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('connected_at', { ascending: false });

    if (error) {
      logger.error('[social-posting] Failed to list accounts:', error);
      throw new AppError(500, 'Failed to list connected accounts');
    }

    res.json({
      success: true,
      data: {
        accounts: (accounts || []).map((a: any) => ({
          id: a.id,
          outstandAccountId: a.outstand_account_id,
          platform: a.platform,
          platformUsername: a.platform_username,
          platformAvatarUrl: a.platform_avatar_url,
          connectedAt: a.connected_at,
        })),
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('[social-posting] List accounts error:', error);
    throw new AppError(500, 'Failed to list connected accounts');
  }
});

/**
 * DELETE /accounts/:id
 * Disconnect a social account. Removes from Outstand and our DB.
 */
router.delete('/accounts/:id', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    // Look up the account to get the Outstand ID
    const { data: account, error: lookupError } = await supabase
      .from('user_social_accounts')
      .select('outstand_account_id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (lookupError || !account) {
      throw new AppError(404, 'Connected account not found');
    }

    // Disconnect from Outstand
    const outstand = getOutstandService();
    try {
      await outstand.disconnectAccount(account.outstand_account_id);
    } catch (error: any) {
      // Log but don't fail — the account may already be disconnected on Outstand's side
      logger.warn(`[social-posting] Failed to disconnect from Outstand (continuing): ${error.message}`);
    }

    // Remove from our DB
    const { error: deleteError } = await supabase
      .from('user_social_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new AppError(500, 'Failed to remove connected account');
    }

    logger.info(`[social-posting] User ${userId} disconnected account ${accountId}`);
    res.json({ success: true, data: null });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('[social-posting] Disconnect error:', error);
    throw new AppError(500, 'Failed to disconnect account');
  }
});

/**
 * POST /schedule
 * Schedule a post to a social platform via Outstand.
 */
router.post('/schedule', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const data = scheduleSchema.parse(req.body);
    const userId = req.user!.id;

    // Find the user's connected account for this platform
    const { data: account, error: accountError } = await supabase
      .from('user_social_accounts')
      .select('outstand_account_id')
      .eq('user_id', userId)
      .eq('platform', data.platform)
      .single();

    if (accountError || !account) {
      throw new AppError(400, `No connected ${data.platform} account. Connect it in Settings first.`);
    }

    const outstand = getOutstandService();

    // Upload media if provided
    let mediaIds: string[] | undefined;
    if (data.mediaUrls && data.mediaUrls.length > 0) {
      mediaIds = [];
      for (const url of data.mediaUrls) {
        // Extract filename and guess content type from URL
        const urlPath = new URL(url).pathname;
        const fileName = urlPath.split('/').pop() || 'media';
        const ext = fileName.split('.').pop()?.toLowerCase();
        const contentType = ext === 'mp4' ? 'video/mp4'
          : ext === 'png' ? 'image/png'
          : ext === 'webp' ? 'image/webp'
          : 'image/jpeg';
        const mediaId = await outstand.uploadMediaFromUrl(url, fileName, contentType);
        mediaIds.push(mediaId);
      }
    }

    // Create the scheduled post on Outstand
    const outstandPost = await outstand.createPost({
      content: data.text,
      socialAccountIds: [account.outstand_account_id],
      scheduledAt: data.scheduledAt,
      media: mediaIds,
    });

    // Save to our scheduled_posts table
    const { data: savedPost, error: saveError } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: userId,
        content_kit_id: data.contentKitId || null,
        outstand_post_id: outstandPost.id,
        platform: data.platform,
        text: data.text,
        media_urls: data.mediaUrls || null,
        scheduled_at: data.scheduledAt,
        status: 'scheduled',
      })
      .select()
      .single();

    if (saveError) {
      logger.error('[social-posting] Failed to save scheduled post:', saveError);
      // Post was created on Outstand but we failed to save locally — still return success
      // but log the error so we can reconcile later
    }

    logger.info(`[social-posting] User ${userId} scheduled ${data.platform} post for ${data.scheduledAt}`);

    res.json({
      success: true,
      data: {
        id: savedPost?.id,
        outstandPostId: outstandPost.id,
        platform: data.platform,
        scheduledAt: data.scheduledAt,
        status: 'scheduled',
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, error.errors[0].message);
    }
    if (error instanceof AppError) throw error;
    logger.error('[social-posting] Schedule error:', error);
    throw new AppError(500, 'Failed to schedule post');
  }
});

/**
 * GET /posts
 * List the user's scheduled and posted items.
 */
router.get('/posts', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const userId = req.user!.id;
    const { status, limit } = req.query as { status?: string; limit?: string };

    let query = supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const { data: posts, error } = await query;

    if (error) {
      logger.error('[social-posting] Failed to list posts:', error);
      throw new AppError(500, 'Failed to list posts');
    }

    res.json({
      success: true,
      data: {
        posts: (posts || []).map((p: any) => ({
          id: p.id,
          contentKitId: p.content_kit_id,
          outstandPostId: p.outstand_post_id,
          platform: p.platform,
          text: p.text,
          mediaUrls: p.media_urls,
          scheduledAt: p.scheduled_at,
          status: p.status,
          postedAt: p.posted_at,
          errorMessage: p.error_message,
          analytics: p.analytics,
          createdAt: p.created_at,
        })),
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('[social-posting] List posts error:', error);
    throw new AppError(500, 'Failed to list posts');
  }
});

/**
 * DELETE /posts/:id
 * Cancel a scheduled post. Removes from Outstand and updates our DB.
 */
router.delete('/posts/:id', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const userId = req.user!.id;
    const postId = req.params.id;

    // Look up the post
    const { data: post, error: lookupError } = await supabase
      .from('scheduled_posts')
      .select('outstand_post_id, status')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (lookupError || !post) {
      throw new AppError(404, 'Scheduled post not found');
    }

    if (post.status !== 'scheduled') {
      throw new AppError(400, `Cannot cancel a post with status "${post.status}"`);
    }

    // Cancel on Outstand
    if (post.outstand_post_id) {
      const outstand = getOutstandService();
      try {
        await outstand.cancelPost(post.outstand_post_id);
      } catch (error: any) {
        logger.warn(`[social-posting] Failed to cancel on Outstand (continuing): ${error.message}`);
      }
    }

    // Update status in our DB
    const { error: updateError } = await supabase
      .from('scheduled_posts')
      .update({ status: 'cancelled' })
      .eq('id', postId)
      .eq('user_id', userId);

    if (updateError) {
      throw new AppError(500, 'Failed to cancel post');
    }

    logger.info(`[social-posting] User ${userId} cancelled post ${postId}`);
    res.json({ success: true, data: null });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('[social-posting] Cancel post error:', error);
    throw new AppError(500, 'Failed to cancel post');
  }
});

export default router;
```

- [ ] **Step 3: Wire the routes into app.ts**

In `echome-platform-v2/src/app.ts`, add the import and route mounting. Find the existing route imports section (around line 40-50) and add:

```typescript
import socialPostingRoutes from './routes/social-posting';
```

Then find the `app.use('/api/scheduling', schedulingRoutes);` line (line 278) and add directly after it:

```typescript
app.use('/api/social-posting', socialPostingRoutes);
```

**Note:** The `/callback` route inside `social-posting.ts` uses `authenticateUser` middleware, but the callback comes from Outstand (no JWT). Read the route file after creation — the callback handler needs to be mounted BEFORE `router.use(authenticateUser)` or extracted to a separate un-authed handler. Fix: move the callback route definition above the `router.use(authenticateUser)` line, or create a separate router. The simplest fix is to restructure the file so the callback route is defined first on a separate un-authed router, then merge. Alternatively, add the callback as a standalone route in `app.ts` that skips auth. The implementer should handle this by placing the `GET /callback` handler before the `router.use(authenticateUser)` call in the file.

---

### Task 4: Backend Webhook Handler

**Files:**
- Create: `echome-platform-v2/src/routes/webhooks/outstand.ts`
- Modify: `echome-platform-v2/src/app.ts`

- [ ] **Step 1: Read an existing webhook handler for pattern**

Read `echome-platform-v2/src/routes/webhooks/mux.ts` (first 60 lines) to understand the webhook pattern: no auth middleware, raw body parsing for signature verification, event type switching.

- [ ] **Step 2: Create the Outstand webhook handler**

Create `src/routes/webhooks/outstand.ts`:

```typescript
/**
 * Outstand Webhook Handler
 *
 * Receives webhook events from Outstand when post status changes.
 * Events: post.published, post.error, account.token_expired
 *
 * Route: POST /api/webhooks/outstand
 * No JWT auth — verified via OUTSTAND_WEBHOOK_SECRET.
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { supabase } from '../../utils/supabase';

const router = Router();

const WEBHOOK_SECRET = process.env.OUTSTAND_WEBHOOK_SECRET;

/**
 * Verify webhook signature from Outstand.
 * Outstand sends a signature in the X-Outstand-Signature header.
 */
function verifySignature(req: Request): boolean {
  if (!WEBHOOK_SECRET) {
    logger.warn('[outstand-webhook] OUTSTAND_WEBHOOK_SECRET not set, skipping verification');
    return true; // Allow in dev
  }

  const signature = req.headers['x-outstand-signature'] as string;
  if (!signature) {
    logger.warn('[outstand-webhook] Missing X-Outstand-Signature header');
    return false;
  }

  // Outstand uses HMAC SHA-256 signature verification
  const crypto = require('crypto');
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

router.post('/', async (req: Request, res: Response) => {
  try {
    // Verify webhook authenticity
    if (!verifySignature(req)) {
      logger.error('[outstand-webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body as { event: string; data: any };
    logger.info(`[outstand-webhook] Received event: ${event}`);

    switch (event) {
      case 'post.published': {
        // Post was successfully published
        const { postId, publishedAt, analytics } = data;

        const { error } = await supabase
          .from('scheduled_posts')
          .update({
            status: 'posted',
            posted_at: publishedAt || new Date().toISOString(),
            analytics: analytics || null,
          })
          .eq('outstand_post_id', postId);

        if (error) {
          logger.error(`[outstand-webhook] Failed to update post ${postId} to posted:`, error);
        } else {
          logger.info(`[outstand-webhook] Post ${postId} marked as posted`);
        }
        break;
      }

      case 'post.error': {
        // Post failed to publish
        const { postId, error: errorMessage } = data;

        const { error } = await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: errorMessage || 'Unknown error',
          })
          .eq('outstand_post_id', postId);

        if (error) {
          logger.error(`[outstand-webhook] Failed to update post ${postId} to failed:`, error);
        } else {
          logger.warn(`[outstand-webhook] Post ${postId} failed: ${errorMessage}`);
        }
        break;
      }

      case 'account.token_expired': {
        // A social account's OAuth token has expired — user needs to re-authorize
        const { accountId, platform } = data;

        // We could notify the user here via email or in-app notification.
        // For now, log it so we can see it in monitoring.
        logger.warn(`[outstand-webhook] Token expired for account ${accountId} (${platform})`);

        // Optionally remove the account so the user sees "disconnected" in UI
        // For now, just log — the user will get an error when they try to post
        // and can re-connect from Settings.
        break;
      }

      default:
        logger.info(`[outstand-webhook] Unhandled event type: ${event}`);
    }

    // Always return 200 to acknowledge receipt
    res.json({ received: true });
  } catch (error: any) {
    logger.error('[outstand-webhook] Handler error:', error);
    // Return 200 anyway to prevent Outstand from retrying on our errors
    res.json({ received: true, error: 'Internal processing error' });
  }
});

export default router;
```

- [ ] **Step 3: Wire webhook into app.ts**

In `echome-platform-v2/src/app.ts`, add the import:

```typescript
import outstandWebhook from './routes/webhooks/outstand';
```

Then find the existing webhook mounts (around lines 294-297, near `app.use('/api/webhooks/mux', muxWebhook)`) and add:

```typescript
app.use('/api/webhooks/outstand', outstandWebhook);
```

This must go in the pre-auth section of the app (before `app.use(authenticateApiKeyOrJwt)` on line 159) since webhooks don't carry JWTs. Find the other webhook routes that are mounted before auth (like the Stripe routes on line 126) and place it there. Actually, looking at the code, the webhook routes at lines 294-297 are mounted AFTER the auth middleware block, but they work because the webhook handlers don't use `authenticateUser` middleware internally. The `authenticateApiKeyOrJwt` on line 159 only sets `req.user` if a valid token is present — it doesn't reject requests without tokens. Verify this by reading the auth middleware, but this pattern should work.

---

### Task 5: Frontend API Client + Connected Accounts UI

**Files:**
- Modify: `echome-frontend/src/lib/api-client.ts`
- Create: `echome-frontend/src/app/app/settings/ConnectedAccounts.tsx`
- Modify: `echome-frontend/src/app/app/settings/SettingsContent.tsx`

- [ ] **Step 1: Add `socialPosting` namespace to api-client.ts**

Read `echome-frontend/src/lib/api-client.ts` and find the end of the `api` object (search for the last namespace before `export default api`). Add the `socialPosting` namespace.

Find the closing of the last namespace in the `api` object (likely around line 4670, before `};` and `export default api;`). Insert before the closing `};`:

```typescript
  // -------- SOCIAL POSTING (Outstand) --------
  socialPosting: {
    /** Get OAuth URL for connecting a social platform */
    getAuthUrl: async (platform: string) => {
      const response = await apiClient.post('/social-posting/auth-url', { platform });
      return response.data as ApiResponse<{ url: string }>;
    },

    /** List user's connected social accounts */
    listAccounts: async () => {
      const response = await apiClient.get('/social-posting/accounts');
      return response.data as ApiResponse<{
        accounts: Array<{
          id: string;
          outstandAccountId: string;
          platform: string;
          platformUsername: string;
          platformAvatarUrl: string | null;
          connectedAt: string;
        }>;
      }>;
    },

    /** Disconnect a social account */
    disconnectAccount: async (id: string) => {
      const response = await apiClient.delete(`/social-posting/accounts/${id}`);
      return response.data as ApiResponse;
    },

    /** Schedule a post to a social platform */
    schedule: async (data: {
      contentKitId?: string;
      platform: string;
      text: string;
      mediaUrls?: string[];
      scheduledAt: string;
    }) => {
      const response = await apiClient.post('/social-posting/schedule', data);
      return response.data as ApiResponse<{
        id: string;
        outstandPostId: string;
        platform: string;
        scheduledAt: string;
        status: string;
      }>;
    },

    /** List scheduled/posted items */
    listPosts: async (filters?: { status?: string; limit?: number }) => {
      const response = await apiClient.get('/social-posting/posts', { params: filters });
      return response.data as ApiResponse<{
        posts: Array<{
          id: string;
          contentKitId: string | null;
          outstandPostId: string;
          platform: string;
          text: string;
          mediaUrls: string[] | null;
          scheduledAt: string;
          status: string;
          postedAt: string | null;
          errorMessage: string | null;
          analytics: any;
          createdAt: string;
        }>;
      }>;
    },

    /** Cancel a scheduled post */
    cancelPost: async (id: string) => {
      const response = await apiClient.delete(`/social-posting/posts/${id}`);
      return response.data as ApiResponse;
    },
  },
```

- [ ] **Step 2: Create ConnectedAccounts component**

Create `src/app/app/settings/ConnectedAccounts.tsx`:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

// Platform config for display
const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'threads', name: 'Threads', icon: '🧵' },
  { id: 'youtube', name: 'YouTube', icon: '🎬' },
  { id: 'bluesky', name: 'Bluesky', icon: '🦋' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌' },
] as const;

interface ConnectedAccount {
  id: string;
  outstandAccountId: string;
  platform: string;
  platformUsername: string;
  platformAvatarUrl: string | null;
  connectedAt: string;
}

export function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await api.socialPosting.listAccounts();
      if (response.success && response.data) {
        setAccounts(response.data.accounts);
      }
    } catch (error) {
      console.error('Failed to load connected accounts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'social-account-connected') {
        toast.success(`${event.data.platform} connected successfully!`);
        setConnecting(null);
        loadAccounts();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadAccounts]);

  const handleConnect = async (platform: string) => {
    try {
      setConnecting(platform);
      const response = await api.socialPosting.getAuthUrl(platform);
      if (response.success && response.data?.url) {
        // Open OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          response.data.url,
          'social-connect',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    } catch (error) {
      toast.error('Failed to start connection. Please try again.');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (account: ConnectedAccount) => {
    try {
      setDisconnecting(account.id);
      await api.socialPosting.disconnectAccount(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      toast.success(`${account.platform} disconnected`);
    } catch (error) {
      toast.error('Failed to disconnect account');
    } finally {
      setDisconnecting(null);
    }
  };

  const connectedPlatformIds = new Set(accounts.map((a) => a.platform));

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-subheading text-xl mb-4">Connected Accounts</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected accounts */}
      <div className="card">
        <h3 className="text-subheading text-xl mb-2">Connected Accounts</h3>
        <p className="text-body text-text-secondary mb-4">
          Connect your social media accounts to schedule and auto-post content directly from EchoMe.
        </p>

        {accounts.length > 0 && (
          <div className="space-y-3 mb-6">
            {accounts.map((account) => {
              const platformConfig = PLATFORMS.find((p) => p.id === account.platform);
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {account.platformAvatarUrl ? (
                      <img
                        src={account.platformAvatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <span className="text-2xl">{platformConfig?.icon || '🔗'}</span>
                    )}
                    <div>
                      <div className="font-medium text-text-primary">
                        {platformConfig?.name || account.platform}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {account.platformUsername}
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Connected
                    </span>
                  </div>
                  <button
                    onClick={() => handleDisconnect(account)}
                    disabled={disconnecting === account.id}
                    className="p-2 text-text-secondary hover:text-error transition-colors disabled:opacity-50"
                    title="Disconnect"
                  >
                    {disconnecting === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Available platforms to connect */}
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-3">
            {accounts.length > 0 ? 'Add more accounts' : 'Connect a platform to get started'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORMS.filter((p) => !connectedPlatformIds.has(p.id)).map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleConnect(platform.id)}
                disabled={connecting === platform.id}
                className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-bg-secondary transition-colors disabled:opacity-50"
              >
                {connecting === platform.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="text-xl">{platform.icon}</span>
                )}
                <span className="text-sm font-medium text-text-primary">
                  {platform.name}
                </span>
                <Plus className="w-3 h-3 text-text-secondary ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add "Connections" tab to SettingsContent**

In `echome-frontend/src/app/app/settings/SettingsContent.tsx`:

**3a.** Add import at the top (after existing imports):

```typescript
import { ConnectedAccounts } from './ConnectedAccounts';
```

**3b.** Update the `SettingsTab` type and `VALID_TABS` array (line 15-16):

Change:
```typescript
type SettingsTab = 'profile' | 'account' | 'preferences' | 'billing' | 'referral';
const VALID_TABS: SettingsTab[] = ['profile', 'account', 'preferences', 'billing', 'referral'];
```

To:
```typescript
type SettingsTab = 'profile' | 'account' | 'connections' | 'preferences' | 'billing' | 'referral';
const VALID_TABS: SettingsTab[] = ['profile', 'account', 'connections', 'preferences', 'billing', 'referral'];
```

**3c.** Find the tab buttons in the render JSX (search for the tab navigation — it lists Profile, Account, Preferences, etc.). Add a "Connections" tab button after the "Account" tab button, following the same pattern as the existing tabs.

**3d.** Add the tab content panel. Find the `{/* Account Tab */}` section and add after its closing `)}`:

```tsx
      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <ConnectedAccounts />
      )}
```

---

### Task 6: Frontend Schedule Button + Calendar Page

**Files:**
- Modify: `echome-frontend/src/app/app/content-kit/[id]/ContentKitDetailContent.tsx`
- Rewrite: `echome-frontend/src/app/app/calendar/CalendarContent.tsx`

- [ ] **Step 1: Read ContentKitDetailContent for Schedule button placement**

Read `echome-frontend/src/app/app/content-kit/[id]/ContentKitDetailContent.tsx` lines 450-530 to find where the existing "Schedule" button and `QuickScheduleModal` are used per platform post. Also read the `InlineWrittenContent` component to see where Copy buttons exist per platform.

The content kit detail page already has Schedule functionality via `QuickScheduleModal` (line 15, 739-753). The existing schedule flow uses the `scheduling` API namespace (the manual content calendar). We need to add an "Auto-post" variant that uses the new `socialPosting` namespace to actually publish via Outstand.

- [ ] **Step 2: Add auto-post schedule button to platform posts**

Read `echome-frontend/src/components/content-kit/InlineWrittenContent.tsx` to find the Copy button for each platform post. Add a "Schedule Post" button next to Copy that:

1. Checks if the user has the platform connected (call `api.socialPosting.listAccounts()` — cache in component state)
2. If not connected: show "Connect [Platform] first" with a link to Settings > Connections
3. If connected: show a date/time picker inline (or a small modal) and call `api.socialPosting.schedule()`
4. On success: toast "Scheduled for [date] on [platform]"

This is the most UI-complex step. The implementation should:
- Add a `scheduleAutoPost` state to track which platform's date picker is open
- Add a date/time input with a "Confirm" button
- Use `api.socialPosting.schedule({ contentKitId, platform, text, scheduledAt })`

Read the `InlineWrittenContent` component first to find the exact location. The button should go next to the existing copy/schedule buttons.

- [ ] **Step 3: Add connected accounts state to ContentKitDetailContent**

In `ContentKitDetailContent.tsx`, add state and a fetch call to load the user's connected social accounts on mount:

```typescript
const [connectedAccounts, setConnectedAccounts] = useState<Array<{ platform: string; id: string }>>([]);

useEffect(() => {
  api.socialPosting.listAccounts()
    .then((res) => {
      if (res.success && res.data) {
        setConnectedAccounts(res.data.accounts.map((a) => ({ platform: a.platform, id: a.id })));
      }
    })
    .catch(() => {}); // Non-critical — just won't show auto-post option
}, []);
```

Pass `connectedAccounts` to `InlineWrittenContent` as a prop so it knows which platforms are connected.

- [ ] **Step 4: Rewrite CalendarContent for auto-posting timeline**

Rewrite `echome-frontend/src/app/app/calendar/CalendarContent.tsx` to show a timeline of scheduled and posted content from the `socialPosting` API:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Sparkles, Calendar, Clock, XCircle, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { AppPageHeader } from '@/components/app-page-header';

// Platform display config
const PLATFORM_LABELS: Record<string, { name: string; icon: string }> = {
  instagram: { name: 'Instagram', icon: '📷' },
  linkedin: { name: 'LinkedIn', icon: '💼' },
  twitter: { name: 'X', icon: '𝕏' },
  facebook: { name: 'Facebook', icon: '📘' },
  tiktok: { name: 'TikTok', icon: '🎵' },
  threads: { name: 'Threads', icon: '🧵' },
  youtube: { name: 'YouTube', icon: '🎬' },
  bluesky: { name: 'Bluesky', icon: '🦋' },
  pinterest: { name: 'Pinterest', icon: '📌' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  scheduled: { label: 'Scheduled', icon: Clock, className: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  posted: { label: 'Posted', icon: CheckCircle, className: 'text-success bg-success/10' },
  failed: { label: 'Failed', icon: AlertCircle, className: 'text-error bg-error/10' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-muted-foreground bg-muted' },
};

interface ScheduledPost {
  id: string;
  contentKitId: string | null;
  platform: string;
  text: string;
  mediaUrls: string[] | null;
  scheduledAt: string;
  status: string;
  postedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export default function CalendarContent() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{ platform: string }>>([]);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.socialPosting.listPosts();
      if (response.success && response.data) {
        setPosts(response.data.posts);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await api.socialPosting.listAccounts();
      if (response.success && response.data) {
        setConnectedAccounts(response.data.accounts);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    loadPosts();
    loadAccounts();
  }, [loadPosts, loadAccounts]);

  const handleCancel = async (postId: string) => {
    try {
      setCancelling(postId);
      await api.socialPosting.cancelPost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: 'cancelled' } : p))
      );
      toast.success('Post cancelled');
    } catch (error) {
      toast.error('Failed to cancel post');
    } finally {
      setCancelling(null);
    }
  };

  const upcoming = posts.filter((p) => p.status === 'scheduled');
  const past = posts.filter((p) => p.status === 'posted' || p.status === 'failed' || p.status === 'cancelled');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AppPageHeader
        title="Content Calendar"
        actions={
          <>
            <button
              onClick={loadPosts}
              disabled={loading}
              className="p-2 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/app" className="btn-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Create Content
            </Link>
          </>
        }
      />

      <p className="text-text-secondary mb-6">
        Your content schedule — see what's coming up and what's been posted.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 && connectedAccounts.length === 0 ? (
        /* No accounts connected — prompt to connect */
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Connect your social accounts to start scheduling
          </h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Link your Instagram, LinkedIn, X, and more to schedule and auto-post content directly from EchoMe.
          </p>
          <Link
            href="/app/settings?tab=connections"
            className="btn-primary inline-flex items-center gap-2"
          >
            Connect Accounts
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-text-secondary text-sm py-4">
                No scheduled posts. Create content and schedule it from a content kit.
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onCancel={() => handleCancel(post.id)}
                    cancelling={cancelling === post.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Past ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  onCancel,
  cancelling,
}: {
  post: ScheduledPost;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const platform = PLATFORM_LABELS[post.platform] || { name: post.platform, icon: '🔗' };
  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.scheduled;
  const StatusIcon = status.icon;

  const displayDate = post.postedAt || post.scheduledAt;
  const formattedDate = new Date(displayDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = new Date(displayDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Truncate text for preview
  const preview = post.text.length > 120 ? post.text.slice(0, 120) + '...' : post.text;

  return (
    <div className="flex items-start gap-4 p-4 bg-bg-secondary rounded-lg border border-border">
      {/* Date */}
      <div className="text-center min-w-[60px]">
        <div className="text-xs text-text-secondary">{formattedDate}</div>
        <div className="text-sm font-medium text-text-primary">{formattedTime}</div>
      </div>

      {/* Platform icon */}
      <span className="text-2xl mt-0.5">{platform.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-text-primary">{platform.name}</span>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.className}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>
        <p className="text-sm text-text-secondary line-clamp-2">{preview}</p>
        {post.errorMessage && (
          <p className="text-xs text-error mt-1">{post.errorMessage}</p>
        )}
        {post.contentKitId && (
          <Link
            href={`/app/content-kit/${post.contentKitId}`}
            className="text-xs text-accent hover:underline mt-1 inline-block"
          >
            View content kit
          </Link>
        )}
      </div>

      {/* Actions */}
      {onCancel && post.status === 'scheduled' && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          className="p-2 text-text-secondary hover:text-error transition-colors disabled:opacity-50"
          title="Cancel scheduled post"
        >
          {cancelling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify the build compiles**

Run `npm run build` in the frontend repo to verify no TypeScript errors. Fix any type issues.

- [ ] **Step 6: Verify the backend compiles**

Run `npm run build` (or `npx tsc --noEmit`) in the backend repo to verify no TypeScript errors. Fix any type issues.
