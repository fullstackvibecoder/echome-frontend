'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Menu, X } from 'lucide-react';
import { IconButton } from '@/components/ds/IconButton';
import { cx } from '@/components/ds/cx';
import { useAuth } from '@/hooks/useAuth';
import { useThemePref } from '@/hooks/useThemePref';
import { useConversation } from '@/hooks/just-echo/useConversation';
import { useConversationList } from '@/hooks/just-echo/useConversationList';
import { useHomeData } from '@/hooks/just-echo/useHomeData';
import type { PanelTarget } from '@/lib/just-echo-client';
import { ConversationList } from './ConversationList';
import { Stage } from './Stage';
import { HomeSide } from './home/HomeSide';
import { PanelHost } from './panel/PanelHost';
import { formatOpenParam, isUuid, parseOpenParam, samePanel } from './panel/panel-targets';
import { CommandK } from './search/CommandK';

const SIDE_SKELETON = ['h-[96px]', 'h-[64px]', 'h-[64px]'];

export function JustEchoApp() {
  useThemePref();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] || null;

  const cParam = searchParams?.get('c') ?? null;
  const openParam = searchParams?.get('open') ?? null;
  const validC = cParam !== null && isUuid(cParam);
  const conversationId = validC ? cParam : null;

  const [panel, setPanel] = useState<PanelTarget | null>(() => parseOpenParam(openParam));
  const [draft, setDraft] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const list = useConversationList();
  const home = useHomeData();

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const qs = new URLSearchParams(searchParams?.toString() ?? '');
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) qs.delete(k);
        else qs.set(k, v);
      }
      const s = qs.toString();
      router.replace(s ? `/app?${s}` : '/app', { scroll: false });
    },
    [router, searchParams],
  );

  // Back/forward or Cmd+K changed ?open= from outside. Keep our own state when it
  // already matches, so filters set by Echo survive the URL round trip.
  useEffect(() => {
    const parsed = parseOpenParam(openParam);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPanel((prev) => (prev && formatOpenParam(prev) === openParam) || samePanel(prev, parsed) ? prev : parsed);
  }, [openParam]);

  const openPanel = useCallback(
    (t: PanelTarget) => {
      setPanel(t);
      setHomeOpen(false);
      setParams({ open: formatOpenParam(t) });
    },
    [setParams],
  );
  const closePanel = useCallback(() => {
    setPanel(null);
    setHomeOpen(false);
    setParams({ open: null });
  }, [setParams]);

  const conv = useConversation({
    conversationId,
    panel,
    onCreated: (id) => setParams({ c: id }),
    onPanel: openPanel,
    onTitle: list.setTitle,
    onTurnDone: () => {
      void list.refresh();
      void home.refresh();
    },
  });

  const startNew = useCallback(() => {
    setDraft('');
    setPanel(null);
    setListOpen(false);
    setHomeOpen(false);
    setSearchOpen(false);
    setParams({ c: null, open: null });
  }, [setParams]);

  const pick = useCallback(
    (id: string) => {
      setListOpen(false);
      setSearchOpen(false);
      setParams({ c: id });
    },
    [setParams],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === 'Escape' && !e.defaultPrevented) {
        setListOpen(false);
        setHomeOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sideSheet = panel !== null || homeOpen;
  const invalidC = cParam !== null && !validC;

  return (
    <div className="je je-canvas h-screen overflow-hidden">
      <div className="flex h-full flex-col xl:grid xl:grid-cols-[208px_1fr_392px]">
        <header className="flex items-center justify-between gap-2 border-b border-je-hair p-3 xl:hidden">
          <IconButton label="Conversations" icon={Menu} onClick={() => setListOpen(true)} />
          <IconButton label="This week" icon={CalendarDays} onClick={() => setHomeOpen(true)} />
        </header>

        <aside
          className={cx(
            'bg-je-canvas p-4',
            listOpen
              ? 'fixed inset-y-0 left-0 z-40 w-[280px] border-r border-je-hair xl:static xl:z-auto xl:w-auto xl:border-r-0'
              : 'hidden xl:block',
          )}
        >
          {listOpen && (
            <div className="mb-2 flex justify-end xl:hidden">
              <IconButton label="Close conversations" icon={X} size={30} onClick={() => setListOpen(false)} />
            </div>
          )}
          <ConversationList
            conversations={list.conversations}
            loading={list.loading}
            activeId={conversationId}
            onNew={startNew}
            onSearch={() => setSearchOpen(true)}
            onPick={pick}
          />
        </aside>

        <main className="min-h-0 flex-1 xl:flex-none">
          <Stage
            mode={cParam !== null ? 'thread' : 'new'}
            firstName={firstName}
            suggestions={home.data?.suggestions ?? []}
            items={conv.items}
            sending={conv.sending}
            notFound={invalidC || conv.notFound}
            draft={draft}
            setDraft={setDraft}
            onSend={(t) => void conv.send(t)}
            onOpenPanel={openPanel}
            onConfirm={(id, ok) => void conv.confirm(id, ok)}
            confirmingId={conv.confirmingId}
            onNew={startNew}
          />
        </main>

        <aside
          data-side
          className={cx(
            'min-h-0 overflow-y-auto bg-je-canvas',
            sideSheet ? 'fixed inset-0 z-40 xl:static xl:z-auto' : 'hidden xl:block',
            panel ? '' : 'p-4',
          )}
        >
          {homeOpen && !panel && (
            <div className="mb-2 flex justify-end xl:hidden">
              <IconButton label="Close this week" icon={X} size={30} onClick={() => setHomeOpen(false)} />
            </div>
          )}
          {panel ? (
            <PanelHost target={panel} onClose={closePanel} />
          ) : home.loading ? (
            <div className="flex flex-col gap-3" aria-hidden="true">
              {SIDE_SKELETON.map((h, i) => (
                <div key={i} className={cx('rounded-[12px] bg-je-item', h)} />
              ))}
            </div>
          ) : (
            <HomeSide data={home.data} onOpen={openPanel} />
          )}
        </aside>
      </div>

      <CommandK
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        conversations={list.conversations}
        onPickConversation={pick}
        onOpenPanel={(t) => {
          setSearchOpen(false);
          openPanel(t);
        }}
      />
    </div>
  );
}
