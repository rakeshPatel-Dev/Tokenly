# Tokenly website

Download / marketing site for Tokenly.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- shadcn/ui (Nova / Lucide)
- Lucide icons

## Downloads

Install links are defined in `src/lib/downloads.ts` and point at GitHub
Release assets for `v0.1.0`:

- Windows x64 (`.exe`)
- macOS Apple Silicon + Intel (`.dmg`)
- Linux AppImage, `.deb`, `.rpm`

The page detects the visitor OS for the primary CTA and lists every other
platform below. Update `APP_VERSION` / `RELEASE_TAG` when you cut a new
release, and keep asset filenames matched to Tauri bundle output.

## Scripts

```bash
pnpm install
pnpm dev
pnpm build
```
