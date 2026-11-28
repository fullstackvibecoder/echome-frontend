import Link from 'next/link';
import { Panel } from '@/components/ds/Panel';
import type { PanelTarget } from '@/lib/just-echo-client';
import { fullPageHref, panelTitle } from './panel-targets';

export function PanelHost({ target, onClose }: { target: PanelTarget; onClose: () => void }) {
  return (
    <Panel
      title={panelTitle(target)}
      onClose={onClose}
      actions={
        <Link href={fullPageHref(target)} className="text-[12px] font-bold text-je-accent">
          Open full page
        </Link>
      }
    >
      <p className="text-[13px] text-je-muted">This view is moving into the panel. For now it opens as a full page.</p>
    </Panel>
  );
}
