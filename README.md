# OTDR Maker — BCP BEP Measurement

Made by **0XM4NGLI**.

A Next.js web app for organizing OTDR `.sor` measurement files into SR project folders. Drag official `.sor` files into focused projects, copy measurements, search by file number, and open the project folder in Dolphin (Arch Linux / Hyprland).

## What it does
- Shows all official `.sor` files sorted by number (lowest to highest)
- Filter/search by file number (`2`, `21`, `103`...)
- Drag files to the right panel to copy into an SR project folder
- Create / select / delete SR projects
- Edit / duplicate / delete copied measurement files inside a project
- Open folder button launches Dolphin at the project directory
- Popup naming when dragging / editing

## Tech needed
- Node / Bun
- Next.js 16.4.3
- Tailwind CSS
- Linux with Dolphin (for `openFolder` server action; skips gracefully on Vercel)
- Local filesystem access for `/projects` and `.sor` storage

## How to run

```bash
# install
bun install

# dev server
bun run dev

# build (for Vercel)
bun run build
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy
Push to GitHub and deploy with Vercel, or use `vercel --prod`.

> Note: `projects/` writes and `openFolder` are local-only. On Vercel serverless, file persistence needs external storage (DB / S3) and Dolphin won’t open server-side.
