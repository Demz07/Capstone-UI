# AI Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rule-based AI chatbot assistant with FAB trigger and bottom sheet interface to the EcoPower IoT Monitoring System.

**Architecture:** Floating Action Button opens a bottom sheet chat panel. User messages are matched against keyword-based intents. Responses pull live data from SimEngine and existing modules. Context-aware quick reply chips change per screen.

**Tech Stack:** Vanilla HTML5, CSS3, JavaScript (IIFE module pattern), Bootstrap Icons

---

### Task 1: Add Chatbot HTML Markup

**Files:**
- Modify: `index.html:1445-1448` (before toast notification)

- [ ] **Step 1: Insert chatbot HTML elements**

Add the FAB button and bottom sheet panel right before the toast notification (line 1445):

```html
          <!-- AI Chatbot FAB -->
          <button id="chatFab" class="chat-fab" type="button" aria-label="Open AI Assistant">
            <i class="bi bi-chat-dots-fill"></i>
          </button>

          <!-- AI Chatbot Bottom Sheet -->
          <div id="chatBottomSheet" class="chat-bottom-sheet" hidden>
            <div class="chat-handle"></div>
            <div class="chat-header">
              <div class="chat-header-info">
                <div class="chat-header-title">EcoPower Assistant</div>
                <div class="chat-header-subtitle">Ask about your reactor, battery, or session</div>
              </div>
              <button id="chatCloseBtn" class="chat-close-btn" type="button" aria-label="Close chat">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <div id="chatMessages" class="chat-messages"></div>
            <div class="chat-input-area">
              <div id="chatQuickChips" class="chat-quick-chips"></div>
              <div class="chat-input-row">
                <input id="chatInput" class="chat-input" type="text" placeholder="Ask about your system..." autocomplete="off" />
                <button id="chatSendBtn" class="chat-send-btn" type="button" aria-label="Send message">
                  <i class="bi bi-arrow-up"></i>
                </button>
              </div>
            </div>
          </div>
```

### Task 2: Add Chatbot CSS Styles

**Files:**
- Modify: `style.css` (append at end, before light-mode section or at end of file)

- [ ] **Step 1: Add all chatbot CSS styles**

Append these styles to `style.css` before the light-mode overrides section (around line 4400):

```css
/* =========================================
   AI CHATBOT
   ========================================= */

/* FAB Button */
.chat-fab {
  position: absolute;
  bottom: 90px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--eco-mid);
  border: none;
  color: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(64, 138, 113, 0.4);
  transition: all var(--transition-normal);
  z-index: 100;
}

.chat-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(64, 138, 113, 0.5);
}

.chat-fab:active {
  transform: scale(0.95);
}

.chat-fab.open {
  transform: rotate(90deg);
  background: var(--red);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
}

/* Bottom Sheet */
.chat-bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80vh;
  min-height: 400px;
  background: var(--color-surface);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  display: flex;
  flex-direction: column;
  z-index: 99;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.3);
}

.chat-bottom-sheet.open {
  transform: translateY(0);
}

.chat-bottom-sheet[hidden] {
  display: none;
}

/* Drag Handle */
.chat-handle {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin: 10px auto 0;
  flex-shrink: 0;
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.chat-header-info {
  flex: 1;
}

.chat-header-title {
  font-family: "Poppins", sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.chat-header-subtitle {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.chat-close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  transition: color var(--transition-normal);
}

.chat-close-btn:hover {
  color: var(--color-text-primary);
}

/* Messages Area */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

/* Message Bubbles */
.chat-message {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.5;
  animation: chatFadeIn 0.2s ease;
}

@keyframes chatFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message--user {
  align-self: flex-end;
  background: var(--eco-mid);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.chat-message--bot {
  align-self: flex-start;
  background: var(--color-surface-3);
  border: 1px solid var(--color-border-card);
  color: var(--color-text-primary);
  border-bottom-left-radius: 4px;
}

.chat-message__time {
  display: block;
  font-size: 10px;
  color: var(--color-text-dim);
  margin-top: 4px;
}

.chat-message--user .chat-message__time {
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
}

/* Typing Indicator */
.chat-typing {
  align-self: flex-start;
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--color-surface-3);
  border: 1px solid var(--color-border-card);
  border-radius: 16px;
  border-bottom-left-radius: 4px;
}

.chat-typing__dot {
  width: 8px;
  height: 8px;
  background: var(--color-text-secondary);
  border-radius: 50%;
  animation: chatTypingBounce 1.2s infinite;
}

.chat-typing__dot:nth-child(2) {
  animation-delay: 0.2s;
}

.chat-typing__dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes chatTypingBounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}

/* Quick Chips */
.chat-quick-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 16px;
  flex-shrink: 0;
}

.chat-quick-chips::-webkit-scrollbar {
  display: none;
}

.chat-chip {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--color-surface-3);
  border: 1px solid var(--color-border-card);
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-normal);
  white-space: nowrap;
}

.chat-chip:hover {
  background: var(--eco-mid);
  border-color: var(--eco-mid);
  color: #fff;
}

.chat-chip:active {
  transform: scale(0.95);
}

/* Input Area */
.chat-input-area {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.chat-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: "Nunito", sans-serif;
  outline: none;
  transition: border-color var(--transition-normal);
}

.chat-input:focus {
  border-bottom-color: var(--eco-mid);
}

.chat-input::placeholder {
  color: var(--color-text-dim);
}

.chat-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--eco-mid);
  border: none;
  color: #fff;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  flex-shrink: 0;
}

.chat-send-btn:hover {
  background: var(--eco-light);
  color: var(--eco-dark);
}

.chat-send-btn:active {
  transform: scale(0.9);
}

.chat-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Add light-mode overrides for chatbot**

Add these to the light-mode section (around line 4700, after the alert-card light-mode rules):

```css
/* -- Chatbot Light Mode -- */
.light-mode .chat-bottom-sheet {
  background: #fff;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.08);
}

.light-mode .chat-handle {
  background: rgba(0, 0, 0, 0.15);
}

.light-mode .chat-header {
  border-bottom-color: rgba(0, 0, 0, 0.06);
}

.light-mode .chat-message--bot {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.06);
  color: var(--color-text-primary);
}

.light-mode .chat-message__time {
  color: rgba(0, 0, 0, 0.3);
}

.light-mode .chat-message--user .chat-message__time {
  color: rgba(255, 255, 255, 0.6);
}

.light-mode .chat-typing {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.06);
}

.light-mode .chat-typing__dot {
  background: rgba(0, 0, 0, 0.3);
}

.light-mode .chat-chip {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
  color: var(--color-text-secondary);
}

.light-mode .chat-chip:hover {
  background: var(--eco-mid);
  border-color: var(--eco-mid);
  color: #fff;
}

.light-mode .chat-input-area {
  border-top-color: rgba(0, 0, 0, 0.06);
}

.light-mode .chat-input {
  border-bottom-color: rgba(0, 0, 0, 0.1);
  color: var(--color-text-primary);
}

.light-mode .chat-input:focus {
  border-bottom-color: var(--eco-mid);
}

.light-mode .chat-input::placeholder {
  color: rgba(0, 0, 0, 0.3);
}

.light-mode .chat-fab {
  background: var(--eco-mid);
  box-shadow: 0 4px 16px rgba(64, 138, 113, 0.3);
}

.light-mode .chat-fab:hover {
  box-shadow: 0 6px 24px rgba(64, 138, 113, 0.4);
}

.light-mode .chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
}
```

### Task 3: Create ChatBot JavaScript Module

**Files:**
- Modify: `script.js` (append new IIFE module before the closing initialization code)

- [ ] **Step 1: Add the ChatBot IIFE module**

Add this module to `script.js` before the `window` assignments section:

```javascript
// =========================================
// CHATBOT MODULE
// =========================================
const ChatBot = (() => {
  let fab;
  let sheet;
  let messagesEl;
  let inputEl;
  let sendBtn;
  let closeBtn;
  let quickChipsEl;
  let isOpen = false;
  let isTyping = false;

  // Intent definitions
  const intents = [
    {
      id: "battery_status",
      keywords: ["battery", "charge", "drain", "voltage", "health"],
      response: (state) => {
        const batt = state.battery;
        const status = batt.charging ? "charging" : batt.discharging ? "discharging" : "standby";
        const health = batt.pct > 80 ? "Battery health looks great!" : batt.pct > 40 ? "Battery is holding up okay." : "Battery is getting low.";
        return {
          text: `Internal battery: ${batt.pct}% (${status}). Voltage: ${batt.voltage.toFixed(1)}V. ${health}`,
          actions: batt.pct < 20 ? ["Check charging mode"] : []
        };
      }
    },
    {
      id: "reactor_temp",
      keywords: ["temperature", "temp", "hot", "heat"],
      response: (state) => {
        const temp = state.reactor.temp;
        let status = "";
        if (temp > 800) status = "⚠️ Temperature is very high! Monitor closely.";
        else if (temp > 500) status = "Temperature is in normal burning range.";
        else if (temp > 200) status = "Reactor is warming up.";
        else status = "Reactor is cool/cold. Start a session to heat up.";
        return { text: `Reactor temperature: ${temp}°C. ${status}` };
      }
    },
    {
      id: "power_output",
      keywords: ["power", "watt", "energy", "output", "generate"],
      response: (state) => {
        const power = state.power;
        let note = "";
        if (power > 5) note = "Great power output!";
        else if (power > 2) note = "Moderate power generation.";
        else note = "Low power output. Check reactor temperature and waste grade.";
        return { text: `Current power output: ${power.toFixed(1)}W. ${note}` };
      }
    },
    {
      id: "air_quality",
      keywords: ["air quality", "aqi", "smoke", "filter", "pollution"],
      response: (state) => {
        const air = state.air;
        let status = "";
        if (air.filtered < 50) status = "Air quality is good after filtration.";
        else if (air.filtered < 150) status = "Air quality is moderate. Filter is working.";
        else status = "⚠️ High AQI! Check filter status.";
        return { text: `Raw smoke: ${air.raw} PPM. Filtered air: ${air.filtered} AQI. ${status}` };
      }
    },
    {
      id: "session_status",
      keywords: ["session", "phase", "step", "progress"],
      response: (state) => {
        if (!state.session.active) {
          return { text: "No active session. Go to the Control screen to start one!" };
        }
        const phases = ["Load Waste", "Pre-Heat", "Burn", "Cool Down", "Complete"];
        const current = state.session.phase;
        const descriptions = [
          "Add organic waste to the reactor chamber.",
          "Reactor is heating up to ignition temperature.",
          "Waste is burning and generating power!",
          "Reactor is cooling down safely.",
          "Session finished. Check your report for details."
        ];
        return {
          text: `Phase ${current + 1}/5: ${phases[current]}. ${descriptions[current]}`,
          actions: current < 4 ? ["View Control Screen"] : ["View Report"]
        };
      }
    },
    {
      id: "session_start",
      keywords: ["start", "begin", "new session", "how to start"],
      response: () => ({
        text: "To start a session: 1) Go to Control screen, 2) Make sure ESP32 is connected, 3) Add waste in Step 1, 4) Click Ignite in Step 2, 5) Monitor the burn in Step 3. Want me to check your ESP32 status?"
      })
    },
    {
      id: "alert_explain",
      keywords: ["alert", "warning", "critical", "notification"],
      response: (state) => {
        const alerts = state.alerts;
        if (!alerts || alerts.length === 0) {
          return { text: "No active alerts. Your system is running smoothly!" };
        }
        const latest = alerts[alerts.length - 1];
        return { text: `Latest alert: ${latest.type.toUpperCase()} - ${latest.message}. ${latest.type === "critical" ? "Take action immediately!" : "Monitor the situation."}` };
      }
    },
    {
      id: "esp32_status",
      keywords: ["esp32", "connection", "offline", "online", "wifi", "connect"],
      response: (state) => {
        const esp = state.esp32;
        if (esp.online) {
          return { text: `ESP32 is online! IP: ${esp.ip}, Latency: ${esp.latency}ms, Signal: ${esp.signal}/4 bars.` };
        }
        return { text: "⚠️ ESP32 is offline. Check: 1) Device is powered on, 2) WiFi connection, 3) Correct IP address in settings." };
      }
    },
    {
      id: "fan_control",
      keywords: ["fan", "exhaust", "cooling"],
      response: (state) => {
        const fan = state.fan;
        return { text: `Exhaust fan is ${fan.mode}. ${fan.mode === "auto" ? "It runs automatically based on temperature." : fan.mode === "on" ? "Fan is forced on." : "Fan is off. Reactor may heat up faster."}` };
      }
    },
    {
      id: "optimization",
      keywords: ["optimize", "improve", "better", "more energy", "efficient", "efficiency"],
      response: (state) => {
        const tips = [
          "Use Grade A waste for maximum energy output.",
          "Keep the exhaust fan in Auto mode for optimal temperature.",
          "Ensure the reactor door is sealed tightly before starting.",
          "Let the pre-heat phase complete fully before igniting.",
          "Monitor power output during burn - higher temps = more power."
        ];
        const power = state.power;
        if (power < 2) return { text: `Power is low at ${power.toFixed(1)}W. Tips: ${tips[0]} ${tips[2]}` };
        return { text: `System is running well! Tips for more energy: ${tips[0]} ${tips[3]}` };
      }
    },
    {
      id: "report_summary",
      keywords: ["report", "summary", "how did i do", "this week", "stats"],
      response: (state) => {
        const stats = state.stats;
        return { text: `Today's stats: ${stats.sessions} sessions, ${stats.energy.toFixed(1)}Wh generated, ${stats.waste.toFixed(1)}g waste processed, ${stats.co2.toFixed(1)}g CO₂ prevented.` };
      }
    },
    {
      id: "waste_grade",
      keywords: ["waste grade", "grade", "what waste", "type of waste"],
      response: () => ({
        text: "Waste grades: Grade A (dry leaves, paper) = highest energy. Grade B (food scraps) = moderate. Grade C (wet organic) = lower. Grade D (mixed/wet) = lowest. Use drier waste for better results!"
      })
    },
    {
      id: "greeting",
      keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
      response: () => ({
        text: "Hello! I'm your EcoPower assistant. I can help you check battery status, reactor temperature, power output, session progress, and troubleshoot issues. What would you like to know?"
      })
    },
    {
      id: "help",
      keywords: ["help", "what can you do", "commands", "options", "capabilities"],
      response: () => ({
        text: "I can help with: 🔋 Battery status, 🌡️ Reactor temperature, ⚡ Power output, 🌬️ Air quality, 📊 Session progress, 🔌 ESP32 connection, 📋 Report summaries, 💡 Optimization tips. Just ask!"
      })
    }
  ];

  // Quick reply chips per screen
  const quickChips = {
    "screen-dashboard": ["Battery status", "Current power", "Session status"],
    "screen-analytics": ["Best waste grade?", "Energy trend?", "AI prediction?"],
    "screen-control": ["How to start session?", "ESP32 status", "Fan control help"],
    "screen-alerts": ["Explain latest alert", "How to fix this?", "Clear all alerts"],
    "screen-reports": ["Session summary", "Best session", "Export report"]
  };

  function getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function matchIntent(text) {
    const lower = text.toLowerCase();
    for (const intent of intents) {
      for (const keyword of intent.keywords) {
        if (lower.includes(keyword)) {
          return intent;
        }
      }
    }
    return null;
  }

  function getResponse(intent, state) {
    if (!intent) {
      return {
        text: "I'm not sure about that. Try asking about your battery, reactor temperature, power output, or session status. Type 'help' for all options."
      };
    }
    return intent.response(state);
  }

  function renderMessage(text, type, actions = []) {
    const msg = document.createElement("div");
    msg.className = `chat-message chat-message--${type}`;

    const content = document.createElement("div");
    content.textContent = text;
    msg.appendChild(content);

    if (type === "bot") {
      const time = document.createElement("span");
      time.className = "chat-message__time";
      time.textContent = getTimestamp();
      msg.appendChild(time);

      if (actions.length > 0) {
        const actionContainer = document.createElement("div");
        actionContainer.style.cssText = "display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;";
        actions.forEach(actionText => {
          const btn = document.createElement("button");
          btn.className = "chat-chip";
          btn.textContent = actionText;
          btn.style.fontSize = "11px";
          btn.style.padding = "4px 10px";
          btn.addEventListener("click", () => handleUserMessage(actionText));
          actionContainer.appendChild(btn);
        });
        msg.appendChild(actionContainer);
      }
    }

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    if (isTyping) return;
    isTyping = true;
    const typing = document.createElement("div");
    typing.className = "chat-typing";
    typing.id = "chatTypingIndicator";
    typing.innerHTML = '<div class="chat-typing__dot"></div><div class="chat-typing__dot"></div><div class="chat-typing__dot"></div>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    isTyping = false;
    const indicator = document.getElementById("chatTypingIndicator");
    if (indicator) indicator.remove();
  }

  function updateQuickChips() {
    const activeScreen = document.querySelector(".screen-content:not([hidden])");
    const screenId = activeScreen ? activeScreen.id : "screen-dashboard";
    const chips = quickChips[screenId] || quickChips["screen-dashboard"];

    quickChipsEl.innerHTML = "";
    chips.forEach(chipText => {
      const chip = document.createElement("button");
      chip.className = "chat-chip";
      chip.textContent = chipText;
      chip.addEventListener("click", () => handleUserMessage(chipText));
      quickChipsEl.appendChild(chip);
    });
  }

  function handleUserMessage(text) {
    if (!text.trim()) return;

    renderMessage(text, "user");
    inputEl.value = "";

    showTyping();

    setTimeout(() => {
      hideTyping();
      const intent = matchIntent(text);
      const response = getResponse(intent, SimEngine.state);
      renderMessage(response.text, "bot", response.actions || []);
      updateQuickChips();
    }, 600);
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    sheet.hidden = false;
    fab.classList.add("open");

    requestAnimationFrame(() => {
      sheet.classList.add("open");
    });

    if (messagesEl.children.length === 0) {
      renderMessage("Hi! I'm your EcoPower assistant. Ask me about your battery, reactor, power output, or session. Type 'help' to see what I can do!", "bot");
    }

    updateQuickChips();
    inputEl.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    sheet.classList.remove("open");
    fab.classList.remove("open");

    setTimeout(() => {
      sheet.hidden = true;
    }, 300);
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function init() {
    fab = document.getElementById("chatFab");
    sheet = document.getElementById("chatBottomSheet");
    messagesEl = document.getElementById("chatMessages");
    inputEl = document.getElementById("chatInput");
    sendBtn = document.getElementById("chatSendBtn");
    closeBtn = document.getElementById("chatCloseBtn");
    quickChipsEl = document.getElementById("chatQuickChips");

    if (!fab || !sheet) return;

    fab.addEventListener("click", toggle);
    closeBtn.addEventListener("click", close);
    sendBtn.addEventListener("click", () => handleUserMessage(inputEl.value));
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleUserMessage(inputEl.value);
      }
    });

    // Update chips when navigation changes
    const observer = new MutationObserver(() => {
      if (isOpen) updateQuickChips();
    });
    const appContent = document.getElementById("appContent");
    if (appContent) {
      observer.observe(appContent, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    }
  }

  return { init, open, close, toggle };
})();
```

- [ ] **Step 2: Register ChatBot on window and call init**

Find the section where other modules are exposed to `window` (search for `window.Dashboard` or similar) and add:

```javascript
window.ChatBot = ChatBot;
```

Find the initialization section (where `Dashboard.init()`, `Analytics.init()`, etc. are called) and add:

```javascript
ChatBot.init();
```
