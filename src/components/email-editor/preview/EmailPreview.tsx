"use client";
interface Props {
  html: string;
}

export default function EmailPreview({ html }: Props) {
  return (
    <iframe
      srcDoc={html}
      title="Email preview"
      className="w-full border border-border rounded-lg bg-white"
      style={{ minHeight: 600 }}
      sandbox="allow-same-origin"
    />
  );
}
