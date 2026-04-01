# AI Chatbot Design Spec — EcoPower

## Overview

A rule-based AI chatbot assistant integrated into the EcoPower IoT Monitoring System. Provides contextual help, live data queries, troubleshooting guidance, and session assistance through a floating action button and bottom sheet interface.

## Architecture

### Placement
- **Trigger:** Floating Action Button (FAB) positioned bottom-right, above the bottom navigation bar
- **Panel:** Bottom sheet that slides up to ~80% screen height
- **Scope:** Accessible from all 5 screens (Dashboard, Analytics, Control, Alerts, Reports)

### Components

#### 1. FAB Button
- Circular button, 56px diameter
- Chat icon (Bootstrap Icons `bi-chat-dots-fill`)
- Eco-mid background (`--eco-mid`) with subtle shadow
- Positioned: `bottom: 90px; right: 20px;` (above nav bar)
- Toggles bottom sheet open/close

#### 2. Bottom Sheet Panel
- Slides up from bottom with smooth animation (0.3s cubic-bezier)
- Height: 80vh max, min 400px
- Glass-morphism styling matching existing cards
- Rounded top corners (20px)
- Drag handle indicator at top
- Three states: collapsed (hidden), open, minimized (small header only)

#### 3. Chat Header
- Title: "EcoPower Assistant"
- Subtitle: "Ask about your reactor, battery, or session"
- Close button (X icon)
- Status indicator (online dot)

#### 4. Message Area
- Scrollable message list
- Two message types:
  - **User bubbles:** Right-aligned, eco-mid background, white text, 16px border-radius
  - **Bot bubbles:** Left-aligned, glass card styling (matching existing cards), dark text in light mode
- Timestamps on bot messages (small, dim)
- Typing indicator: 3-dot bounce animation

#### 5. Quick Reply Chips
- Horizontal scrollable row above input
- Context-aware chips that change based on active screen
- Pill styling matching existing filter chips
- Tap to send as user message

#### 6. Input Area
- Text input field with placeholder "Ask about your system..."
- Send button (arrow-up icon)
- Glass card background
- Enter key to send

## Intent System

### Intent Matching
Keyword-based matching against user message text. First match wins. Priority order:

| Priority | Intent | Keywords |
|----------|--------|----------|
| 1 | `battery_status` | battery, charge, drain, voltage, health |
| 2 | `reactor_temp` | temperature, temp, hot, heat, reactor temp |
| 3 | `power_output` | power, watt, energy, output, generate |
| 4 | `air_quality` | air quality, aqi, smoke, filter, pollution |
| 5 | `session_status` | session, phase, step, progress, where am i |
| 6 | `session_start` | start, begin, how to start, new session |
| 7 | `alert_explain` | alert, warning, critical, what does this mean |
| 8 | `esp32_status` | esp32, connection, offline, online, wifi |
| 9 | `fan_control` | fan, exhaust, cooling |
| 10 | `optimization` | optimize, improve, better, more energy, efficient |
| 11 | `report_summary` | report, summary, how did i do, this week |
| 12 | `waste_grade` | waste grade, grade a, grade b, what waste |
| 13 | `greeting` | hi, hello, hey, good morning, good afternoon |
| 14 | `help` | help, what can you do, commands, options |
| 15 | `fallback` | (no match) |

### Response Templates

Each intent returns a response object with:
- `text`: Main response text (can include `{placeholders}` for live data)
- `data`: Optional data card type to render
- `actions`: Optional action buttons

#### Sample Responses

**battery_status:**
```
"Your internal battery is at {battery_pct}%, {charging_status}. Voltage: {voltage}V. {health_note}"
```
Data card: `battery_summary`
Actions: ["View Detail"]

**reactor_temp:**
```
"Reactor temperature: {temp}°C. {safety_status}"
```

**power_output:**
```
"Current power output: {power}W. {trend_note}"
```

**session_status:**
```
"You are in phase {phase_name} ({phase_num}/5). {phase_description}"
```

**greeting:**
```
"Hello! I'm your EcoPower assistant. I can help you check battery status, reactor temperature, power output, session progress, and troubleshoot issues. What would you like to know?"
```

**fallback:**
```
"I'm not sure about that. Try asking about your battery, reactor temperature, power output, or session status. Type 'help' for all options."
```

## Quick Reply Chips by Screen

| Screen | Chips |
|--------|-------|
| Dashboard | "Battery status", "Current power", "Session status" |
| Analytics | "Best waste grade?", "Energy trend?", "AI prediction?" |
| Control | "How to start session?", "ESP32 status", "Fan control help" |
| Alerts | "Explain latest alert", "How to fix this?", "Clear all alerts" |
| Reports | "Session summary", "Best session", "Export report" |

## Data Integration

The ChatBot module reads from existing modules:

- `SimEngine.state` — battery, reactor, power, air quality, ESP32 data
- `SessionController` — current phase, session state
- `AlertSystem` — active alerts
- `Reports` — session history (for summaries)

No data is written to these modules. The chatbot is read-only.

## Styling

### Dark Mode (Default)
- Bot bubbles: `rgba(255,255,255,0.06)` background, `rgba(255,255,255,0.08)` border
- User bubbles: `--eco-mid` background, white text
- Input: transparent bg, white text, subtle bottom border
- Quick chips: `rgba(255,255,255,0.06)` bg, `rgba(255,255,255,0.15)` border
- FAB: `--eco-mid` bg, white icon

### Light Mode
- Bot bubbles: `rgba(0,0,0,0.04)` background, `rgba(0,0,0,0.06)` border
- User bubbles: `--eco-mid` background, white text
- Input: transparent bg, dark text
- Quick chips: `rgba(0,0,0,0.04)` bg, `rgba(0,0,0,0.08)` border
- FAB: `--eco-mid` bg, white icon

## File Changes

### index.html
- Add `#chatFab` button element
- Add `#chatBottomSheet` panel with header, message list, quick chips, input area

### style.css
- FAB styles (position, size, animation, hover)
- Bottom sheet styles (slide animation, glass card, scroll)
- Message bubble styles (user/bot, dark/light)
- Quick chip styles (pill, scrollable)
- Typing indicator animation
- Light mode overrides

### script.js
- New `ChatBot` IIFE module (~250-350 lines)
  - `init()` — setup event listeners, render initial welcome message
  - `toggle()` — open/close bottom sheet
  - `sendMessage(text)` — process user message, match intent, render response
  - `matchIntent(text)` — keyword matching logic
  - `getResponse(intent)` — build response with live data
  - `renderMessage(content, type)` — add message to DOM
  - `renderTyping()` / `removeTyping()` — typing indicator
  - `updateQuickChips()` — context-aware chip updates
  - `getScreenContext()` — determine active screen for chips

## Behavior

1. User taps FAB → bottom sheet slides up
2. Welcome message rendered on first open
3. User types or taps quick chip → message sent
4. Typing indicator shown (600ms delay)
5. Bot response rendered with live data
6. Quick chips update based on context
7. User taps X or FAB → bottom sheet slides down
8. Chat state persists while sheet is open (history maintained)
9. Chat history resets on page reload (no persistence needed)
