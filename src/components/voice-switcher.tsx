'use client';

import { useState, useRef, useEffect } from 'react';
import { useVoiceContext } from '@/contexts/voice-context';
import { ChevronDown, Check, Mic } from 'lucide-react';
import Link from 'next/link';

export function VoiceSwitcher() {
  const { activeVoice, voices, isTeamsUser, loading, voiceCount, voiceLimit, switchVoice } = useVoiceContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isTeamsUser) return null;

  // Zero-voice state: show setup prompt
  if (voices.length === 0) {
    return (
      <div className="px-4 py-3 border-b border-border">
        <Link
          href="/app/voice?tab=team"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
            <Mic className="w-4 h-4" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-foreground">Set up your voices</p>
            <p className="text-xs text-muted-foreground">Get started with EchoTeams</p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative px-4 py-3 border-b border-border">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-3">Active Voice</p>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {activeVoice?.name?.charAt(0).toUpperCase() || '?'}
        </div>

        {/* Name */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {activeVoice?.name || 'Select Voice'}
          </p>
          <p className={`text-xs ${voiceLimit > 0 && voiceCount >= voiceLimit ? 'text-amber-500 font-medium' : 'text-muted-foreground'}`}>
            {voiceCount} of {voiceLimit || voices.length} voice{(voiceLimit || voices.length) !== 1 ? 's' : ''}{voiceLimit > 0 && voiceCount >= voiceLimit ? ' (limit reached)' : ''}
          </p>
        </div>

        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-4 right-4 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
          {voices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => {
                switchVoice(voice.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {voice.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{voice.name}</p>
                {voice.isDefault && (
                  <p className="text-xs text-muted-foreground">Default</p>
                )}
              </div>
              {activeVoice?.id === voice.id && (
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
