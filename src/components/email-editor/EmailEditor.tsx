"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import Toolbar from "./toolbar/Toolbar";
import { VariableNode } from "./nodes/VariableNode";
import { GifNode } from "./nodes/GifNode";
import { ImageNode } from "./nodes/ImageNode";
import styles from "./styles.module.css";

interface Props {
  initialContent?: string;
  onChange: (html: string) => void;
  onSizeChange?: (bytes: number) => void;
}

export default function EmailEditor({ initialContent = "", onChange, onSizeChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      ImageNode,
      VariableNode,
      GifNode,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      onSizeChange?.(new Blob([html]).size);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [initialContent, editor]);

  if (!editor) return null;

  return (
    <div className={styles.scope}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
