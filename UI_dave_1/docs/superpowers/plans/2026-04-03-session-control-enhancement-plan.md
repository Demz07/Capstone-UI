# EcoPower Session Control Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement stepper enhancements (rollback, temperature trigger, session lock), dual fan controls, and AI waste classification display

**Architecture:** Add state management for session lock and rollback, modify stepper flow, add new fan control UI elements, and implement AI classification timing

**Tech Stack:** Vanilla JavaScript, HTML, CSS (existing codebase)

---

## Files

- Modify: `index.html:854-872` - Add back button to Step 1
- Modify: `index.html:900-925` - Add waste type display in Step 3 (burning)
- Modify: `index.html:1031-1048` - Replace single fan with two independent fan controls
- Modify: `script.js:955-1100` - SessionController - add rollback, temperature trigger, session lock
- Modify: `script.js` - Add Fan2Controller for TEG fan
- Modify: `script.js:1000` - Add AI waste classification logic
- Modify: `style.css` - Add styles for new UI elements (fans, waste type)

---

## Task 1: Add Back Button to Step 1 (Rollback Before Ignition)

**Files:**
- Modify: `index.html:854-872` - Add back button in Step 1 panel
- Modify: `script.js:955-975` - Add canGoBack property to SessionController.state

- [ ] **Step 1: Add back button HTML to Step 1 panel**

In `index.html`, find the step-panel-1 div (around line 854-872) and add a back button after the confirm button:

```html
<button class="btn-secondary" id="btn-back-to-step1" onclick="SessionController.goBackToStep1()" hidden>
  <i class="bi bi-arrow-left"></i> BACK
</button>
```

- [ ] **Step 2: Add canGoBack state to SessionController**

In `script.js`, find SessionController.state and add `canGoBack: true`:

```javascript
state: {
  canGoBack: true,
  sessionLocked: false,
  currentStep: 0,
  currentPhase: "IDLE",
},
```

- [ ] **Step 3: Add goBackToStep1 method**

Add to SessionController:

```javascript
goBackToStep1() {
  if (!this.state.canGoBack) {
    Toast.show("⚠️ Cannot go back - session in progress");
    return;
  }
  this.state.currentStep = 1;
  this.state.currentPhase = "LOADING";
  this.showStep(1);
  this.simulateWeightDetection();
  Toast.show("↩️ Returned to Step 1 - Weight capture");
  haptic(10);
},
```

- [ ] **Step 4: Update confirmInitialWeight to enable back button**

In `confirmInitialWeight()` method, add at the end:

```javascript
// Enable back button after confirming weight
const backBtn = document.getElementById("btn-back-to-step1");
if (backBtn) backBtn.hidden = false;
```

---

## Task 2: Temperature Trigger at 40°C → Auto-Advance to Burning

**Files:**
- Modify: `script.js:1020-1035` - Update proceedToStep3 and temperature monitoring

- [ ] **Step 1: Modify confirmInitialWeight to set canGoBack false**

In `confirmInitialWeight()`, after confirming weight:

```javascript
// After confirming weight, user can go back until ignition
this.state.canGoBack = true;
const backBtn = document.getElementById("btn-back-to-step1");
if (backBtn) backBtn.hidden = false;
```

- [ ] **Step 2: Add temperature monitoring in Step 2**

Find the heating step simulation code and add 40°C auto-advance. In `script.js` around line 875-897 (step-panel-2), there should be temperature simulation. Add:

```javascript
// Auto-advance at 40°C
if (temp >= 40 && this.state.currentStep === 2) {
  clearInterval(tempInterval);
  this.proceedToStep3();
  Toast.show("🔥 Temperature reached 40°C - Auto-advancing to Burning!");
  return;
}
```

- [ ] **Step 3: Disable rollback after burning starts**

In `proceedToStep3()` method:

```javascript
proceedToStep3() {
  // Disable rollback - session is now locked
  this.state.canGoBack = false;
  this.state.sessionLocked = true;
  
  // ... existing code ...
}
```

---

## Task 3: Session Lock - Block Waste Addition During Burning

**Files:**
- Modify: `script.js:1100-1130` - Add session lock logic to SessionController

- [ ] **Step 1: Add sessionLocked check to goBackToStep1**

In `goBackToStep1()`:

```javascript
goBackToStep1() {
  if (this.state.sessionLocked) {
    Toast.show("🔒 Session locked - Cannot add waste during burning");
    return;
  }
  // ... rest of method
}
```

- [ ] **Step 2: Add visual indicator for session lock**

Add to the burning step (step-panel-3) a lock indicator in `index.html`:

```html
<div class="session-lock-indicator">
  <i class="bi bi-lock-fill"></i> Session Locked
</div>
```

Add CSS in `style.css`:

```css
.session-lock-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
}
```

- [ ] **Step 3: Add session lock indicator to HTML**

Add in `index.html` at the top of step-panel-3 (around line 900):

```html
<div id="session-lock-indicator" class="session-lock-indicator" hidden>
  <i class="bi bi-lock-fill"></i> Session Locked - No waste can be added
</div>
```

Show it when burning starts, hide when done.

---

## Task 4: Two Independent Fan Controls (Filtration & TEG)

**Files:**
- Modify: `index.html:1031-1048` - Replace single Exhaust Fan with two fan controls
- Modify: `script.js` - Add Fan2Controller for TEG fan
- Modify: `style.css` - Add fan slider styles

- [ ] **Step 1: Replace single fan with two fan controls in HTML**

Replace the existing "Exhaust Fan" card (lines 1031-1048) with two new cards:

```html
<!-- Filtration Fan -->
<div class="glass-card hardware-card">
  <div class="hardware-card__header">
    <div class="icon-box icon-box--blue"><i class="bi bi-fan"></i></div>
    <div class="hardware-title-group">
      <span class="hardware-title">Filtration Fan</span>
      <div class="hardware-status">
        <span id="fan1-dot" class="status-dot status-dot--gray"></span>
        <span id="fan1-text" class="status-text">Stopped</span>
      </div>
    </div>
  </div>
  <div class="fan-speed-control">
    <input type="range" id="fan1-slider" class="fan-speed-slider" min="0" max="100" value="0" 
      oninput="FanControl.setSpeed(this.value)">
    <span id="fan1-speed" class="fan-speed-value">0%</span>
  </div>
  <div class="control-actions">
    <button id="fan1-auto" class="control-pill active" onclick="FanControl.setMode('auto')">Auto</button>
    <button id="fan1-on" class="control-pill" onclick="FanControl.setMode('on')">On</button>
    <button id="fan1-off" class="control-pill" onclick="FanControl.setMode('off')">Off</button>
  </div>
</div>

<!-- TEG Fan -->
<div class="glass-card hardware-card">
  <div class="hardware-card__header">
    <div class="icon-box icon-box--green"><i class="bi bi-fan"></i></div>
    <div class="hardware-title-group">
      <span class="hardware-title">TEG Fan</span>
      <div class="hardware-status">
        <span id="fan2-dot" class="status-dot status-dot--gray"></span>
        <span id="fan2-text" class="status-text">Stopped</span>
      </div>
    </div>
  </div>
  <div class="fan-speed-control">
    <input type="range" id="fan2-slider" class="fan-speed-slider" min="0" max="100" value="0" 
      oninput="Fan2Control.setSpeed(this.value)">
    <span id="fan2-speed" class="fan-speed-value">0%</span>
  </div>
  <div class="control-actions">
    <button id="fan2-auto" class="control-pill active" onclick="Fan2Control.setMode('auto')">Auto</button>
    <button id="fan2-on" class="control-pill" onclick="Fan2Control.setMode('on')">On</button>
    <button id="fan2-off" class="control-pill" onclick="Fan2Control.setMode('off')">Off</button>
  </div>
</div>
```

- [ ] **Step 2: Add CSS for fan speed slider**

Add to `style.css`:

```css
.fan-speed-control {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.fan-speed-slider {
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 3px;
  background: var(--color-surface-3);
  outline: none;
}

.fan-speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.fan-speed-value {
  min-width: 40px;
  text-align: right;
  font-weight: 600;
  font-family: monospace;
}
```

- [ ] **Step 3: Update FanControl to handle both fans**

Update existing `FanControl` object in `script.js` to work with fan1 (Filtration):

```javascript
const FanControl = {
  currentMode: "auto",
  currentSpeed: 0,
  
  setSpeed(value) {
    this.currentSpeed = parseInt(value);
    UI.text("fan1-speed", value + "%");
    if (this.currentMode !== "auto") {
      this.updateStatus();
    }
  },
  
  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll("#fan-auto, #fan-on, #fan-off").forEach(btn => btn.classList.remove("active"));
    document.getElementById("fan-" + mode).classList.add("active");
    this.updateStatus();
  },
  
  updateStatus() {
    const isOn = this.currentMode === "on" || (this.currentMode === "auto" && this.currentSpeed > 0);
    const dot = document.getElementById("fan1-dot");
    const text = document.getElementById("fan1-text");
    if (dot && text) {
      dot.className = "status-dot " + (isOn ? "status-dot--green" : "status-dot--gray");
      text.textContent = isOn ? (this.currentMode === "auto" ? "Auto (" + this.currentSpeed + "%)" : "Running") : "Stopped";
    }
  },
};
```

- [ ] **Step 4: Add Fan2Controller for TEG fan**

Add new `Fan2Control` object in `script.js`:

```javascript
const Fan2Control = {
  currentMode: "auto",
  currentSpeed: 0,
  
  setSpeed(value) {
    this.currentSpeed = parseInt(value);
    UI.text("fan2-speed", value + "%");
    if (this.currentMode !== "auto") {
      this.updateStatus();
    }
  },
  
  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll("#fan2-auto, #fan2-on, #fan2-off").forEach(btn => btn.classList.remove("active"));
    document.getElementById("fan2-" + mode).classList.add("active");
    this.updateStatus();
  },
  
  updateStatus() {
    const isOn = this.currentMode === "on" || (this.currentMode === "auto" && this.currentSpeed > 0);
    const dot = document.getElementById("fan2-dot");
    const text = document.getElementById("fan2-text");
    if (dot && text) {
      dot.className = "status-dot " + (isOn ? "status-dot--green" : "status-dot--gray");
      text.textContent = isOn ? (this.currentMode === "auto" ? "Auto (" + this.currentSpeed + "%)" : "Running") : "Stopped";
    }
  },
};
```

- [ ] **Step 5: Expose Fan2Control globally**

Add at the end of the script:

```javascript
window.Fan2Control = Fan2Control;
```

---

## Task 5: AI Waste Classification Display During Burn

**Files:**
- Modify: `index.html:900-925` - Add waste type display in Step 3
- Modify: `script.js:1030-1060` - Add AI classification logic
- Modify: `style.css` - Add styles for waste type display

- [ ] **Step 1: Add waste type display HTML in Step 3**

In `index.html`, inside step-panel-3, add after the burn-grid (around line 925):

```html
<div class="waste-type-display">
  <span class="tiny-label">WASTE TYPE</span>
  <div class="waste-type-value" id="waste-type-value">Analyzing...</div>
</div>
```

- [ ] **Step 2: Add CSS for waste type display**

Add to `style.css`:

```css
.waste-type-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: var(--color-surface-2);
  border-radius: 12px;
  margin-top: 12px;
}

.waste-type-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--eco-light);
  animation: pulse-text 1.5s ease-in-out infinite;
}

.waste-type-value.result {
  animation: none;
  color: var(--eco-mid);
}
```

- [ ] **Step 3: Add AI classification logic to proceedToStep3**

In `proceedToStep3()` method, add after setting burning phase:

```javascript
// Start AI waste classification
this.startWasteClassification();
```

- [ ] **Step 4: Add startWasteClassification method**

Add to SessionController:

```javascript
startWasteClassification() {
  const wasteTypeEl = document.getElementById("waste-type-value");
  if (!wasteTypeEl) return;
  
  // Show "Analyzing..." immediately
  wasteTypeEl.textContent = "Analyzing...";
  wasteTypeEl.classList.remove("result");
  
  // Possible waste types for simulation
  const wasteTypes = ["Plastic", "Paper", "Wood", "Organic", "Metal", "Textile"];
  
  // Wait 1 minute then show classification
  setTimeout(() => {
    const randomType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
    if (wasteTypeEl) {
      wasteTypeEl.textContent = randomType;
      wasteTypeEl.classList.add("result");
    }
    // Store for summary
    SimEngine.data.wasteType = randomType;
  }, 60000); // 1 minute
},
```

- [ ] **Step 5: Display waste type in summary (Step 5)**

In `showSummary()` method, add:

```javascript
// Display waste type if available
const wasteType = SimEngine.data.wasteType || "Unknown";
UI.text("summary-waste-type", wasteType);
```

Add the HTML element in step-panel-5:

```html
<div class="summary-stat">
  <span class="tiny-label">WASTE TYPE</span>
  <span id="summary-waste-type" class="summary-value eco-text">--</span>
</div>
```

- [ ] **Step 6: Clear waste type on new session**

In `startSession()` method, add:

```javascript
// Reset waste type
SimEngine.data.wasteType = null;
```

---

## Task 6: Testing & Verification

- [ ] **Step 1: Test rollback functionality**

1. Start a new session
2. Confirm initial weight
3. Click back button - should return to Step 1
4. Ignite and verify back button is disabled

- [ ] **Step 2: Test temperature trigger**

1. In Step 2 (Pre-Heating), wait for temperature to reach 40°C
2. Verify auto-advance to Step 3 (Burning)

- [ ] **Step 3: Test session lock**

1. During Burning phase, verify session lock indicator shows
2. Try to go back - should be blocked with "Session locked" message

- [ ] **Step 4: Test dual fan controls**

1. Find Filtration Fan and TEG Fan controls in Control screen
2. Adjust sliders - verify speed values update
3. Test Auto/On/Off buttons for each fan

- [ ] **Step 5: Test AI waste classification**

1. Start session and proceed to Burning
2. Verify "Analyzing..." shows in waste type display
3. Wait 1 minute (or reduce timeout for testing)
4. Verify waste type classification appears

---

## Plan Complete

All tasks are ready for implementation. Choose execution approach:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task

**2. Inline Execution** - Execute tasks in this session

Which approach would you like?
