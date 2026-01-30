import Link from 'next/link';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function TrendsPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-lg text-center">
        {/* Icon */}
        <div className="text-6xl mb-6">🔥</div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Trend Hunter
        </h1>

        {/* Coming Soon Badge */}
        <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-6">
          Coming Soon
        </span>

        {/* Description */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Discover trending content across TikTok, Instagram Reels, and YouTube Shorts.
          Get Agentic analysis of what makes trends go viral, plus customized scripts
          and shot lists to recreate them in your unique voice and style.
        </p>

        {/* Features Preview */}
        <div className="grid gap-4 text-left mb-8">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <span className="text-2xl">🔍</span>
            <div>
              <h3 className="font-semibold text-foreground">Agentic Trend Analysis</h3>
              <p className="text-sm text-muted-foreground">Understand why trends work with deep Agentic analysis of hooks, pacing, and engagement patterns.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <span className="text-2xl">📝</span>
            <div>
              <h3 className="font-semibold text-foreground">Custom Scripts & Shot Lists</h3>
              <p className="text-sm text-muted-foreground">Get personalized scripts adapted to your niche and voice, with detailed shot-by-shot guidance.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <span className="text-2xl">🎬</span>
            <div>
              <h3 className="font-semibold text-foreground">Upload Your Media</h3>
              <p className="text-sm text-muted-foreground">Upload your own images and videos to recreate trending content with your unique visual style.</p>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <span>&larr;</span>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
