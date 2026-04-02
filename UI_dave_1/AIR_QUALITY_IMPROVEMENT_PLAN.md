# Air Quality Card UI Improvement Plan

## Project
UI_dave_1 - Capstone Dashboard

## Date
April 2, 2026

---

## 1. Current State Analysis

### Location
- **File**: `index.html`, lines 485-564
- **Component**: `.glass-card.filtration-card` (Air Quality)
- **CSS**: `style.css`, lines 2465-2520

### Current Elements
1. **Header**: wind icon + "Air Quality" title + expand button
2. **Legend Row**: Red dot (Raw Smoke PPM), Green dot (Filtered Air AQI)
3. **Dual-line Chart**: 112px height, Y-axis max 500
4. **Half-circle Gauges**: Raw Smoke (PPM) + Filtered Air (AQI) with status badges

---

## 2. Chart Scale Enhancement (COMPLETED)

### Changes Made

| File | Line | Before | After |
|------|------|--------|-------|
| script.js | 725 | `chartOptions(500)` | `chartOptions(1000)` |
| script.js | 641 | `yMax = 500` | `yMax = 1000` |

### Purpose
Extended Y-axis range from 500 to 1000 to accommodate higher PPM/AQI values.

---

## 3. Recommended UI Improvements

### Priority: HIGH

#### 3.1 Current Status Summary
Add prominent "Air Quality: GOOD" header above gauges.

```html
<div class="air-quality-summary">
  <span class="status-label">Current Status:</span>
  <span class="status-value status-good">GOOD</span>
</div>
```

#### 3.2 Increase Chart Height
- Current: 112px
- Proposed: 140px

```css
.filtration-card .chart-container {
  height: 140px !important;
}
```

---

### Priority: MEDIUM

#### 3.3 Trend Indicator
Add ↑↓ arrow showing if air quality is improving/worsening.

```html
<div class="trend-indicator trend-up">
  <i class="bi bi-arrow-up"></i> Improving
</div>
```

#### 3.4 Quick Stats Row
Add mini metrics: PM2.5, Humidity, Temperature.

```html
<div class="quick-stats-row">
  <div class="stat-item"><span class="stat-label">PM2.5</span><span class="stat-value">12</span></div>
  <div class="stat-item"><span class="stat-label">Humidity</span><span class="stat-value">45%</span></div>
  <div class="stat-item"><span class="stat-label">Temp</span><span class="stat-value">72°F</span></div>
</div>
```

#### 3.5 Gauge Range Labels
Add descriptive context below gauges.

```html
<span class="gauge-range">0-50 Good</span>
```

---

### Priority: LOW

#### 3.6 Inline Legend
Move legend items into chart axis labels instead of separate row.

#### 3.7 Last Updated Timestamp
Add subtle "Updated: X mins ago" text.

```html
<span class="last-updated">Updated: 2 mins ago</span>
```

#### 3.8 Enhanced Status Badges
Add icon prefix to badges.

```html
<span class="badge badge--green"><i class="bi bi-check-circle"></i> GOOD</span>
```

---

## 4. Implementation Roadmap

### Phase 1: Chart Scale (COMPLETED)
- [x] Update filtrationChart Y-axis to 1000
- [x] Update sensorModalChart (air type) Y-axis to 1000

### Phase 2: High Priority
- [ ] Add current status summary header
- [ ] Increase chart container height to 140px
- [ ] Add trend indicator

### Phase 3: Medium Priority
- [ ] Create quick stats row
- [ ] Add gauge range labels
- [ ] Enhance status badges with icons

### Phase 4: Low Priority
- [ ] Inline legend into chart
- [ ] Add last updated timestamp

---

## 5. Files to Modify

| File | Changes |
|------|----------|
| `script.js` | ✅ Completed - Y-axis scale updates |
| `style.css` | Chart height, new component styles |
| `index.html` | Add new UI elements (summary, trend, stats) |

---

## 6. Design Considerations

### Color Palette (from ColorHunt)
- Primary: #091413 (Dark)
- Secondary: #285a48 (Dark Green)
- Accent: #408a71 (Medium Green)
- Highlight: #b0e4cc (Light Green)

### Typography
- Font: Poppins (headers), Roboto Mono (numbers)
- Use consistent sizing: 14px (titles), 12px (labels), 18px (values)

### Visual Hierarchy
1. Chart (most important)
2. Current status summary
3. Gauges + values
4. Quick stats (supplementary)

---

## 7. Testing Checklist

- [ ] Chart displays 0-1000 scale correctly
- [ ] Chart renders without overflow at max values
- [ ] Gauges align properly at 140px chart height
- [ ] All colors match the green palette
- [ ] Responsive on mobile (375px width)
- [ ] Hover states work on interactive elements

---

## 8. Notes

- Chart scale changes completed on April 2, 2026
- Additional UI improvements are optional enhancements
- Focus on Phase 2 for maximum visual impact with minimal effort