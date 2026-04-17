"use client";
import { Editor } from "@tiptap/react";
// Import extensions for type module augmentation
import "@tiptap/extension-bold";
import "@tiptap/extension-italic";
import "@tiptap/extension-underline";
import "@tiptap/extension-heading";
import "@tiptap/extension-link";
import "@tiptap/extension-list";
import "@tiptap/extension-blockquote";
import "@tiptap/extension-horizontal-rule";
import { Bold, Italic, Underline as U, List, ListOrdered, Heading1, Heading2, Heading3, Link as LinkIcon, Minus, Quote } from "lucide-react";

interface Props { editor: Editor }

const btnCls = "p-1.5 rounded hover:bg-muted disabled:opacity-50";
const activeCls = "bg-muted text-primary";

export default function FormatButtons({ editor }: Props) {
  const is = (n: string, attrs?: Record<string, unknown>) => editor.isActive(n, attrs);
  const btn = (onClick: () => void, icon: React.ReactNode, active: boolean, title: string) => (
    <button onClick={onClick} className={`${btnCls} ${active ? activeCls : ""}`} title={title}>{icon}</button>
  );

  return (
    <div className="flex items-center gap-1">
      {btn(() => editor.chain().focus().toggleBold().run(), <Bold size={14} />, is("bold"), "Bold")}
      {btn(() => editor.chain().focus().toggleItalic().run(), <Italic size={14} />, is("italic"), "Italic")}
      {btn(() => editor.chain().focus().toggleUnderline().run(), <U size={14} />, is("underline"), "Underline")}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 size={14} />, is("heading", { level: 1 }), "H1")}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 size={14} />, is("heading", { level: 2 }), "H2")}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 size={14} />, is("heading", { level: 3 }), "H3")}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), <List size={14} />, is("bulletList"), "Bullet list")}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={14} />, is("orderedList"), "Numbered list")}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), <Quote size={14} />, is("blockquote"), "Quote")}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), <Minus size={14} />, false, "Divider")}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(() => {
        const url = prompt("URL?");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }, <LinkIcon size={14} />, is("link"), "Link")}
    </div>
  );
}
