'use client';

/**
 * One post from a kit (spec: EchoMe in Claude, founder 2026-11-19). Claude
 * shows the text in the chat and links here, so this page is deliberately
 * small: the post, edit, copy, schedule, and a way into the full kit.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useContentKitDetail } from '@/hooks/useContentKit';
import { QuickScheduleModal } from '@/components/scheduling';
import { InlineWrittenContent } from '@/components/content-kit/InlineWrittenContent';
import api from '@/lib/api-client';
import type { ContentCategory } from '@/types';
import { INLINE_EDITABLE, NEEDS_MEDIA, normalizePlatform, platformLabel, postTextFor } from '@/lib/single-post';

export default function SinglePostContent() {
  const { kitId } = useParams<{ kitId: string }>();
  const platform = normalizePlatform(useSearchParams().get('platform'));
  const { item, detail, loading, error, refresh } = useContentKitDetail({ id: kitId });
  const [scheduling, setScheduling] = useState(false);
  const [copied, setCopied] = useState(false);

  const kitHref = `/app/library/${kitId}`;
  const text = postTextFor(detail as never, platform);
  const title = detail?.contentKit?.title || item?.title || 'Your post';

  const schedule = async (data: { scheduledFor: string; platforms: string[]; contentCategory?: ContentCategory; notes?: string }) => {
    const res = await api.scheduling.create({
      contentKitId: kitId,
      title,
      scheduledFor: data.scheduledFor,
      platforms: data.platforms,
      contentCategory: data.contentCategory,
      contentType: 'written',
      contentSnapshot: { type: 'written', text },
      notes: data.notes,
    });
    if (!res.success) throw new Error('Failed to schedule content');
    toast.success('Scheduled. It is on your calendar.');
  };

  const copy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error('Could not copy. Select the text and copy it instead.'));
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/app/library" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Library
        </Link>
        <Link href={kitHref} className="text-sm font-medium text-primary-interactive hover:underline">
          See the full kit
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-40 rounded-xl" />
        </div>
      ) : error || !detail ? (
        <div className="rounded-xl border border-border p-6 text-center" role="alert">
          <p className="text-foreground">We couldn&apos;t find this post.</p>
          <Link href="/app/library" className="mt-2 inline-block text-sm font-medium text-primary-interactive hover:underline">
            Go to your library
          </Link>
        </div>
      ) : !text ? (
        <div className="rounded-xl border border-border p-6 text-center">
          <p className="text-foreground">This kit has no {platformLabel(platform).toLowerCase()} yet.</p>
          <Link href={kitHref} className="mt-2 inline-block text-sm font-medium text-primary-interactive hover:underline">
            Open the kit
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{platformLabel(platform)}</p>
          <h1 className="mb-4 text-xl font-semibold text-foreground">{title}</h1>

          {INLINE_EDITABLE.has(platform) ? (
            <InlineWrittenContent
              contentKitId={detail.contentKit?.id ?? kitId}
              contentKitTitle={title}
              knowledgeBaseId={detail.contentKit?.knowledgeBaseId}
              content={{ [platform]: text }}
              onContentUpdate={() => refresh()}
              onSchedule={NEEDS_MEDIA.has(platform) ? undefined : () => setScheduling(true)}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{text}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <Link href={kitHref} className="text-sm font-medium text-primary-interactive hover:underline">
                  Edit in the kit
                </Link>
              </div>
            </div>
          )}

          {NEEDS_MEDIA.has(platform) && (
            <p className="mt-4 text-sm text-muted-foreground">
              This {platformLabel(platform).toLowerCase()} needs an image or video to post. Add one in the{' '}
              <Link href={kitHref} className="font-medium text-primary-interactive hover:underline">full kit</Link> to schedule it.
            </p>
          )}
        </>
      )}

      {detail && (
        <QuickScheduleModal
          isOpen={scheduling}
          onClose={() => setScheduling(false)}
          onSchedule={schedule}
          contentKitId={kitId}
          contentTitle={title}
          defaultPlatform={platform}
        />
      )}
    </div>
  );
}
