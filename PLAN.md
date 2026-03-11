# MandiJi - shadcn/ui + Solid Colors Redesign

## What Changes
1. **shadcn/ui components** — Card, Tabs, Badge, Button, Sheet, ScrollArea
2. **Solid colors** — No gradients, no rgba transparency. Clean dark solid theme
3. **Remove month selector** — Auto-detect current month, show it as a Badge
4. **Latest prices** — Show most recent month's data prominently

## Color Palette (Solid)
- `--background: #09090b` (zinc-950)
- `--card: #18181b` (zinc-900)
- `--border: #27272a` (zinc-800)
- `--primary: #22c55e` (green-500)
- `--accent: #f59e0b` (amber-500)
- `--foreground: #fafafa` (zinc-50)
- `--muted: #71717a` (zinc-500)

## Steps

### Phase 1: Install & Configure shadcn
- `npx shadcn@latest init` (New York style, zinc theme, dark mode)
- Install components: card, tabs, badge, button, scroll-area, sheet, separator
- Configure `components.json` and CSS variables

### Phase 2: MandiJiDashboard.jsx
- Remove MAHINA CHUNEIN section entirely
- Show current month as small Badge in header
- Replace custom tab buttons with shadcn `<Tabs>`, `<TabsList>`, `<TabsTrigger>`
- Remove ambient gradient overlay
- Solid background, clean header

### Phase 3: PricesTab.jsx + PriceCard.jsx
- Crop selector → shadcn Badges (scrollable)
- PriceCard → shadcn Card with solid bg colors
- MiniChart → keep SVG but use solid stroke colors
- District breakdown → clean bars on Card
- "Latest price" label showing most recent month

### Phase 4: CalendarTab.jsx
- Crop cards → shadcn Cards
- Phase timeline → solid colored blocks
- Season guide → Badge + solid color indicators

### Phase 5: MandisTab.jsx
- Stats → shadcn Cards
- Heatmap → solid color cells (no gradients)
- Region cards → Badge styled

### Phase 6: NakshaTab.jsx + DistrictPopup.jsx
- Map container → Card
- DistrictPopup → shadcn Sheet (bottom)
- Mandi list items → clean Card rows with Badge

### Phase 7: Verify all tabs, zero errors
