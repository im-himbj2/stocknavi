# StockNavi Project - Development Notes

**Last Updated:** March 10, 2026
**Current Branch:** main
**Deployment Status:** All recent changes deployed to EC2

---

## Language / 언어 설정

**IMPORTANT:** Always respond in Korean (한국어), regardless of the language used in the question. Even if the user writes in English, all responses must be in Korean.

---

## Project Overview

**StockNavi** (주식 투자 네비게이터): Full-stack stock investment analysis platform with real-time data, AI insights, portfolio tracking, and economic indicators.

- **Frontend:** React 18 + Vite 5, Tailwind CSS, Chart.js, Recharts
- **Backend:** FastAPI (Python), PostgreSQL, SQLAlchemy 2.0
- **Deployment:** AWS EC2 (13.209.70.3) + PM2 + Nginx

---

## Infrastructure Details

### EC2 Instance
- **IP Address:** `13.209.70.3`
- **User:** `ec2-user`
- **SSH Key:** `d:/stock-portfolio/backend/2026_01_29stocknavipem.pem` (PEM file in Windows)

### Deployment Workflow
```bash
# Connect to EC2
ssh -i "d:/stock-portfolio/backend/2026_01_29stocknavipem.pem" ec2-user@13.209.70.3

# Pull latest changes
cd ~/stock-portfolio
git pull origin main

# Frontend deployment
cd frontend
npm run build
pm2 restart stocknavi-frontend

# Or restart both services
pm2 restart all
```

### PM2 Services
- `stocknavi-frontend` - React app on port 5173 (proxied via Nginx to port 80)
- `stocknavi-backend` - FastAPI on port 8000

---

## Recent Completed Work (March 2026)

### 1. ✅ Economic Indicators - Full KR/EN Language Support
**Status:** Completed & Deployed (Commit: fa226bb)

All 8 Economic Indicator subcomponents now support Korean/English toggle:
- MarketGrid.jsx - Market overview (US, Asia, Europe equities + commodities)
- MacroPanel.jsx - Macro indicators (GDP, CPI, unemployment, etc.)
- SentimentGauge.jsx - Fear & Greed index with translated severity levels
- YieldCurveChart.jsx - Yield curve visualization
- ForexPanel.jsx - Foreign exchange rates
- SectorPanel.jsx - S&P 500 sector performance
- EconomicCalendarPanel.jsx - Economic calendar with **locale-aware date formatting** (uses `lang` state to format dates as ko-KR or en-US)
- WorldConflictMap.jsx - Global conflict map (see detailed notes below)

**Translation Pattern:**
```javascript
import { useLanguage } from '../../contexts/LanguageContext'

export default function ComponentName() {
  const { t, lang } = useLanguage()  // Note: 'lang' not 'language'

  // For text translations:
  const label = t('economic.keyName')

  // For locale-aware behavior (e.g., date formatting):
  const formatted = new Date().toLocaleDateString(
    lang === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )
}
```

---

### 2. ✅ WorldConflictMap - 3D Globe with Advanced Features
**Status:** Completed & Deployed (Commit: 35e3002)

Complete rewrite from flat equirectangular map to 3D orthographic globe with advanced interaction.

#### Key Features
1. **3D Globe Rendering**
   - Projection: `geoOrthographic` (3D sphere) instead of `geoEqualEarth` (flat)
   - Added `<Sphere>` for ocean background and `<Graticule>` for latitude/longitude lines

2. **Drag-to-Rotate Interaction**
   - Uses Pointer Events API for smooth 3D globe rotation
   - `onPointerDown` / `onPointerMove` / `onPointerUp` handlers track drag state
   - Drag coefficient: `e.movementX * 0.5`

3. **Scroll Wheel Zoom** (Range: 100–600)
   - **Critical:** Listener registered with `{ passive: false }` to allow `preventDefault()`
   - Prevents page scroll while allowing custom zoom
   - Delta: 30 per scroll direction

4. **Zoom Control Buttons**
   - Top-right corner: `+` / `−` / `⌂` (reset) buttons
   - Each button uses `onPointerDown` with `e.stopPropagation()` to prevent drag trigger

5. **Persistent Detail Modal**
   - Click any conflict zone to open modal (not just hover)
   - Check `!dragging` in click handler to distinguish drag from click
   - Modal displays: name (bilingual), status level, description, and **clickable source links**

6. **20+ Verified Source Links**
   ```javascript
   SOURCE_URLS = {
     'ACLED': 'https://acleddata.com',
     'UN OCHA': 'https://www.unocha.org',
     'SIPRI': 'https://www.sipri.org',
     'ICG': 'https://www.crisisgroup.org',
     'CFR': 'https://www.cfr.org',
     'UNHCR': 'https://www.unhcr.org',
     'IAEA': 'https://www.iaea.org',
     '38 North': 'https://38north.org',
     'CSIS': 'https://www.csis.org',
     'InSight Crime': 'https://insightcrime.org',
     'Reuters': 'https://www.reuters.com',
     'SOHR': 'https://www.syriahr.org',
     'UNAMI': 'https://www.uniraq.org',
     'UN UNIFIL': 'https://unifil.unmissions.org',
     'UN MINUSMA': 'https://minusma.unmissions.org',
     'ECOWAS': 'https://www.ecowas.int',
     'UN BINUH': 'https://unhabitat.org',
     'AMISOM': 'https://amisom-au.org',
     'MINUSCA': 'https://minusca.unmissions.org',
     'UNAMA': 'https://unama.unmissions.org',
     'OSCE': 'https://www.osce.org',
     'UN Security Council': 'https://www.un.org/securitycouncil',
     'UN Panel of Experts': 'https://www.un.org/securitycouncil/sanctions'
   }
   ```

7. **37 Conflict Zones - Bilingual & Accurate**
   - **War zones** (red): Ukraine, Israel, Russia, Syria, Palestine, Yemen, Myanmar, Haiti, Sudan, South Sudan, Libya, CAR, Nigeria (northeast), DRC, Somalia, Afghanistan, Pakistan, Colombia, Mexico
   - **Conflict** (orange): Gaza, Lebanon, Iraq, Turkey, Iran, Philippines, Indonesia
   - **Tensions** (yellow): Azerbaijan, Crimea, North Korea, Venezuela, Hong Kong, Taiwan, Belarus, Balkans, Morocco

   Each zone has:
   - English + Korean names (`name`, `nameKo`)
   - Description + rationale (`note`, `noteKo`)
   - Categorization (`level`: 'war', 'conflict', 'tensions')
   - Multiple verified sources (`sources` array)

#### Data Accuracy Corrections (from user feedback)
- ✅ Russia: Now correctly shows as 'war' (Ukraine invasion since Feb 2022)
- ✅ Israel: Now correctly shows as 'war' (Gaza war since Oct 2023 + Lebanon ops Sept 2024)
- ✅ Added Colombia as 'conflict' (FARC dissidents and ELN activity)
- ✅ Added Azerbaijan as 'tensions' (post-Karabakh ceasefire tensions)

#### File Location
`frontend/src/components/Economic/WorldConflictMap.jsx` (420+ lines)

---

## Translation Locales (i18n)

**Files:**
- `frontend/src/locales/ko.js` (Korean)
- `frontend/src/locales/en.js` (English)

Key sections under `economic` namespace:
```
economic: {
  marketsOverview,        // Market grid labels
  macroIndicators,        // GDP, CPI, etc.
  fearGreed,             // Sentiment gauge levels
  yieldCurve,            // Bond yields
  fxRates,               // Foreign exchange
  sectorPerformance,     // S&P 500 sectors
  economicCalendar,      // Calendar events
  globalRiskMonitor,     // Conflict map
  noData,                // Error states
  // ... plus all status/error message keys
}
```

**Critical Pattern (EconomicCalendarPanel):**
Use both `t` (for text) and `lang` (for locale-aware behavior):
```javascript
const { t, lang } = useLanguage()
// NOT const { t, language } = useLanguage() ❌ (language doesn't exist)
```

---

## Plan for Future Integration (Option A - Tabbed)

**Status:** Plan exists but NOT implemented yet
**File:** See system plan context for `/company` + `/dividend` integration via tabs

When ready to merge CompanyAnalysis and Dividend pages:
1. Add tab state to CompanyAnalysis.jsx
2. Support URL query param: `?tab=dividend`
3. Update Sidebar menu
4. Remove separate `/dividend` route

---

## Known Issues & Solutions

### Wheel Event Handling
- **Issue:** Scroll wheel zoom didn't work initially
- **Root Cause:** Event listener was passive by default, preventing `preventDefault()`
- **Solution:** Register with `{ passive: false }`:
  ```javascript
  container.addEventListener('wheel', handleWheel, { passive: false })
  ```

### Drag vs Click Distinction
- **Issue:** Slight mouse movement during click would trigger drag, preventing modal from opening
- **Root Cause:** `dragging` state set before click could be processed
- **Solution:** Check `!dragging` in click handler:
  ```javascript
  if (zone && !dragging) {
    setSelectedZone(zone)
  }
  ```

### EconomicCalendarPanel Language Reference
- **Issue:** Component tried accessing `language` property from useLanguage hook
- **Root Cause:** Hook exports `lang` not `language`
- **Solution:** Use correct destructuring: `const { t, lang } = useLanguage()`

---

## Development Commands

### Frontend
```bash
cd frontend
npm install           # Install dependencies
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or 'venv\Scripts\activate' on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload  # Dev server (port 8000)
```

### Git Workflow
```bash
# Check status
git status

# Create feature branch
git checkout -b feature/description

# Commit with detailed message
git commit -m "Feat: description"

# Push to origin
git push origin feature/description

# Create PR on GitHub, merge to main

# Deploy
git pull origin main
npm run build  # or appropriate build command
pm2 restart servicename
```

---

## Testing Checklist (After Changes)

- [ ] Language toggle switches between KR/EN across all Economic Indicators
- [ ] WorldConflictMap globe renders as 3D sphere (not flat)
- [ ] Drag mouse to rotate globe smoothly
- [ ] Scroll wheel zooms in/out (range 100–600)
- [ ] Zoom buttons (+/−/reset) work without triggering drag
- [ ] Click conflict zone → modal opens with bilingual name, description, sources
- [ ] Click source links → opens official org website in new tab
- [ ] Modal closes when clicking outside or × button
- [ ] Mobile responsive (globe should resize on smaller screens)

---

## Notes for Future Sessions

1. **EC2 SSH:** Always use full PEM path from Windows: `d:/stock-portfolio/backend/2026_01_29stocknavipem.pem`
2. **EC2 IP:** 13.209.70.3 (not 13.209.83.103)
3. **useLanguage Hook:** Returns `{ t, lang }` not `{ t, language }` — common mistake
4. **Wheel Events:** If adding new scroll-wheel interactions, remember `{ passive: false }`
5. **Bilingual Content:** Always provide both English and Korean versions (e.g., `name`/`nameKo`, `note`/`noteKo`)
6. **Conflict Zone Data:** 37 zones currently. If updating, ensure level ('war'/'conflict'/'tensions') matches current geopolitical reality and include credible sources

---

## Useful Links

- **Live Site:** https://stocknavi24.com/economic
- **GitHub:** (Add your repo URL)
- **EC2 Dashboard:** AWS Console
- **API Docs:** https://stocknavi24.com/api/docs (FastAPI Swagger UI)

---

**Questions?** Check `frontend/src/components/Economic/` for component patterns or `frontend/src/locales/` for translation keys.
