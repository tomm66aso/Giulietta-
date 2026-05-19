# ✦ Wayfarer

**Your World, Your Story** — A beautiful city-based travel map tracker inspired by Beeen.

## Features

- 🌍 **City-level tracking** — add specific cities, not just countries
- 🔍 **Smart city search** — powered by OpenStreetMap Nominatim (free, no API key needed)
- 📍 **Three status types** — Visited, Lived, Wishlist
- 🗺️ **Interactive map** — beautiful CartoDB tiles with custom markers
- 💬 **Notes** — add a memory or feeling for each place
- 📊 **Stats panel** — cities, countries, visited count
- 🔍 **Filter by status** — view only visited, wishlist, etc.
- 💾 **Persistent** — saved in localStorage, works offline after first load
- 📱 **Responsive** — works on mobile too

## Deploy

### GitHub + Vercel (Recommended)

1. Push this folder to a GitHub repo
2. Import in [vercel.com](https://vercel.com) → **New Project** → select repo
3. Leave all settings default → **Deploy** ✓

No build step, no dependencies, pure HTML/CSS/JS.

### Local

Just open `index.html` in a browser. Done.

## Tech Stack

- Pure HTML / CSS / JavaScript (no frameworks)
- [Leaflet.js](https://leafletjs.com) for the map
- [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) for city search
- [CartoDB Voyager](https://carto.com/basemaps) tiles
- localStorage for persistence

## License

MIT
