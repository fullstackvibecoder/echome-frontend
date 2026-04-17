"use client";
import { useState } from "react";
import { Editor } from "@tiptap/react";
import { Clapperboard } from "lucide-react";
import FormatButtons from "./FormatButtons";
import GiphyGifPicker from "../pickers/GiphyGifPicker";
import ImageUploader from "../pickers/ImageUploader";
import VariablePicker from "../pickers/VariablePicker";

interface Props { editor: Editor }

export default function Toolbar({ editor }: Props) {
  const [gifOpen, setGifOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border bg-muted/30">
      <FormatButtons editor={editor} />
      <div className="w-px h-5 bg-border mx-1" />
      <ImageUploader onUpload={(url) => editor.chain().focus().setImage({ src: url }).run()} />
      <button
        onClick={() => setGifOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted"
      >
        <Clapperboard size={13} /> GIF
      </button>
      <VariablePicker onInsert={(t) => {
        editor.chain().focus().insertContent({
          type: 'variable',
          attrs: { token: t.key, label: t.label },
        }).run();
      }} />
      <GiphyGifPicker
        isOpen={gifOpen}
        onClose={() => setGifOpen(false)}
        onSelect={(url) => editor.chain().focus().insertContent({ type: 'gif', attrs: { src: url, alt: 'GIF' } }).run()}
      />
    </div>
  );
}
