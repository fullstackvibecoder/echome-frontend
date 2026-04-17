"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";

interface GiphyGif {
  id: string;
  images: {
    original: { url: string };
    fixed_width_small: { url: string };
  };
  alt_text?: string;
  title?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

export default function GiphyGifPicker({ isOpen, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGifs = useCallback(async (q: string) => {
    if (!GIPHY_API_KEY) return;
    setLoading(true);
    try {
      const endpoint = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=pg-13`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.data || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && GIPHY_API_KEY) fetchGifs("");
    if (!isOpen) { setQuery(""); setGifs([]); }
  }, [isOpen, fetchGifs]);

  useEffect(() => {
    if (!isOpen || !GIPHY_API_KEY) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, isOpen, fetchGifs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative bg-card rounded-xl border border-border shadow-2xl flex flex-col max-w-lg w-[calc(100%-32px)] max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Choose a GIF</span>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted">
            <X size={16} />
          </button>
        </div>
        {!GIPHY_API_KEY ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">GIF search unavailable.</p>
            <p className="text-xs text-muted-foreground mt-1">NEXT_PUBLIC_GIPHY_API_KEY is not configured.</p>
          </div>
        ) : (
          <>
            <div className="p-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search GIFs..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              ) : gifs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">{query ? "No GIFs found" : "Loading..."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => { onSelect(gif.images.original.url); onClose(); }}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted hover:scale-[1.03] transition-transform"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gif.images.fixed_width_small.url} alt={gif.alt_text || gif.title || "GIF"} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-3 py-2 text-center border-t border-border">
              <span className="text-[11px] text-muted-foreground">Powered by GIPHY</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
