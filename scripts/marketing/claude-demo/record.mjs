// Renders the demo loop deterministically: freezes every animation, seeks it
// frame by frame, screenshots, then ffmpeg builds the mp4, gif and poster.
// Usage: node scripts/marketing/claude-demo/record.mjs
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../public/marketing");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const FPS = 24, DURATION = 18, POSTER_AT = 16.4;
const frames = join(os.tmpdir(), "echome-claude-demo-frames");
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(join(here, "index.html")).href);
await page.waitForTimeout(300);
const seek = (t) =>
  page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t * 1000);
const n = FPS * DURATION;
for (let i = 0; i < n; i++) {
  await seek(i / FPS);
  await page.screenshot({ path: join(frames, `f${String(i).padStart(4, "0")}.png`) });
}
await seek(POSTER_AT);
await page.screenshot({ path: join(out, "echome-claude-demo-poster.png") });
await browser.close();

const run = (args) => execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
const input = ["-framerate", String(FPS), "-i", join(frames, "f%04d.png")];
run([...input, "-an", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow", "-movflags", "+faststart", "-vf", "scale=1280:-2", join(out, "echome-claude-demo.mp4")]);
run([...input, "-vf", "fps=10,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=48:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle", "-loop", "0", join(out, "echome-claude-demo.gif")]);
console.log("done");
