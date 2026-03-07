// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function ReelsPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">🎬</div>
        <h1 className="text-2xl font-bold">Reel Maker</h1>
        <p className="text-text-secondary">
          We&apos;re rebuilding Reel Maker from the ground up - animated carousel backgrounds with text overlays, one click from your content kit.
        </p>
        <span className="inline-block text-sm bg-accent/20 text-accent px-3 py-1 rounded-full font-medium">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
