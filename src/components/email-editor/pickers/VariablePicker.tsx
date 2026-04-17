"use client";
import { useState } from "react";
import { Braces } from "lucide-react";
import { GLOBAL_TOKENS } from "../tokens";

interface Props {
  onInsert: (token: { key: string; label: string }) => void;
}

export default function VariablePicker({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted"
        title="Insert Variable"
      >
        <Braces size={13} />
        {"{{x}}"}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 rounded-lg shadow-lg z-50 overflow-hidden border border-border bg-card min-w-[180px]">
          {GLOBAL_TOKENS.map(t => (
            <button
              key={t.key}
              onClick={() => { onInsert(t); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-mono text-primary">{`{{${t.key}}}`}</span>
              <span className="ml-2 text-muted-foreground">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
