(function () {
  "use strict";

  // =========================================
  //  0. GLOBAL APP STATE
  // =========================================
  const AppState = {
    userRole: "operator", // Default to operator
  };

  //  1. SIMULATION ENGINE — Real-Time Data
  // =========================================
  const SimEngine = {
    interval: null,
    tickCount: 0,
    sessionTimerInterval: null,
    sessionElapsed: 0,

    data: {
      batteryInternal: 75.4,
      batterySecondary: 62.1,
      voltageInternal: 12.4,
      voltageSecondary: 12.1,
      batteryInternalTrend: "charging",
      batterySecondaryTrend: "standby",

      reactorTemp: 25.0,
      reactorPhase: "IDLE",
      wasteInitial: 0,
      wasteRemaining: 0,
      wasteBurned: 0,

      aqiRaw: 12,
      aqiFiltered: 8,

      powerOutput: 0.0,
      energyAccumulated: 0.0,
      energyToday: 0.0,
      energyWeek: 245.0,
      energyMonth: 1250.0,

      sessionsTotal: 12,
      totalWasteProcessed: 8.5,
      co2Prevented: 10.2,

      fanMode: "auto",
      fanRunning: false,
      usbEnabled: false,
      chargingMode: "auto",
      targetBattery: "internal",

      espOnline: true,
      espLatency: 45,
      lastSyncTime: Date.now(),
    },

    history: {
      power: Array(30).fill(0),
      temp: Array(30).fill(25),
      aqiRaw: Array(30).fill(12),
      aqiFiltered: Array(30).fill(8),
      batteryInternal: Array(30).fill(75),
      batterySecondary: Array(30).fill(62),
    },

    init() {
      this.start();
    },

    start() {
      if (this.interval) clearInterval(this.interval);
      this.interval = setInterval(() => this.tick(), 1500);
    },

    tick() {
      this.tickCount++;
      const phase = SessionController.state.currentPhase;

      this.updateBatteries(phase);
      this.updateReactor(phase);
      this.updateAirQuality(phase);
      this.updatePower(phase);
      this.updateESP();
      this.updateFanAuto();
      this.pushHistory();
      this.updateUI();
      this.checkAlerts();
    },

    updateBatteries(phase) {
      const d = this.data;

      if (d.chargingMode === "auto") {
        if (d.powerOutput > 2) {
          if (d.batteryInternal < 95) {
            d.batteryInternal += 0.08 + Math.random() * 0.05;
            d.batteryInternalTrend = "charging";
          } else if (d.batterySecondary < 100) {
            d.batterySecondary += 0.05 + Math.random() * 0.03;
            d.batterySecondaryTrend = "charging";
            d.batteryInternalTrend = "full";
          }
        } else {
          d.batteryInternalTrend = d.batteryInternal > 95 ? "full" : "standby";
          d.batterySecondaryTrend = "standby";
        }
      } else {
        if (d.powerOutput > 2) {
          if (d.targetBattery === "internal" && d.batteryInternal < 100) {
            d.batteryInternal += 0.1;
            d.batteryInternalTrend = "charging";
          } else if (d.targetBattery === "secondary" && d.batterySecondary < 100) {
            d.batterySecondary += 0.1;
            d.batterySecondaryTrend = "charging";
          }
        }
      }

      if (d.usbEnabled) {
        d.batteryInternal -= 0.03;
        if (d.batteryInternalTrend !== "charging") d.batteryInternalTrend = "draining";
      }

      // Natural drain
      d.batteryInternal -= 0.005;
      d.batterySecondary -= 0.002;

      d.batteryInternal = clamp(d.batteryInternal, 0, 100);
      d.batterySecondary = clamp(d.batterySecondary, 0, 100);
      d.voltageInternal = +(10.5 + (d.batteryInternal / 100) * 2.3).toFixed(1);
      d.voltageSecondary = +(10.5 + (d.batterySecondary / 100) * 2.3).toFixed(1);
    },

    updateReactor(phase) {
      const d = this.data;
      const effectivePhase = phase || d.reactorPhase || "IDLE";
      
      switch (effectivePhase) {
        case "IDLE":
        case "DONE":
          d.reactorTemp = Math.max(25, d.reactorTemp - randomRange(0.3, 0.8));
          break;
        case "LOADING":
          d.reactorTemp = Math.max(25, d.reactorTemp - 0.1);
          break;
        case "HEATING":
          d.reactorTemp += randomRange(8, 16);
          d.reactorTemp = Math.min(d.reactorTemp, 500);
          break;
        case "BURNING":
          d.reactorTemp = clamp(d.reactorTemp + randomRange(-25, 35), 550, 950);
          const burnRate = (d.wasteInitial / 60) * (0.8 + Math.random() * 0.4);
          d.wasteRemaining = Math.max(0, d.wasteRemaining - burnRate);
          d.wasteBurned = d.wasteInitial - d.wasteRemaining;
          break;
        case "COOLING":
          d.reactorTemp = Math.max(35, d.reactorTemp - randomRange(8, 18));
          break;
      }
    },

    updateAirQuality(phase) {
      const d = this.data;
      switch (phase) {
        case "BURNING":
          d.aqiRaw = clamp(d.aqiRaw + randomRange(-30, 60), 200, 800);
          d.aqiFiltered = clamp(d.aqiRaw * 0.07 + randomRange(-3, 8), 10, 80);
          break;
        case "COOLING":
          d.aqiRaw = Math.max(15, d.aqiRaw - randomRange(10, 25));
          d.aqiFiltered = Math.max(8, d.aqiFiltered - randomRange(3, 8));
          break;
        default:
          d.aqiRaw = clamp(d.aqiRaw + randomRange(-3, 3), 5, 40);
          d.aqiFiltered = clamp(d.aqiFiltered + randomRange(-2, 2), 3, 20);
      }
    },

    updatePower(phase) {
      const d = this.data;
      if (phase === "BURNING") {
        const tempDiff = d.reactorTemp - 25;
        d.powerOutput = clamp((tempDiff / 900) * 14 + randomRange(-1.5, 1.5), 0, 16);
        d.energyAccumulated += (d.powerOutput / 3600) * 1.5;
        d.energyToday += (d.powerOutput / 3600) * 1.5;
      } else if (phase === "COOLING") {
        d.powerOutput = Math.max(0, d.powerOutput - randomRange(0.5, 2));
      } else {
        d.powerOutput = Math.max(0, d.powerOutput - randomRange(0.1, 0.3));
      }
    },

    updateESP() {
      const d = this.data;
      // Rare disconnect simulation
      if (this.tickCount % 100 === 0 && Math.random() < 0.05) {
        d.espOnline = false;
        d.espLatency = 999;
        Toast.show("⚠️ ESP32 connection lost...");
        setTimeout(() => {
          d.espOnline = true;
          d.espLatency = Math.floor(randomRange(20, 80));
          Toast.show("✅ ESP32 reconnected");
          this.updateConnectionUI();
        }, randomRange(2000, 4000));
      } else if (d.espOnline) {
        d.espLatency = Math.floor(randomRange(20, 80));
      }
      d.lastSyncTime = Date.now();
      this.updateConnectionUI();
    },

    updateFanAuto() {
      const d = this.data;
      if (d.fanMode === "auto") {
        const shouldRun = d.reactorTemp > 80 || d.aqiRaw > 100 ||
          SessionController.state.currentPhase === "BURNING" ||
          SessionController.state.currentPhase === "COOLING";
        d.fanRunning = shouldRun;
      } else if (d.fanMode === "on") {
        d.fanRunning = true;
      } else {
        d.fanRunning = false;
      }
      this.updateFanUI();
    },

    pushHistory() {
      const d = this.data;
      const h = this.history;
      h.power.shift(); h.power.push(+d.powerOutput.toFixed(1));
      h.temp.shift(); h.temp.push(Math.round(d.reactorTemp));
      h.aqiRaw.shift(); h.aqiRaw.push(Math.round(d.aqiRaw));
      h.aqiFiltered.shift(); h.aqiFiltered.push(Math.round(d.aqiFiltered));
      h.batteryInternal.shift(); h.batteryInternal.push(+d.batteryInternal.toFixed(1));
      h.batterySecondary.shift(); h.batterySecondary.push(+d.batterySecondary.toFixed(1));
    },

    checkAlerts() {
      const d = this.data;
      if (d.batteryInternal < 15 && this.tickCount % 30 === 0) {
        AlertSystem.add("critical", "Battery Critical", `Internal battery at ${d.voltageInternal}V — immediate charging required.`);
      }
      if (d.aqiRaw > 600 && this.tickCount % 25 === 0) {
        AlertSystem.add("warning", "High Smoke Level", `Raw smoke at ${Math.round(d.aqiRaw)} PPM — filtration active.`);
      }
      if (d.reactorTemp > 900 && this.tickCount % 40 === 0) {
        AlertSystem.add("warning", "High Temperature", `Reactor at ${Math.round(d.reactorTemp)}°C — monitoring closely.`);
      }
    },

    // === UI UPDATE METHODS ===
    updateUI() {
      this.updateBatteryUI();
      this.updateStatsUI();
      this.updateReactorUI();
      this.updateAirUI();
      this.updatePowerUI();
      this.updateChargingUI();
      Dashboard.updateCharts();
      if (Navigation.current === 3) SessionController.updateControlUI();
    },

    updateBatteryUI() {
      const d = this.data;
      // Internal
      UI.text("battery-internal-pct", Math.round(d.batteryInternal) + "%");
      UI.width("battery-internal-fill", d.batteryInternal + "%");
      UI.text("battery-internal-volt", d.voltageInternal + "V");
      this.setBatteryFillColor("battery-internal-fill", d.batteryInternal);
      this.setBatteryStatus("battery-internal-status", d.batteryInternalTrend);

      // Secondary
      UI.text("battery-secondary-pct", Math.round(d.batterySecondary) + "%");
      UI.width("battery-secondary-fill", d.batterySecondary + "%");
      UI.text("battery-secondary-volt", d.voltageSecondary + "V");
      this.setBatteryStatus("battery-secondary-status", d.batterySecondaryTrend);
    },

    setBatteryFillColor(id, pct) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove("battery-fill--green", "battery-fill--yellow", "battery-fill--red", "battery-fill--blue");
      if (pct > 50) el.classList.add("battery-fill--green");
      else if (pct > 20) el.classList.add("battery-fill--yellow");
      else el.classList.add("battery-fill--red");
    },

    setBatteryStatus(id, trend) {
      const el = document.getElementById(id);
      if (!el) return;
      
      const isInternal = id.includes("internal");
      const fillId = isInternal ? "battery-internal-fill" : "battery-secondary-fill";
      const fillEl = document.getElementById(fillId);
      
      el.classList.remove("battery-status--active", "battery-status--charging", "battery-status--low");
      if (fillEl) fillEl.classList.remove("battery-fill--charging", "battery-fill--draining");

      const icon = el.querySelector("i");
      const text = el.querySelector("span");
      switch (trend) {
        case "charging":
          el.classList.add("battery-status--charging");
          if (fillEl) fillEl.classList.add("battery-fill--charging");
          if (icon) icon.className = "bi bi-lightning-fill";
          if (text) text.textContent = "CHARGING";
          break;
        case "draining":
          el.classList.add("battery-status--low");
          if (fillEl) fillEl.classList.add("battery-fill--draining");
          if (icon) icon.className = "bi bi-arrow-down-short";
          if (text) text.textContent = "DRAINING";
          break;
        case "full":
          el.classList.add("battery-status--active");
          if (icon) icon.className = "bi bi-check-circle-fill";
          if (text) text.textContent = "FULL";
          break;
        default:
          if (icon) icon.className = "bi bi-pause-fill";
          if (text) text.textContent = "STANDBY";
      }
    },

    updateStatsUI() {
      const d = this.data;
      UI.text("stat-sessions", d.sessionsTotal);
      UI.text("stat-energy", Math.round(d.energyToday + 156));
      UI.text("stat-waste", (d.totalWasteProcessed + d.wasteBurned / 1000).toFixed(1));
      UI.text("stat-co2", (d.co2Prevented + (d.wasteBurned / 1000) * 1.2).toFixed(1));
    },

    updateReactorUI() {
      const d = this.data;
      UI.text("temp-value", Math.round(d.reactorTemp) + "°");
      UI.height("temp-gauge-bar", (d.reactorTemp / 1000) * 100 + "%");

      const hint = document.getElementById("temp-hint");
      if (hint) {
        if (d.reactorTemp > 600) hint.textContent = "Tap for chart";
        else if (d.reactorTemp > 200) hint.textContent = "Heating up...";
        else hint.textContent = "Tap for chart";
      }

      UI.text("waste-current-val", Math.round(d.wasteRemaining));
      UI.text("waste-initial-val", Math.round(d.wasteInitial) + "g");
      UI.text("waste-burned-val", Math.round(d.wasteBurned) + "g");
      UI.text("waste-initial-label", Math.round(d.wasteInitial) + "g");
      const wastePct = d.wasteInitial > 0 ? (d.wasteRemaining / d.wasteInitial) * 100 : 0;
      UI.width("waste-progress-bar", wastePct + "%");
    },

    updateAirUI() {
      const d = this.data;
      UI.text("val-raw-smoke", Math.round(d.aqiRaw));
      UI.text("val-filtered-air", Math.round(d.aqiFiltered));

      const rawPct = Math.min(d.aqiRaw / 500, 1);
      const filtPct = Math.min(d.aqiFiltered / 100, 1);
      UI.strokeDash("gauge-raw-smoke", rawPct * 126);
      UI.strokeDash("gauge-filtered-air", filtPct * 126);

      this.setAQIStatus("status-raw-smoke", d.aqiRaw, "ppm");
      this.setAQIStatus("status-filtered-air", d.aqiFiltered, "aqi");

      const summaryEl = document.getElementById("airQualityStatus");
      if (summaryEl) {
        const aqi = d.aqiFiltered;
        let statusText, statusClass;
        if (aqi <= 50) { statusText = "GOOD"; statusClass = "status-good"; }
        else if (aqi <= 100) { statusText = "MODERATE"; statusClass = "status-moderate"; }
        else if (aqi <= 150) { statusText = "UNHEALTHY"; statusClass = "status-unhealthy"; }
        else { statusText = "HAZARDOUS"; statusClass = "status-hazardous"; }
        summaryEl.textContent = statusText;
        summaryEl.className = "summary-value " + statusClass;
      }

      UI.text("stat-pm25", Math.round(d.aqiRaw * 0.12));
      const hum = Math.round(40 + Math.random() * 20);
      UI.text("stat-humidity", hum + "%");
      const tempF = Math.round(68 + Math.random() * 10);
      UI.text("stat-temp", tempF + "°F");
      UI.text("stat-updated", "now");
    },

    setAQIStatus(id, val, type) {
      const el = document.getElementById(id);
      if (!el) return;
      let status, cls;
      if (type === "ppm") {
        if (val < 100) { status = "GOOD"; cls = "badge--green"; }
        else if (val < 300) { status = "MODERATE"; cls = "badge--yellow"; }
        else if (val < 500) { status = "UNHEALTHY"; cls = "badge--orange"; }
        else { status = "HAZARDOUS"; cls = "badge--red"; }
      } else {
        if (val < 30) { status = "GOOD"; cls = "badge--green"; }
        else if (val < 50) { status = "MODERATE"; cls = "badge--yellow"; }
        else if (val < 70) { status = "UNHEALTHY"; cls = "badge--orange"; }
        else { status = "HAZARDOUS"; cls = "badge--red"; }
      }
      el.textContent = status;
      el.className = "badge " + cls;
    },

    updatePowerUI() {
      const d = this.data;
      UI.text("power-val-main", d.powerOutput.toFixed(1));
      const modalPower = document.getElementById("modal-power-value");
      if (modalPower) modalPower.innerHTML = d.powerOutput.toFixed(1) + "<small>W</small>";
    },

    updateChargingUI() {
      const d = this.data;
      const filter = Dashboard.chargingFilter || "today";
      let val = 0;
      switch (filter) {
        case "today": val = d.energyToday; break;
        case "week": val = d.energyWeek + d.energyToday; break;
        case "month": val = d.energyMonth + d.energyToday; break;
      }
      UI.text("charging-energy-val", val.toFixed(1));
    },

    updateConnectionUI() {
      const d = this.data;
      const dot = document.getElementById("conn-dot");
      const status = document.getElementById("conn-status");
      const sync = document.getElementById("last-sync");
      const latency = document.getElementById("latency-val");

      if (dot) {
        dot.className = d.espOnline
          ? "conn-status-dot conn-status-dot--online"
          : "conn-status-dot conn-status-dot--offline";
      }
      if (status) {
        status.textContent = d.espOnline ? "ONLINE" : "OFFLINE";
        status.className = d.espOnline ? "badge badge--online" : "badge badge--red";
      }
      if (sync) {
        const elapsed = Math.floor((Date.now() - d.lastSyncTime) / 1000);
        sync.textContent = elapsed < 5 ? "Just now" : elapsed + "s ago";
      }
      if (latency) latency.textContent = d.espLatency;

      // Signal bars
      const bars = document.querySelectorAll(".signal-strength .signal-bar");
      const strength = d.espOnline ? (d.espLatency < 50 ? 4 : d.espLatency < 80 ? 3 : 2) : 0;
      bars.forEach((bar, i) => {
        bar.classList.toggle("signal-bar--active", i < strength);
      });
    },

    updateFanUI() {
      const d = this.data;
      const dot = document.getElementById("fan-dot");
      const text = document.getElementById("fan-text");
      if (dot) {
        dot.className = d.fanRunning
          ? "status-dot status-dot--green pulse-dot"
          : "status-dot status-dot--gray";
      }
      if (text) {
        text.textContent = d.fanRunning ? "Running" : "Stopped";
        text.className = d.fanRunning
          ? "status-text eco-text"
          : "status-text";
      }
    },

    startSessionTimer() {
      this.sessionElapsed = 0;
      if (this.sessionTimerInterval) clearInterval(this.sessionTimerInterval);
      const timerEl = document.getElementById("sessionTimer");
      const timerValEl = document.getElementById("sessionTimerValue");
      if (timerEl) timerEl.hidden = false;

      this.sessionTimerInterval = setInterval(() => {
        this.sessionElapsed++;
        const m = Math.floor(this.sessionElapsed / 60).toString().padStart(2, "0");
        const s = (this.sessionElapsed % 60).toString().padStart(2, "0");
        if (timerValEl) timerValEl.textContent = m + ":" + s;
      }, 1000);
    },

    stopSessionTimer() {
      if (this.sessionTimerInterval) clearInterval(this.sessionTimerInterval);
      const timerEl = document.getElementById("sessionTimer");
      if (timerEl) timerEl.hidden = true;
    },
  };

  // =========================================
  //  2. UI HELPERS
  // =========================================
  const UI = {
    text(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; },
    html(id, val) { const el = document.getElementById(id); if (el) el.innerHTML = val; },
    width(id, val) { const el = document.getElementById(id); if (el) el.style.width = val; },
    height(id, val) { const el = document.getElementById(id); if (el) el.style.height = val; },
    visible(id, show) { const el = document.getElementById(id); if (el) el.hidden = !show; },
    addClass(id, cls) { const el = document.getElementById(id); if (el) el.classList.add(cls); },
    removeClass(id, cls) { const el = document.getElementById(id); if (el) el.classList.remove(cls); },
    toggleClass(id, cls, force) { const el = document.getElementById(id); if (el) el.classList.toggle(cls, force); },
    strokeDash(id, val) {
      const el = document.getElementById(id);
      if (el) el.setAttribute("stroke-dashoffset", 126 - val);
    },
  };

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
  function randomRange(min, max) { return Math.random() * (max - min) + min; }

  let userInteracted = false;
  document.addEventListener("click", () => userInteracted = true, { once: true });
  document.addEventListener("touchstart", () => userInteracted = true, { once: true });

  function haptic(pattern) {
    if (!userInteracted) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { }
  }

  // =========================================
  //  3. TOAST SYSTEM
  // =========================================
  const Toast = {
    timeout: null,
    show(msg, duration = 2500) {
      const el = document.getElementById("toastNotification");
      const msgEl = document.getElementById("toastMessage");
      if (!el || !msgEl) return;
      clearTimeout(this.timeout);
      msgEl.textContent = msg;
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add("toast-notification--visible");
      this.timeout = setTimeout(() => {
        el.classList.remove("toast-notification--visible");
        setTimeout(() => { el.hidden = true; }, 350);
      }, duration);
    },
  };

  // =========================================
  //  4. NAVIGATION CONTROLLER
  // =========================================
  const Navigation = {
    current: 1,
    screens: ["dashboard", "analytics", "control", "alerts", "reports"],

    init() {
      const navItems = document.querySelectorAll(".app-nav__item");
      navItems.forEach((item, idx) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          this.switchScreen(idx + 1);
        });
      });
      this.switchScreen(1);
    },

    switchScreen(idx) {
      if (idx === this.current && idx !== 1) return;
      
      const role = AppState.userRole;
      const isCaptain = (role === "captain");
      if (isCaptain && ![1, 2, 5].includes(idx)) {
        console.warn("Access denied for Barangay Captain role.");
        return;
      }

      this.current = idx;

      // Nav visuals
      const navItems = document.querySelectorAll(".app-nav__item");
      let visualIdx = 0;
      let visibleCount = 0;

      navItems.forEach((item, i) => {
        const itemIdx = i + 1;
        const isSelected = itemIdx === idx;
        const isVisible = item.style.display !== "none";
        
        item.classList.toggle("app-nav__item--active", isSelected);
        
        if (isVisible) {
          if (isSelected) visualIdx = visibleCount;
          visibleCount++;
        }
      });

      const nav = document.querySelector(".app-nav");
      if (nav) {
        nav.style.setProperty("--nav-idx", visualIdx);
        nav.style.setProperty("--nav-count", visibleCount);
      }

      this.screens.forEach((id, i) => {
        UI.visible("screen-" + id, i + 1 === idx);
      });

      // Scroll to top
      const content = document.getElementById("mainAppContent");
      if (content) content.scrollTop = 0;

      // Screen-specific init
      if (idx === 2) Analytics.init();
      if (idx === 4) AlertSystem.refresh();
      if (idx === 5) Reports.init();

      haptic(5);
    },
  };

  // =========================================
  //  5. APP — Modal Controller
  // =========================================
  const App = {
    sensorChart: null,
    powerModalChart: null,
    batteryDetailChart: null,
    statDetailChart: null,
    detailWasteChart: null,
    detailTempChart: null,

    openModal(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.hidden = false;
      void modal.offsetWidth;
      modal.classList.add("app-modal--visible");
      haptic(10);
    },

    closeModal(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.classList.remove("app-modal--visible");
      setTimeout(() => { modal.hidden = true; }, 300);
    },

    openSensorModal(type) {
      const titles = {
        temperature: "Temperature History",
        waste: "Waste Reduction",
        air: "Air Quality (Raw vs Filtered)",
      };
      UI.text("sensorModalTitle", titles[type] || "Sensor Data");
      this.openModal("sensorModal");

      setTimeout(() => {
        const ctx = document.getElementById("sensorModalChart");
        if (!ctx) return;
        if (this.sensorChart) this.sensorChart.destroy();

        let datasets = [];
        let yMax = 100;

        if (type === "temperature") {
          datasets = [{
            label: "Temperature (°C)",
            data: [...SimEngine.history.temp],
            borderColor: "#f97316",
            backgroundColor: "rgba(249, 115, 22, 0.08)",
            fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
          }];
          yMax = 1000;
          const cv = document.getElementById("sensorModalValue");
          if (cv) cv.textContent = "Current: " + Math.round(SimEngine.data.reactorTemp) + "°C";
        } else if (type === "waste") {
          datasets = [{
            label: "Waste Remaining (g)",
            data: Array.from({ length: 30 }, (_, i) => {
              const pct = i / 29;
              return Math.round(SimEngine.data.wasteInitial * (1 - pct * 0.85));
            }),
            borderColor: "#22c55e",
            backgroundColor: "rgba(34, 197, 94, 0.08)",
            fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
          }];
          yMax = SimEngine.data.wasteInitial || 2500;
        } else if (type === "air") {
          datasets = [
            {
              label: "Raw Smoke (PPM)",
              data: [...SimEngine.history.aqiRaw],
              borderColor: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.05)",
              fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5,
            },
            {
              label: "Filtered Air (AQI)",
              data: [...SimEngine.history.aqiFiltered],
              borderColor: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.05)",
              fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5,
            },
          ];
          yMax = 1000;
        }

        this.sensorChart = new Chart(ctx, {
          type: "line",
          data: { labels: Array(30).fill(""), datasets },
          options: chartOptions(yMax, false, type === "air"),
        });
      }, 100);
    },

    openPowerModal() {
      this.openModal("powerModal");
      setTimeout(() => {
        const ctx = document.getElementById("powerModalChart");
        if (!ctx) return;
        if (this.powerModalChart) this.powerModalChart.destroy();
        this.powerModalChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: Array(30).fill(""),
            datasets: [{
              data: [...SimEngine.history.power],
              borderColor: "#facc15", backgroundColor: "rgba(250, 204, 21, 0.08)",
              fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
            }],
          },
          options: chartOptions(20),
        });
      }, 100);
    },
  };

  function chartOptions(yMax, showGrid = false, showYAxis = false) {
    const isLight = document.documentElement.classList.contains("light-mode");
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true, mode: "index", intersect: false } },
      elements: { line: { tension: 0.4 }, point: { radius: 0, hoverRadius: 4 } },
      scales: {
        x: { display: false },
        y: {
          display: showYAxis,
          max: yMax,
          min: 0,
          grid: { display: showGrid, color: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)" },
          ticks: { 
            color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)", 
            font: { size: 10, weight: 500 },
            stepSize: showYAxis ? yMax / 4 : undefined,
          },
        },
      },
      animation: { duration: 0 },
      interaction: { mode: "nearest", axis: "x", intersect: false },
    };
  }

  // =========================================
  //  6. DASHBOARD MODULE
  // =========================================
  const Dashboard = {
    charts: {},
    chargingFilter: "today",

    initCharts() {
      const ctxF = document.getElementById("filtrationChart");
      if (ctxF && !this.charts.filtration) {
        this.charts.filtration = new Chart(ctxF, {
          type: "line",
          data: {
            labels: Array(30).fill(""),
            datasets: [
              {
                borderColor: "#ef4444", borderWidth: 1.5,
                data: [...SimEngine.history.aqiRaw],
                fill: true, backgroundColor: "rgba(239, 68, 68, 0.04)",
                tension: 0.4, pointRadius: 0,
              },
              {
                borderColor: "#22c55e", borderWidth: 1.5,
                data: [...SimEngine.history.aqiFiltered],
                fill: true, backgroundColor: "rgba(34, 197, 94, 0.04)",
                tension: 0.4, pointRadius: 0,
              },
            ],
          },
          options: chartOptions(1000, false, true),
        });
      }

      const ctxP = document.getElementById("livePowerChart");
      if (ctxP && !this.charts.livePower) {
        this.charts.livePower = new Chart(ctxP, {
          type: "line",
          data: {
            labels: Array(30).fill(""),
            datasets: [{
              borderColor: "#facc15", borderWidth: 2,
              data: [...SimEngine.history.power],
              fill: "origin", backgroundColor: "rgba(250, 204, 21, 0.08)",
              tension: 0.4, pointRadius: 0,
            }],
          },
          options: chartOptions(20),
        });
      }
    },

    updateCharts() {
      if (this.charts.filtration) {
        this.charts.filtration.data.datasets[0].data = [...SimEngine.history.aqiRaw];
        this.charts.filtration.data.datasets[1].data = [...SimEngine.history.aqiFiltered];
        this.charts.filtration.update("none");
      }
      if (this.charts.livePower) {
        this.charts.livePower.data.datasets[0].data = [...SimEngine.history.power];
        this.charts.livePower.update("none");
      }
      // Update power modal chart if open
      if (App.powerModalChart) {
        App.powerModalChart.data.datasets[0].data = [...SimEngine.history.power];
        App.powerModalChart.update("none");
      }
    },

    toggleSession() {
      if (SessionController.state.currentPhase === "IDLE") {
        Navigation.switchScreen(3);
      } else {
        Navigation.switchScreen(3);
      }
    },

    setChargingFilter(range, btn) {
      this.chargingFilter = range;
      document.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
      if (btn) btn.classList.add("active");
      SimEngine.updateChargingUI();
    },

    openBatteryDetail(type) {
      const d = SimEngine.data;
      const isInternal = type === "internal";
      UI.text("batteryModalTitle", (isInternal ? "Internal" : "Secondary") + " Battery");
      UI.text("batteryDetailPct", Math.round(isInternal ? d.batteryInternal : d.batterySecondary) + "%");
      UI.text("batteryDetailVolt", (isInternal ? d.voltageInternal : d.voltageSecondary) + "V");
      UI.text("batteryDetailStatus", isInternal ? d.batteryInternalTrend : d.batterySecondaryTrend);
      UI.text("batteryDetailHealth", Math.floor(95 + Math.random() * 5) + "%");

      const pct = isInternal ? d.batteryInternal : d.batterySecondary;
      const eta = pct < 100 ? Math.floor((100 - pct) / 0.1 * 1.5 / 60) + "h " + Math.floor(Math.random() * 59) + "m" : "Full";
      UI.text("batteryDetailETA", eta);

      App.openModal("batteryDetailModal");

      setTimeout(() => {
        const ctx = document.getElementById("batteryDetailChart");
        if (!ctx) return;
        if (App.batteryDetailChart) App.batteryDetailChart.destroy();
        const history = isInternal ? SimEngine.history.batteryInternal : SimEngine.history.batterySecondary;
        App.batteryDetailChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: Array(30).fill(""),
            datasets: [{
              data: [...history],
              borderColor: isInternal ? "#22c55e" : "#3b82f6",
              backgroundColor: isInternal ? "rgba(34,197,94,0.08)" : "rgba(59,130,246,0.08)",
              fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
            }],
          },
          options: chartOptions(100),
        });
      }, 100);
    },

    openStatDetail(type) {
      const titles = { sessions: "Sessions", energy: "Energy Generated", waste: "Waste Processed", co2: "CO₂ Prevented" };
      const units = { sessions: "", energy: " Wh", waste: " kg", co2: " kg" };
      UI.text("statModalTitle", titles[type] || "Detail");

      const d = SimEngine.data;
      let today, week, month;
      switch (type) {
        case "sessions":
          today = 3; week = 12; month = 47; break;
        case "energy":
          today = Math.round(d.energyToday + 156);
          week = Math.round(d.energyWeek + d.energyToday);
          month = Math.round(d.energyMonth + d.energyToday);
          break;
        case "waste":
          today = +(d.totalWasteProcessed + d.wasteBurned / 1000).toFixed(1);
          week = +(today * 3.2).toFixed(1);
          month = +(today * 12).toFixed(1);
          break;
        case "co2":
          today = +(d.co2Prevented + (d.wasteBurned / 1000) * 1.2).toFixed(1);
          week = +(today * 3).toFixed(1);
          month = +(today * 11).toFixed(1);
          break;
      }
      UI.text("statDetailToday", today + (units[type] || ""));
      UI.text("statDetailWeek", week + (units[type] || ""));
      UI.text("statDetailMonth", month + (units[type] || ""));

      App.openModal("statDetailModal");

      setTimeout(() => {
        const ctx = document.getElementById("statDetailChart");
        if (!ctx) return;
        if (App.statDetailChart) App.statDetailChart.destroy();
        App.statDetailChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            datasets: [{
              data: Array.from({ length: 7 }, () => Math.round(today * (0.5 + Math.random()))),
              backgroundColor: "rgba(64, 138, 113, 0.3)",
              borderColor: "#408a71",
              borderWidth: 1, borderRadius: 4,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: "rgba(255,255,255,0.3)", font: { size: 9 } } },
              y: { display: false },
            },
            animation: { duration: 600 },
          },
        });
      }, 100);
    },

    updateDashboardSessionUI() {
      const phase = SessionController.state.currentPhase;
      const phases = ["load", "heat", "burn", "cool", "done"];
      const phaseMap = { LOADING: 0, HEATING: 1, BURNING: 2, COOLING: 3, DONE: 4 };
      const currentIdx = phaseMap[phase] ?? -1;

      // Phase indicators
      phases.forEach((p, i) => {
        const item = document.getElementById("phase-" + p);
        if (!item) return;
        item.classList.remove("active", "completed");
        if (i < currentIdx) item.classList.add("completed");
        else if (i === currentIdx) item.classList.add("active");
      });

      // Connector lines
      for (let i = 1; i <= 4; i++) {
        const line = document.getElementById("phase-line-" + i);
        if (line) line.style.width = (i <= currentIdx ? "100%" : "0%");
      }

      // Phase name
      const names = { IDLE: "No Active Session", LOADING: "Loading Waste", HEATING: "Pre-Heating", BURNING: "Burning Active", COOLING: "Cooling Down", DONE: "Session Complete" };
      UI.text("currentPhaseName", names[phase] || "IDLE");

      // Progress bar
      const progressMap = { IDLE: 0, LOADING: 10, HEATING: 25, BURNING: 60, COOLING: 85, DONE: 100 };
      UI.width("sessionProgressBar", (progressMap[phase] || 0) + "%");

      // Status icon
      const iconMap = { IDLE: "bi-hourglass-split", LOADING: "bi-box-seam", HEATING: "bi-thermometer-sun", BURNING: "bi-fire", COOLING: "bi-snow", DONE: "bi-check-circle-fill" };
      const iconEl = document.getElementById("sessionStatusIcon");
      if (iconEl) iconEl.className = "bi " + (iconMap[phase] || "bi-hourglass-split");

      // Buttons
      const isActive = phase !== "IDLE" && phase !== "DONE";
      UI.visible("startSessionBtn", !isActive);
      UI.visible("viewDetailsBtn", isActive);
      UI.visible("activeSessionData", isActive);

      // Session card border color
      const card = document.getElementById("sessionStatusCard");
      if (card) {
        card.style.borderLeftColor = phase === "BURNING" ? "#ef4444" :
          phase === "DONE" ? "#22c55e" : "#f97316";
      }
    },
  };

  // =========================================
  //  7. SESSION CONTROLLER
  // =========================================
  const SessionController = {
    state: {
      currentStep: 0,
      currentPhase: "IDLE",
      canGoBack: false,
      sessionLocked: false,
    },
    weightInterval: null,

    startSession() {
      this.state.currentStep = 1;
      this.state.currentPhase = "LOADING";
      SimEngine.data.reactorPhase = "LOADING";
      UI.visible("panel-welcome", false);
      UI.visible("panel-stepper", true);
      UI.visible("session-summary-dashboard", false);
      this.showStep(1);
      SimEngine.startSessionTimer();
      Dashboard.updateDashboardSessionUI();
      this.simulateWeightDetection();
      SimEngine.data.wasteType = null;
      Toast.show("🔥 Session started — Add waste to reactor");
      haptic([50, 30, 50]);
    },

    simulateWeightDetection() {
      let w = 0;
      const target = randomRange(1.2, 2.8);
      if (this.weightInterval) clearInterval(this.weightInterval);

      this.weightInterval = setInterval(() => {
        if (this.state.currentStep !== 1) { clearInterval(this.weightInterval); return; }
        w += randomRange(0.02, 0.08);
        w = Math.min(w, target);
        UI.text("session-weight", w.toFixed(2));

        if (w > 0.3) {
          const ind = document.getElementById("weight-indicator");
          const stat = document.getElementById("weight-status");
          if (ind) ind.className = "status-dot status-dot--green pulse-dot";
          if (stat) { stat.textContent = "Waste detected!"; stat.className = "status-text eco-text"; }
        }

        if (w >= target) {
          clearInterval(this.weightInterval);
          const stat = document.getElementById("weight-status");
          if (stat) stat.textContent = "Ready to confirm";
        }
      }, 150);
    },

    confirmInitialWeight() {
      const w = parseFloat(document.getElementById("session-weight")?.textContent || "0");
      if (w < 0.3) { Toast.show("⚠️ Add more waste before confirming"); return; }

      const grams = Math.round(w * 1000);
      SimEngine.data.wasteInitial = grams;
      SimEngine.data.wasteRemaining = grams;
      SimEngine.data.wasteBurned = 0;
      SimEngine.data.energyAccumulated = 0;

      this.state.currentStep = 2;
      this.state.currentPhase = "HEATING";
      SimEngine.data.reactorPhase = "HEATING";
      this.showStep(2);
      Dashboard.updateDashboardSessionUI();

      UI.text("step2-initial", w.toFixed(1) + " kg");
      Toast.show("✅ Weight confirmed: " + w.toFixed(2) + " kg");
      haptic(20);

      this.state.canGoBack = true;
      UI.visible("btn-back-to-step1", true);
    },

    goBackToStep1() {
      if (this.state.sessionLocked) {
        Toast.show("🔒 Session locked - Cannot add waste during burning");
        return;
      }
      if (this.state.currentStep >= 3) {
        Toast.show("⚠️ Cannot go back after ignition");
        return;
      }
      this.state.currentStep = 1;
      this.state.currentPhase = "LOADING";
      SimEngine.data.reactorPhase = "LOADING";
      this.state.canGoBack = false;
      UI.visible("btn-back-to-step1", false);
      this.showStep(1);
      this.simulateWeightDetection();
      Toast.show("↩️ Returned to Step 1");
      haptic([30, 20, 30]);
    },

    proceedToStep3() {
      if (SimEngine.data.reactorTemp < 40) {
        Toast.show("⚠️ Wait for 40°C before igniting");
        return;
      }
      this.state.currentStep = 3;
      this.state.currentPhase = "BURNING";
      this.state.canGoBack = false;
      this.state.sessionLocked = true;
      UI.visible("btn-back-to-step1", false);
      this.showStep(3);
      Dashboard.updateDashboardSessionUI();
      UI.visible("session-lock-indicator", true);
      this.startWasteClassification();
      SimEngine.data.reactorPhase = "BURNING";
      Toast.show("🔥 Ignition! Burning in progress...");
      haptic([100, 50, 100]);
    },

    startWasteClassification() {
      const wasteTypeEl = document.getElementById("waste-type-value");
      if (!wasteTypeEl) return;
      
      wasteTypeEl.textContent = "Analyzing...";
      wasteTypeEl.classList.remove("result");
      
      const wasteTypes = ["Paper", "Plastic", "Mixed"];
      
      setTimeout(() => {
        const randomType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
        if (wasteTypeEl) {
          wasteTypeEl.textContent = randomType;
          wasteTypeEl.classList.add("result");
        }
        SimEngine.data.wasteType = randomType;
      }, 5000);
    },

    checkBurnComplete() {
      if (this.state.currentPhase === "BURNING" &&
        SimEngine.data.wasteRemaining < SimEngine.data.wasteInitial * 0.12) {
        this.state.currentStep = 4;
        this.state.currentPhase = "COOLING";
        SimEngine.data.reactorPhase = "COOLING";
        this.showStep(4);
        Dashboard.updateDashboardSessionUI();
        this.showFinalizeData();
        this.startCooldown();
        Toast.show("🌡️ Burn complete — Cooling down...");
      }
    },

    showFinalizeData() {
      const d = SimEngine.data;
      UI.text("calc-initial", (d.wasteInitial / 1000).toFixed(2) + " kg");
      UI.text("calc-final", (d.wasteRemaining / 1000).toFixed(2) + " kg");
      UI.text("calc-burned", (d.wasteBurned / 1000).toFixed(2) + " kg");
    },

    startCooldown() {
      let timeLeft = 12;
      const interval = setInterval(() => {
        timeLeft--;
        UI.text("smoke-clear-timer", `Fan running — ${timeLeft}s remaining`);
        if (timeLeft <= 0) {
          clearInterval(interval);
          this.state.currentStep = 5;
          this.state.currentPhase = "DONE";
          this.state.sessionLocked = false;
          UI.visible("session-lock-indicator", false);
          this.showStep(5);
          Dashboard.updateDashboardSessionUI();
          SimEngine.stopSessionTimer();
          this.showSummary();
          Toast.show("🎉 Session complete!");
          haptic([50, 100, 50, 100, 50]);
        }
      }, 1000);
    },

    showSummary() {
      const d = SimEngine.data;
      const burned = d.wasteBurned;
      const burnedKg = burned / 1000;
      const energy = Math.round(d.energyAccumulated);
      const co2 = (burnedKg * 1.2).toFixed(2);
      const efficiency = d.wasteInitial > 0 ? (burned / d.wasteInitial) * 100 : 0;
      const grade = efficiency > 80 ? "A" : efficiency > 65 ? "B" : efficiency > 50 ? "C" : "D";

      UI.text("summary-initial", (d.wasteInitial / 1000).toFixed(2) + " kg");
      UI.text("summary-residue", (d.wasteRemaining / 1000).toFixed(2) + " kg");
      UI.text("summary-burned", burnedKg.toFixed(2) + " kg");
      UI.text("summary-energy", energy + " Wh");
      UI.text("summary-co2", co2 + " kg");
      UI.text("summary-grade", grade);
      UI.text("summary-waste-type", d.wasteType || "Unknown");

      UI.visible("session-summary-dashboard", true);
      UI.text("dash-summary-weight", (d.wasteInitial / 1000).toFixed(2) + " kg");
      UI.text("dash-summary-energy", energy + " Wh");
      UI.text("dash-summary-burned", burnedKg.toFixed(2) + " kg");
      UI.text("dash-summary-type", d.wasteType || "Unknown");

      const gradeWrap = document.getElementById("summary-grade-wrap");
      if (gradeWrap) {
        gradeWrap.style.borderColor = grade === "A" ? "#22c55e" : grade === "B" ? "#facc15" : grade === "C" ? "#f97316" : "#ef4444";
        const gradeEl = document.getElementById("summary-grade");
        if (gradeEl) gradeEl.style.color = gradeWrap.style.borderColor;
      }

      AlertSystem.add("info", "Session Complete",
        `Grade: ${grade} · ${energy} Wh generated · ${burnedKg.toFixed(1)} kg burned.`);
    },

    finishSession() {
      const d = SimEngine.data;
      const grade = document.getElementById("summary-grade")?.textContent || "B";
      const energy = Math.round(d.energyAccumulated);
      const wasteKg = (d.wasteInitial / 1000).toFixed(1);

      Reports.addSession({
        id: "EP-" + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        grade: grade,
        energy: energy,
        waste: wasteKg,
        wasteType: d.wasteType || "Mixed",
        temp: Math.round(850 + Math.random() * 100),
        smokeBefore: Math.round(350 + Math.random() * 200),
        smokeAfter: Math.round(20 + Math.random() * 40),
      });

      d.sessionsTotal++;
      d.totalWasteProcessed += d.wasteBurned / 1000;
      d.co2Prevented += (d.wasteBurned / 1000) * 1.2;

      // Reset
      this.state.currentPhase = "IDLE";
      this.state.currentStep = 0;
      d.reactorPhase = "IDLE";
      d.wasteInitial = 0;
      d.wasteRemaining = 0;
      d.wasteBurned = 0;
      d.energyAccumulated = 0;

      UI.visible("panel-welcome", true);
      UI.visible("panel-stepper", false);
      Dashboard.updateDashboardSessionUI();
      Navigation.switchScreen(1);
      Toast.show("✨ Session saved! Ready for next burn.");
      haptic(20);
    },

    showStep(step) {
      for (let i = 1; i <= 5; i++) {
        UI.visible("step-panel-" + i, i === step);
        const icon = document.getElementById("step-icon-" + i);
        if (icon) {
          icon.classList.remove("active", "completed");
          if (i < step) icon.classList.add("completed");
          else if (i === step) icon.classList.add("active");
        }
      }
      UI.width("stepper-progress", (step / 5) * 100 + "%");
      UI.text("stepper-status", "STEP " + step + " OF 5");
    },

    updateControlUI() {
      const d = SimEngine.data;
      if (this.state.currentStep === 2) {
        UI.text("current-temp-step2", Math.round(d.reactorTemp) + "°C");
        
        if (d.reactorTemp >= 40) {
          Toast.show("Temperature reached 40°C - Auto-advancing to Burning!");
          this.state.currentStep = 3;
          this.state.currentPhase = "BURNING";
          this.state.canGoBack = false;
          this.state.sessionLocked = true;
          UI.visible("btn-back-to-step1", false);
          this.showStep(3);
          Dashboard.updateDashboardSessionUI();
          UI.visible("session-lock-indicator", true);
          this.startWasteClassification();
          SimEngine.data.reactorPhase = "BURNING";
          haptic([100, 50, 100]);
          return;
        }
        
        const ready = d.reactorTemp >= 40;
        const btn = document.getElementById("btn-ignite");
        if (btn) {
          btn.disabled = !ready;
          btn.style.opacity = ready ? "1" : "0.5";
        }
        const stat = document.getElementById("temp-status-step2");
        const ind = document.getElementById("temp-indicator-step2");
        if (stat) {
          stat.textContent = ready ? "Ready to ignite!" : "Warming up... " + Math.round(d.reactorTemp) + "°C";
          stat.className = ready ? "status-text eco-text" : "status-text orange-text";
        }
        if (ind) ind.className = ready ? "status-dot status-dot--green pulse-dot" : "status-dot status-dot--orange pulse-dot";
      }

      if (this.state.currentStep === 3) {
        UI.text("step3-temp", Math.round(d.reactorTemp) + "°C");
        UI.text("step3-current", Math.round(d.wasteRemaining) + "g");
        UI.text("step3-power", d.powerOutput.toFixed(1) + "W");
        UI.text("step3-battery", Math.round(d.batteryInternal) + "%");

        const burnPct = d.wasteInitial > 0 ? (d.wasteBurned / d.wasteInitial) * 100 : 0;
        UI.width("burn-progress", burnPct + "%");
        UI.text("step3-burned", Math.round(d.wasteBurned) + "g burned");
        UI.text("burned-weight", Math.round(d.wasteBurned) + "g of " + Math.round(d.wasteInitial) + "g");

        this.checkBurnComplete();
      }
    },
  };

  // =========================================
  //  8. ANALYTICS MODULE
  // =========================================
  const Analytics = {
    chart: null,
    initialized: false,

    init() {
      this.renderDistribution();
      this.renderTrend();
      this.updateComparison();
      if (!this.initialized) {
        this.generatePrediction();
        this.initialized = true;
      }
    },

    renderDistribution() {
      const container = document.getElementById("waste-dist-container");
      if (!container) return;
      const grades = [
        { label: "Grade A — High Density Biomass", pct: 48, color: "#22c55e" },
        { label: "Grade B — Mixed Organic Waste", pct: 28, color: "#facc15" },
        { label: "Grade C — Low Energy Paper/Card", pct: 16, color: "#f97316" },
        { label: "Grade D — Wet/Damp Material", pct: 8, color: "#ef4444" },
      ];

      container.innerHTML = grades.map((g) => `
        <div class="dist-bar-item">
          <div class="flex-between">
            <span style="color: ${g.color}; font-weight: 700;">${g.label}</span>
            <span style="color: ${g.color}; font-weight: 800;">${g.pct}%</span>
          </div>
          <div class="dist-bar-bg">
            <div class="dist-bar-fill" style="width: 0%; background: ${g.color};"></div>
          </div>
        </div>
      `).join("");

      // Animate bars
      setTimeout(() => {
        container.querySelectorAll(".dist-bar-fill").forEach((bar, i) => {
          setTimeout(() => { bar.style.width = grades[i].pct + "%"; }, i * 120);
        });
      }, 100);
    },

    renderTrend() {
      const ctx = document.getElementById("energyTrendChart");
      if (!ctx) return;
      if (this.chart) this.chart.destroy();
      const isLight = document.documentElement.classList.contains("light-mode");

      const data = Array.from({ length: 7 }, () => Math.round(randomRange(80, 220)));
      this.chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          datasets: [{
            label: "Wh",
            data: data,
            backgroundColor: isLight ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.3)",
            borderColor: "#22c55e",
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: "rgba(34, 197, 94, 0.5)",
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => ctx.parsed.y + " Wh" } },
          },
          scales: {
            y: {
              grid: { color: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)" },
              ticks: { color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)", font: { size: 9 } },
            },
            x: {
              grid: { display: false },
              ticks: { color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)", font: { size: 10, weight: "bold" } },
            },
          },
          animation: { duration: 800, easing: "easeOutQuart" },
        },
      });
    },

    updateComparison() {
      const thisMonth = Math.round(SimEngine.data.energyMonth + SimEngine.data.energyToday);
      const lastMonth = 980;
      const change = ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1);

      UI.text("comp-this-month", thisMonth.toLocaleString());
      UI.text("comp-last-month", lastMonth.toLocaleString());

      const trend = document.getElementById("comp-trend");
      if (trend) {
        const isUp = change > 0;
        trend.className = "trend-indicator " + (isUp ? "up" : "down");
        trend.innerHTML = `<i class="bi bi-arrow-${isUp ? "up" : "down"}-right"></i> <span>${isUp ? "+" : ""}${change}% vs last month</span>`;
      }
    },

    generatePrediction() {
      const types = ["Paper", "Plastic", "Mixed"];
      
      const wasteTypeCounts = {};
      Reports.data.forEach(session => {
        const type = session.wasteType || "Mixed";
        wasteTypeCounts[type] = (wasteTypeCounts[type] || 0) + 1;
      });
      
      let predictedType = types[Math.floor(Math.random() * types.length)];
      let maxCount = 0;
      for (const type in wasteTypeCounts) {
        if (wasteTypeCounts[type] > maxCount) {
          maxCount = wasteTypeCounts[type];
          predictedType = type;
        }
      }
      
      const times = [35, 40, 45, 50, 55, 60];
      const avgEnergy = Reports.data.length > 0 
        ? Reports.data.reduce((sum, s) => sum + s.energy, 0) / Reports.data.length 
        : 35;
      
      const confidence = Math.min(95, 65 + (Reports.data.length * 3));
      
      UI.text("pred-waste-type", predictedType);
      UI.text("pred-time", times[Math.floor(Math.random() * times.length)] + "m");
      UI.text("pred-energy", Math.round(avgEnergy + randomRange(-10, 10)) + " Wh");
      UI.text("pred-confidence", Math.round(confidence) + "%");
      Toast.show("🤖 Prediction refreshed");
    },

    updateRange(val) {
      this.renderTrend();
      this.updateComparison();
      Toast.show("📊 Updated to: " + val);
    },
  };

  // =========================================
  //  9. ALERT SYSTEM
  // =========================================
  const AlertSystem = {
    alerts: [
      { type: "info", title: "System Online", msg: "Core monitoring services started successfully.", time: Date.now() - 600000, read: false },
      { type: "warning", title: "High Temp Recorded", msg: "Reactor reached 870°C during last session.", time: Date.now() - 3600000, read: false },
      { type: "critical", title: "Battery Low", msg: "Internal battery dropped to 12% during peak load.", time: Date.now() - 7200000, read: false },
    ],
    currentFilter: "all",

    add(type, title, msg) {
      this.alerts.unshift({
        type, title, msg,
        time: Date.now(),
        read: false,
      });
      if (this.alerts.length > 50) this.alerts.pop();
      this.updateBadges();
      if (Navigation.current === 4) this.refresh();
      haptic([80, 30, 80]);
    },

    refresh() {
      this.renderAlerts(this.currentFilter);
      this.updateBadges();
    },

    renderAlerts(filter = "all") {
      this.currentFilter = filter;
      const container = document.getElementById("alerts-container");
      const emptyEl = document.getElementById("alerts-empty");
      if (!container) return;

      const filtered = filter === "all"
        ? this.alerts
        : this.alerts.filter((a) => a.type === filter);

      if (filtered.length === 0) {
        container.innerHTML = "";
        if (emptyEl) emptyEl.hidden = false;
        return;
      }
      if (emptyEl) emptyEl.hidden = true;

      container.innerHTML = filtered.map((alert, idx) => {
        const icons = {
          critical: "bi-exclamation-triangle-fill",
          warning: "bi-exclamation-circle-fill",
          info: "bi-check-circle-fill",
        };
        const colors = { critical: "#ef4444", warning: "#f97316", info: "#22c55e" };
        const timeAgo = this.getTimeAgo(alert.time);

        return `
          <div class="alert-card ${alert.type}" data-idx="${idx}" onclick="AlertSystem.removeByIndex(${idx})">
            <div class="alert-card__header">
              <div style="display:flex; align-items:center; gap:6px;">
                <i class="bi ${icons[alert.type]}" style="color:${colors[alert.type]}; font-size:14px;"></i>
                <span class="tiny-label" style="color:${colors[alert.type]}">${alert.type.toUpperCase()}</span>
              </div>
              <span class="alert-card__time">${timeAgo}</span>
            </div>
            <h4 class="alert-card__title">${alert.title}</h4>
            <p class="alert-card__msg">${alert.msg}</p>
          </div>
        `;
      }).join("");
    },

    filterAlerts(type, btn) {
      this.currentFilter = type;
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      if (btn) btn.classList.add("active");
      this.renderAlerts(type);
    },

    removeByIndex(idx) {
      this.alerts.splice(idx, 1);
      this.refresh();
      Toast.show("Alert dismissed");
    },

    markAllRead() {
      this.alerts = [];
      this.refresh();
      Toast.show("✅ All alerts cleared");
    },

    updateBadges() {
      const counts = {
        all: this.alerts.length,
        critical: this.alerts.filter((a) => a.type === "critical").length,
        warning: this.alerts.filter((a) => a.type === "warning").length,
        info: this.alerts.filter((a) => a.type === "info").length,
      };

      UI.text("alert-count-all", counts.all);
      UI.text("alert-count-critical", counts.critical);
      UI.text("alert-count-warning", counts.warning);
      UI.text("alert-count-info", counts.info);

      const unread = document.getElementById("unreadBadge");
      if (unread) unread.textContent = counts.all + " active";

      // Notification dot
      const dot = document.getElementById("notificationDot");
      if (dot) dot.style.display = counts.all > 0 ? "block" : "none";
    },

    getTimeAgo(timestamp) {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      if (seconds < 30) return "Just now";
      if (seconds < 60) return seconds + "s ago";
      if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
      if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
      return Math.floor(seconds / 86400) + "d ago";
    },
  };

  // =========================================
  //  10. REPORTS MODULE
  // =========================================
  const Reports = {
    data: [
      { id: "EP-4210", date: "Mar 29, 2026", grade: "A", energy: 42, waste: "2.4", wasteType: "Paper", temp: 860, smokeBefore: 420, smokeAfter: 38 },
      { id: "EP-4209", date: "Mar 29, 2026", grade: "B", energy: 35, waste: "1.8", wasteType: "Plastic", temp: 780, smokeBefore: 380, smokeAfter: 45 },
      { id: "EP-4208", date: "Mar 28, 2026", grade: "A", energy: 45, waste: "2.5", wasteType: "Mixed", temp: 890, smokeBefore: 450, smokeAfter: 32 },
      { id: "EP-4207", date: "Mar 28, 2026", grade: "C", energy: 18, waste: "1.2", wasteType: "Plastic", temp: 650, smokeBefore: 550, smokeAfter: 62 },
      { id: "EP-4206", date: "Mar 27, 2026", grade: "A", energy: 48, waste: "2.6", wasteType: "Paper", temp: 910, smokeBefore: 400, smokeAfter: 28 },
      { id: "EP-4205", date: "Mar 27, 2026", grade: "B", energy: 30, waste: "1.5", wasteType: "Mixed", temp: 740, smokeBefore: 360, smokeAfter: 50 },
    ],
    filteredData: [],
    searchQuery: "",

    addSession(session) {
      this.data.unshift(session);
    },

    init() {
      this.filteredData = [...this.data];
      this.render();
      this.updateStats();
    },

    render() {
      const list = document.getElementById("reports-list");
      const noResults = document.getElementById("no-results");
      const countEl = document.getElementById("sessions-count");
      if (!list) return;

      const data = this.searchQuery
        ? this.filteredData.filter((d) =>
          d.id.toLowerCase().includes(this.searchQuery) ||
          d.grade.toLowerCase().includes(this.searchQuery))
        : this.filteredData;

      if (countEl) countEl.textContent = data.length + " session" + (data.length !== 1 ? "s" : "");

      if (data.length === 0) {
        list.innerHTML = "";
        if (noResults) noResults.hidden = false;
        return;
      }
      if (noResults) noResults.hidden = true;

      list.innerHTML = data.map((item, idx) => `
        <div class="report-item tappable" onclick="Reports.openDetail(${idx})">
          <div class="report-grade grade-${item.grade}">${item.grade}</div>
          <div class="report-info">
            <div class="report-info__top">
              <span class="report-id">${item.id}</span>
              <span class="report-date">${item.date}</span>
            </div>
            <div class="report-stats">
              <span class="report-stat-item">
                <i class="bi bi-lightning-fill" style="color:#facc15;"></i> ${item.energy} Wh
              </span>
              <span class="report-stat-item">
                <i class="bi bi-trash3-fill" style="color:#22c55e;"></i> ${item.waste} kg
              </span>
              <span class="report-stat-item">
                <i class="bi bi-thermometer-half" style="color:#f97316;"></i> ${item.temp || '--'}°C
              </span>
            </div>
          </div>
          <i class="bi bi-chevron-right" style="color:var(--color-text-dim);"></i>
        </div>
      `).join("");
    },

    updateStats() {
      const data = this.filteredData;
      UI.text("report-stat-sessions", data.length);
      UI.html("report-stat-energy", data.reduce((s, d) => s + d.energy, 0) + "<small>Wh</small>");
      UI.html("report-stat-waste", data.reduce((s, d) => s + parseFloat(d.waste), 0).toFixed(1) + "<small>kg</small>");
      const grades = data.map((d) => d.grade);
      const avgGrade = grades.length > 0 ? (grades.includes("A") ? "A" : grades.includes("B") ? "B" : "C") : "--";
      UI.text("report-stat-grade", avgGrade);
    },

    openDetail(idx) {
      const data = this.searchQuery
        ? this.filteredData.filter((d) =>
          d.id.toLowerCase().includes(this.searchQuery) ||
          d.grade.toLowerCase().includes(this.searchQuery))
        : this.filteredData;

      const item = data[idx];
      if (!item) return;

      UI.text("detail-title", item.id);
      UI.text("detail-date", item.date);
      UI.text("detail-battery", Math.round(randomRange(60, 95)) + "%");
      UI.text("detail-smoke", (item.smokeAfter || 45) + " PPM");
      UI.text("detail-temp", (item.temp || 850) + "°C");
      UI.text("detail-energy", item.energy + " Wh");
      UI.text("detail-initial", item.waste + " kg");

      const finalWaste = (parseFloat(item.waste) * (1 - randomRange(0.7, 0.9))).toFixed(1);
      UI.text("detail-final", finalWaste + " kg");
      UI.text("detail-reduction", Math.round((1 - finalWaste / parseFloat(item.waste)) * 100) + "%");
      UI.text("detail-burned", (parseFloat(item.waste) - parseFloat(finalWaste)).toFixed(1) + " kg");
      UI.text("detail-smoke-before", (item.smokeBefore || 450) + " PPM");
      UI.text("detail-smoke-after", (item.smokeAfter || 45) + " PPM");

      const gradeBadge = document.getElementById("detail-grade-badge");
      if (gradeBadge) {
        gradeBadge.textContent = item.grade;
        gradeBadge.className = "report-grade grade-" + item.grade;
      }

      App.openModal("sessionDetailModal");

      // Render mini charts
      setTimeout(() => {
        this.renderDetailCharts(item);
      }, 150);
    },

    renderDetailCharts(item) {
      // Waste chart
      const wCtx = document.getElementById("detail-waste-chart");
      if (wCtx) {
        if (App.detailWasteChart) App.detailWasteChart.destroy();
        const initial = parseFloat(item.waste) * 1000;
        App.detailWasteChart = new Chart(wCtx, {
          type: "line",
          data: {
            labels: Array(15).fill(""),
            datasets: [{
              data: Array.from({ length: 15 }, (_, i) => Math.round(initial * (1 - (i / 14) * 0.85))),
              borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)",
              fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5,
            }],
          },
          options: chartOptions(initial),
        });
      }

      // Temp chart
      const tCtx = document.getElementById("detail-temp-chart");
      if (tCtx) {
        if (App.detailTempChart) App.detailTempChart.destroy();
        const tempData = [];
        let t = 25;
        for (let i = 0; i < 15; i++) {
          if (i < 4) t += randomRange(80, 150);
          else if (i < 11) t = clamp(t + randomRange(-40, 50), 600, 950);
          else t -= randomRange(50, 120);
          tempData.push(Math.max(25, Math.round(t)));
        }
        App.detailTempChart = new Chart(tCtx, {
          type: "line",
          data: {
            labels: Array(15).fill(""),
            datasets: [{
              data: tempData,
              borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.08)",
              fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5,
            }],
          },
          options: chartOptions(1000),
        });
      }
    },

    exportData(format) {
      Toast.show("📥 Exporting " + format.toUpperCase() + "...");
      setTimeout(() => Toast.show("✅ Export complete"), 1500);
    },

    exportSession(format) {
      Toast.show("📥 Exporting session " + format.toUpperCase() + "...");
      setTimeout(() => Toast.show("✅ Session exported"), 1200);
    },

    loadMore() {
      const newSessions = Array.from({ length: 3 }, (_, i) => ({
        id: "EP-" + Math.floor(4000 + Math.random() * 200),
        date: "Mar " + Math.floor(20 + Math.random() * 7) + ", 2026",
        grade: ["A", "B", "B", "C"][Math.floor(Math.random() * 4)],
        energy: Math.round(randomRange(15, 50)),
        waste: randomRange(1.0, 2.8).toFixed(1),
        temp: Math.round(randomRange(650, 920)),
        smokeBefore: Math.round(randomRange(300, 600)),
        smokeAfter: Math.round(randomRange(20, 70)),
      }));
      this.data.push(...newSessions);
      this.filteredData = [...this.data];
      this.render();
      this.updateStats();
      Toast.show("Loaded " + newSessions.length + " more sessions");
    },
  };

  const ReportsFilter = {
    setSearchQuery(q) {
      Reports.searchQuery = q.toLowerCase();
      const clearBtn = document.getElementById("clear-search");
      if (clearBtn) clearBtn.hidden = !q;
      Reports.render();
    },
    setDateFilter(val) {
      Toast.show("📅 Filtered: " + val);
      Reports.render();
    },
    clearSearch() {
      const input = document.getElementById("search-sessions");
      if (input) input.value = "";
      Reports.searchQuery = "";
      const clearBtn = document.getElementById("clear-search");
      if (clearBtn) clearBtn.hidden = true;
      Reports.render();
    },
  };

  // =========================================
  //  11. HARDWARE CONTROLS
  // =========================================
  window.ChargingMode = {
    setMode(mode) {
      SimEngine.data.chargingMode = mode;
      UI.toggleClass("mode-auto", "active", mode === "auto");
      UI.toggleClass("mode-manual", "active", mode === "manual");
      UI.visible("battery-selector", mode === "manual");
      Toast.show("Charging: " + mode.toUpperCase());
      haptic(5);
    },
    setTargetBattery(type) {
      SimEngine.data.targetBattery = type;
      UI.toggleClass("target-internal", "active", type === "internal");
      UI.toggleClass("target-secondary", "active", type === "secondary");
      Toast.show("Target: " + type + " battery");
      haptic(5);
    },
  };

  window.FanControl = {
    currentSpeed: 0,
    setSpeed(value) {
      this.currentSpeed = parseInt(value);
      UI.text("fan1-speed", value + "%");
    },
    setMode(mode) {
      SimEngine.data.fanMode = mode;
      UI.toggleClass("fan1-auto", "active", mode === "auto");
      UI.toggleClass("fan1-on", "active", mode === "on");
      UI.toggleClass("fan1-off", "active", mode === "off");

      const isOn = mode === "on" || (mode === "auto" && this.currentSpeed > 0);
      const dot = document.getElementById("fan1-dot");
      const text = document.getElementById("fan1-text");
      if (dot) dot.className = "status-dot " + (isOn ? "status-dot--green" : "status-dot--gray");
      if (text) text.textContent = isOn ? (mode === "auto" ? "Auto (" + this.currentSpeed + "%)" : "Running") : "Stopped";

      if (mode === "on") SimEngine.data.fanRunning = true;
      else if (mode === "off") SimEngine.data.fanRunning = false;
      SimEngine.updateFanUI();
      Toast.show("Filtration Fan: " + mode.toUpperCase());
      haptic(5);
    },
  };

  window.Fan2Control = {
    currentSpeed: 0,
    setSpeed(value) {
      this.currentSpeed = parseInt(value);
      UI.text("fan2-speed", value + "%");
    },
    setMode(mode) {
      UI.toggleClass("fan2-auto", "active", mode === "auto");
      UI.toggleClass("fan2-on", "active", mode === "on");
      UI.toggleClass("fan2-off", "active", mode === "off");

      const isOn = mode === "on" || (mode === "auto" && this.currentSpeed > 0);
      const dot = document.getElementById("fan2-dot");
      const text = document.getElementById("fan2-text");
      if (dot) dot.className = "status-dot " + (isOn ? "status-dot--green" : "status-dot--gray");
      if (text) text.textContent = isOn ? (mode === "auto" ? "Auto (" + this.currentSpeed + "%)" : "Running") : "Stopped";

      Toast.show("TEG Fan: " + mode.toUpperCase());
      haptic(5);
    },
  };

  window.UsbControl = {
    setEnabled(on) {
      SimEngine.data.usbEnabled = on;
      UI.toggleClass("usb-on", "active", on);
      UI.toggleClass("usb-off", "active", !on);
      const dot = document.getElementById("usb-dot");
      const text = document.getElementById("usb-text");
      if (dot) dot.className = on ? "status-dot status-dot--green pulse-dot" : "status-dot status-dot--gray";
      if (text) { text.textContent = on ? "Active" : "Inactive"; text.className = on ? "status-text eco-text" : "status-text"; }
      Toast.show("USB: " + (on ? "ENABLED" : "DISABLED"));
      haptic(5);
    },
  };

  // =========================================
  //  12. AUTH SCREEN
  // =========================================
  const AuthScreen = {
    login() {
      UI.visible("authApp", false);
      const mainApp = document.getElementById("mainApp");
      if (mainApp) {
        mainApp.hidden = false;
        void mainApp.offsetWidth;
        mainApp.classList.add("main-app--visible");
      }
      
      // Apply Role Restrictions
      RoleManager.apply();

      Navigation.switchScreen(1);
      Dashboard.initCharts();
      Toast.show("👋 Welcome to EcoPower!");
      haptic(10);
    },

    logout() {
      const mainApp = document.getElementById("mainApp");
      if (mainApp) {
        mainApp.classList.remove("main-app--visible");
        setTimeout(() => {
          mainApp.hidden = true;
          const roleSelection = document.getElementById("roleSelection");
          if (roleSelection) {
            roleSelection.hidden = false;
            void roleSelection.offsetWidth;
            roleSelection.classList.add("role-selection--visible");
          }
        }, 500);
      }
      haptic(10);
    },

    switchTab(tab) {
      const login = document.getElementById("authLoginCard");
      const signup = document.getElementById("authSignupCard");
      const otp = document.getElementById("authOtpCard");
      if (tab === "signup") {
        if (login) login.hidden = true;
        if (signup) signup.hidden = false;
        if (otp) otp.hidden = true;
      } else {
        if (login) login.hidden = false;
        if (signup) signup.hidden = true;
        if (otp) otp.hidden = true;
      }
    },

    showOtp() {
      const signup = document.getElementById("authSignupCard");
      const otp = document.getElementById("authOtpCard");
      const emailInput = document.getElementById("signupEmail");
      const display = document.getElementById("verifyEmailDisplay");
      if (signup) signup.hidden = true;
      if (otp) otp.hidden = false;
      if (display && emailInput) display.textContent = emailInput.value || "your email";
      this.initOtpInputs();
    },

    hideOtp() {
      const signup = document.getElementById("authSignupCard");
      const otp = document.getElementById("authOtpCard");
      if (signup) signup.hidden = false;
      if (otp) otp.hidden = true;
    },

    initOtpInputs() {
      const boxes = document.querySelectorAll(".otp-box");
      boxes.forEach((box, i) => {
        box.value = "";
        box.addEventListener("input", function () {
          if (this.value.length === 1 && i < boxes.length - 1) {
            boxes[i + 1].focus();
          }
        });
        box.addEventListener("keydown", function (e) {
          if (e.key === "Backspace" && !this.value && i > 0) {
            boxes[i - 1].focus();
          }
        });
      });
      if (boxes[0]) boxes[0].focus();
    },

    togglePassword(id) {
      const input = document.getElementById(id);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      const btn = input.parentElement.querySelector(".auth-toggle-pwd i");
      if (btn) btn.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
    },

    show() {
      const auth = document.getElementById("authApp");
      if (auth) {
        auth.hidden = false;
        void auth.offsetWidth;
        auth.classList.add("auth-app--visible");
      }
    },

    showLogoutModal(e) {
      if (e) e.stopPropagation();
      const dropdown = document.getElementById("profileDropdown");
      if (dropdown) dropdown.hidden = true;
      App.openModal("logoutModal");
    },

    hideLogoutModal() {
      App.closeModal("logoutModal");
    },

    executeLogout() {
      this.hideLogoutModal();
      // Reset role restrictions
      RoleManager.reset();
      setTimeout(() => this.logout(), 300);
      Toast.show("Logged out successfully");
    },
  };

  // =========================================
  //  13. SPLASH ANIMATION
  // =========================================
  const Splash = {
    brand: "EcoPower",
    timers: [],
    els: {},

    init() {
      this.els = {
        splash: document.getElementById("ecoSplash"),
        logo: document.getElementById("splashLogo"),
        glow: document.getElementById("splashGlow"),
        brandWrap: document.getElementById("splashBrand"),
        brandName: document.getElementById("splashBrandName"),
        tagline: document.getElementById("splashTagline"),
        progress: document.getElementById("splashProgress"),
        progressBar: document.getElementById("splashProgressBar"),
        auth: document.getElementById("authApp"),
      };
      if (!this.els.splash) return;
      this.buildLetters();
      this.run();
    },

    buildLetters() {
      const c = this.els.brandName;
      if (!c) return;
      c.innerHTML = "";
      this.brand.split("").forEach((ch) => {
        const s = document.createElement("span");
        s.className = "letter";
        s.textContent = ch;
        c.appendChild(s);
      });
    },

    delay(fn, ms) {
      this.timers.push(setTimeout(fn, ms));
    },

    run() {
      const { logo, glow, brandWrap, brandName, tagline, progress, progressBar } = this.els;
      const letters = brandName ? brandName.querySelectorAll(".letter") : [];

      // Background
      this.delay(() => {
        const bg = document.querySelector(".eco-splash__bg");
        if (bg) bg.classList.add("eco-splash__bg--visible");
      }, 200);

      // Logo grow
      this.delay(() => { if (logo) logo.classList.add("eco-splash__logo--grow"); }, 400);

      // Glow ring
      this.delay(() => { if (glow) glow.classList.add("eco-splash__glow-ring--visible"); }, 1000);

      // Brand letters
      this.delay(() => {
        if (brandWrap) brandWrap.classList.add("eco-splash__brand--visible");
        letters.forEach((letter, i) => {
          this.delay(() => letter.classList.add("letter--visible"), i * 75);
        });
      }, 1600);

      // Tagline
      this.delay(() => { if (tagline) tagline.classList.add("eco-splash__tagline--visible"); }, 2400);

      // Progress
      this.delay(() => {
        if (progress) progress.classList.add("eco-splash__progress--visible");
        if (progressBar) progressBar.classList.add("eco-splash__progress-bar--filling");
      }, 2600);

      // Breathing
      this.delay(() => {
        if (logo) {
          logo.classList.remove("eco-splash__logo--grow");
          logo.style.transform = "scale(1)";
          logo.style.opacity = "1";
          logo.classList.add("eco-splash__logo--breathing");
        }
      }, 2800);

      // End splash
      this.delay(() => this.hideSplash(), 4600);
    },

    hideSplash() {
      const { splash, auth } = this.els;
      if (splash) splash.classList.add("eco-splash--hidden");
      const roleSelection = document.getElementById("roleSelection");
      if (roleSelection) {
        roleSelection.hidden = false;
        void roleSelection.offsetWidth;
        roleSelection.classList.add("role-selection--visible");
      }
    },
  };

  // =========================================
  //  ROLE MANAGER
  // =========================================
  const RoleManager = {
    apply() {
      const role = AppState.userRole;
      const isCaptain = (role === "captain");
      
      console.log("Applying restrictions for role:", role);

      // 1. Navigation items
      const navItems = document.querySelectorAll(".app-nav__item");
      navItems.forEach((item) => {
        const screenIdx = parseInt(item.getAttribute("data-screen"));
        // Dashboard(1), Analytics(2), Reports(5) allowed for Captain
        // Operator has all: 1, 2, 3(Control), 4(Alerts), 5
        const allowed = !isCaptain || [1, 2, 5].includes(screenIdx);
        item.style.display = allowed ? "flex" : "none";
      });

      // 2. Dashboard restrictions for Captain (Session card)
      const sessionStatusCard = document.getElementById("sessionStatusCard");
      if (sessionStatusCard) {
        const sessionSection = sessionStatusCard.closest(".dashboard-section");
        if (sessionSection) sessionSection.style.display = isCaptain ? "none" : "block";
      }

      // 3. Dashboard restrictions for Captain (Real-time cards)
      const activeSessionData = document.getElementById("activeSessionData");
      if (activeSessionData && isCaptain) {
        activeSessionData.style.display = "none";
      }

      // 4. Notification Button
      const notificationBtn = document.getElementById("notificationBtn");
      if (notificationBtn) {
        notificationBtn.style.display = isCaptain ? "none" : "flex";
      }

      // Update initial navigation layout
      Navigation.switchScreen(1);

      ChatBot.setRole(role);
      
      // Update header title if Captain
      const headerTitle = document.querySelector(".header-title");
      if (headerTitle) {
        headerTitle.textContent = isCaptain ? "EcoPower Overseer" : "EcoPower Dashboard";
      }
    },

    reset() {
      const navItems = document.querySelectorAll(".app-nav__item");
      navItems.forEach(i => i.style.display = "flex");
      
      const sessionStatusCard = document.getElementById("sessionStatusCard");
      if (sessionStatusCard) {
        const sessionSection = sessionStatusCard.closest(".dashboard-section");
        if (sessionSection) sessionSection.style.display = "block";
      }

      const activeSessionData = document.getElementById("activeSessionData");
      if (activeSessionData) activeSessionData.style.display = "none"; // Hidden by default anyway
      
      const notificationBtn = document.getElementById("notificationBtn");
      if (notificationBtn) notificationBtn.style.display = "flex";
      
      const headerTitle = document.querySelector(".header-title");
      if (headerTitle) {
        headerTitle.textContent = "EcoPower Dashboard";
      }
    }
  };

  // =========================================
  //  ROLE SELECTION
  // =========================================
  window.RoleSelection = {
    selectRole(role) {
      haptic(8);
      AppState.userRole = role; // Store the selected role
      
      const roleSelection = document.getElementById("roleSelection");
      if (roleSelection) roleSelection.classList.remove("role-selection--visible");
      
      setTimeout(() => {
        roleSelection.hidden = true;
        AuthScreen.show();
      }, 300);
      
      console.log("Role selected:", role);
    },
  };

  // =========================================
  //  14. THEME TOGGLE
  // =========================================
  const ThemeToggle = {
    init() {
      const btn = document.getElementById("themeToggle");
      if (!btn) return;
      btn.addEventListener("click", () => {
        document.documentElement.classList.add("theme-transitioning");
        
        document.documentElement.classList.toggle("light-mode");
        const isLight = document.documentElement.classList.contains("light-mode");
        const icon = document.getElementById("themeIcon");
        if (icon) icon.className = isLight ? "bi bi-sun-fill" : "bi bi-moon-fill";
        Toast.show(isLight ? "☀️ Light mode" : "🌙 Dark mode");
        haptic(5);

        // Rebuild charts with correct theme colors
        Object.values(Dashboard.charts).forEach(c => c && c.destroy());
        Dashboard.charts = {};
        Dashboard.initCharts();
        if (Navigation.current === 2) Analytics.init();
        
        setTimeout(() => {
          document.documentElement.classList.remove("theme-transitioning");
        }, 600);
      });
    },
  };

  // =========================================
  //  15. PROFILE DROPDOWN
  // =========================================
  const ProfileDropdown = {
    init() {
      const btn = document.getElementById("profileBtn");
      const dropdown = document.getElementById("profileDropdown");
      if (!btn || !dropdown) return;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.hidden = !dropdown.hidden;
      });

      document.addEventListener("click", () => {
        dropdown.hidden = true;
      });

      dropdown.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    },
  };

  // =========================================
  //  16. CLOCK
  // =========================================
  const Clock = {
    init() {
      this.tick();
      setInterval(() => this.tick(), 1000);
    },
    tick() {
      const d = new Date();
      const el = document.getElementById("statusTime");
      if (el) el.textContent = d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
    },
  };

  // =========================================
  //  17. CHATBOT
  // =========================================
  const ChatBot = (() => {
    let fab;
    let screen;
    let messagesEl;
    let inputEl;
    let sendBtn;
    let backBtn;
    let clearBtn;
    let quickChipsEl;
    let isOpen = false;
    let isTyping = false;
    let currentRole = "operator";

    // Drag state
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let fabStartLeft = 0;
    let fabStartTop = 0;
    let hasMoved = false;

    const intents = [
      {
        id: "battery_status",
        keywords: ["battery", "charge", "drain", "voltage", "health"],
        response: (state) => {
          const batt = state.battery;
          const status = batt.charging ? "charging" : batt.discharging ? "discharging" : "standby";
          const health = batt.pct > 80 ? "Battery health looks great!" : batt.pct > 40 ? "Battery is holding up okay." : "Battery is getting low.";
          return { text: `Internal battery: ${batt.pct}% (${status}). Voltage: ${batt.voltage.toFixed(1)}V. ${health}` };
        }
      },
      {
        id: "reactor_temp",
        keywords: ["temperature", "temp", "hot", "heat"],
        response: (state) => {
          const temp = state.reactor.temp;
          let status = "";
          if (temp > 800) status = "Temperature is very high! Monitor closely.";
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
          else status = "High AQI! Check filter status.";
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
          return { text: `Phase ${current + 1}/5: ${phases[current]}. ${descriptions[current]}` };
        }
      },
      {
        id: "session_start",
        keywords: ["start", "begin", "new session", "how to start"],
        response: () => ({
          text: "To start a session: 1) Go to Control screen, 2) Make sure ESP32 is connected, 3) Add waste in Step 1, 4) Click Ignite in Step 2, 5) Monitor the burn in Step 3."
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
          return { text: "ESP32 is offline. Check: 1) Device is powered on, 2) WiFi connection, 3) Correct IP address in settings." };
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
          const power = state.power;
          if (power < 2) return { text: `Power is low at ${power.toFixed(1)}W. Tips: Use Grade A waste for maximum energy output. Ensure the reactor door is sealed tightly before starting.` };
          return { text: "System is running well! Tips for more energy: Use Grade A waste (dry leaves, paper) for highest output. Let the pre-heat phase complete fully before igniting." };
        }
      },
      {
        id: "report_summary",
        keywords: ["report", "summary", "how did i do", "this week", "stats"],
        response: (state) => {
          const stats = state.stats;
          return { text: `Today's stats: ${stats.sessions} sessions, ${stats.energy.toFixed(1)}Wh generated, ${stats.waste.toFixed(1)}g waste processed, ${stats.co2.toFixed(1)}g CO2 prevented.` };
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
          text: currentRole === "captain" 
            ? "As Barangay Captain, I can help you with: Waste management policies, Recycling tips, Machine overviews, and System analytics. Type 'recycling' or 'machine' to learn more!"
            : "I can help with: Battery status, Reactor temperature, Power output, Air quality, Session progress, ESP32 connection, Report summaries, Optimization tips. Just ask!"
        })
      },
      // CAPTAIN SPECIFIC INTENTS
      {
        id: "waste_mgmt_tips",
        keywords: ["recycling", "proper waste", "management", "resident", "citizen"],
        response: () => ({
          text: "Proper waste management starts at source! Encourage residents to: 1) Separate organic from non-organic, 2) Keep organic waste dry for EcoPower processing, 3) Avoid putting plastic in the biomass reactor. Dry organic waste increases energy yield by up to 40%!"
        })
      },
      {
        id: "machine_info",
        keywords: ["the machine", "how it works", "eco power machine", "technology"],
        response: () => ({
          text: "The EcoPower machine uses advanced Thermoelectric Generators (TEG) to convert waste heat into electricity. It performs controlled biomass burning with high-efficiency smoke filtration to ensure near-zero air pollution while powering the barangay's local grid."
        })
      },
      {
        id: "community_impact",
        keywords: ["impact", "benefit", "barangay", "residents"],
        response: () => ({
          text: "EcoPower reduces local landfill waste by up to 85% and provides sustainable energy for streetlights and charging stations. It also prevents significant CO2 emissions by controlled burning instead of open-pit fires."
        })
      }
    ];

    const quickChips = {
      "screen-dashboard": ["Battery status", "Current power", "Session status"],
      "screen-analytics": ["Best waste grade?", "Energy trend?", "AI prediction?"],
      "screen-control": ["How to start session?", "ESP32 status", "Fan control help"],
      "screen-alerts": ["Explain latest alert", "How to fix this?", "Clear all alerts"],
      "screen-reports": ["Session summary", "Best session", "Export report"],
      // Role specific chips
      "captain": ["Recycling tips", "Machine info", "Community impact", "System stats"]
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
        return { text: "I'm not sure about that. Try asking about your battery, reactor temperature, power output, or session status. Type 'help' for all options." };
      }
      return intent.response(state);
    }

    function renderMessage(text, type) {
      const msg = document.createElement("div");
      msg.className = `chat-msg chat-msg--${type}`;

      const content = document.createElement("div");
      content.textContent = text;
      msg.appendChild(content);

      if (type === "bot") {
        const time = document.createElement("span");
        time.className = "chat-msg__time";
        time.textContent = getTimestamp();
        msg.appendChild(time);
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
      
      let chips = [];
      if (currentRole === "captain") {
        chips = quickChips["captain"];
      } else {
        chips = quickChips[screenId] || quickChips["screen-dashboard"];
      }

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

        // Construct the unified state object the chatbot's intents expect
        const d = SimEngine.data;
        const s = SessionController.state;
        const state = {
          battery: {
            pct: Math.round(d.batteryInternal),
            charging: d.batteryInternalTrend === "charging",
            discharging: d.batteryInternalTrend === "draining",
            voltage: d.voltageInternal
          },
          reactor: {
            temp: Math.round(d.reactorTemp)
          },
          power: d.powerOutput,
          air: {
            raw: Math.round(d.aqiRaw),
            filtered: Math.round(d.aqiFiltered)
          },
          session: {
            active: s.currentPhase !== "IDLE" && s.currentPhase !== "DONE",
            phase: ["IDLE", "LOADING", "HEATING", "BURNING", "COOLING", "DONE"].indexOf(s.currentPhase) - 1
          },
          alerts: AlertSystem.alerts || [],
          esp32: {
            online: d.espOnline,
            ip: "192.168.1.25",
            latency: d.espLatency,
            signal: 4
          },
          fan: {
            mode: d.fanMode
          },
          stats: {
            sessions: d.sessionsTotal,
            energy: d.energyToday + 156,
            waste: d.totalWasteProcessed,
            co2: d.co2Prevented
          }
        };

        const response = getResponse(intent, state);
        renderMessage(response.text, "bot");
        updateQuickChips();
      }, 600);
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      screen.hidden = false;

      fab.style.opacity = "0";
      fab.style.pointerEvents = "none";

      requestAnimationFrame(() => {
        screen.classList.add("open");
      });

      if (messagesEl.children.length === 0) {
        renderMessage("Hi! I'm your EcoPower assistant. Ask me about your battery, reactor, power output, or session. Type 'help' to see what I can do!", "bot");
      }

      updateQuickChips();
      setTimeout(() => inputEl.focus(), 400);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      screen.classList.remove("open");

      setTimeout(() => {
        screen.hidden = true;
        fab.style.opacity = "1";
        fab.style.pointerEvents = "auto";
      }, 350);
    }

    function clearChat() {
      messagesEl.innerHTML = "";
      renderMessage("Chat cleared. How can I help you?", "bot");
    }

    // --- Drag Logic ---
    function getScreenRect() {
      const parent = fab.parentElement;
      return parent.getBoundingClientRect();
    }

    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      isDragging = false;
      hasMoved = false;
      dragStartX = e.clientX || (e.touches && e.touches[0].clientX);
      dragStartY = e.clientY || (e.touches && e.touches[0].clientY);

      const rect = fab.getBoundingClientRect();
      fabStartLeft = rect.left;
      fabStartTop = rect.top;

      fab.classList.add("dragging");
      fab.style.transition = "none";

      document.addEventListener("mousemove", onPointerMove);
      document.addEventListener("mouseup", onPointerUp);
      document.addEventListener("touchmove", onPointerMove, { passive: false });
      document.addEventListener("touchend", onPointerUp);
    }

    function onPointerMove(e) {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      const dx = clientX - dragStartX;
      const dy = clientY - dragStartY;

      if (!hasMoved && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      hasMoved = true;
      isDragging = true;
      e.preventDefault();

      const parent = fab.parentElement;
      const parentRect = parent.getBoundingClientRect();

      let newX = fabStartLeft + dx - parentRect.left;
      let newY = fabStartTop + dy - parentRect.top;

      const fabSize = 56;
      newX = Math.max(0, Math.min(newX, parentRect.width - fabSize));
      newY = Math.max(0, Math.min(newY, parentRect.height - fabSize));

      fab.style.left = newX + "px";
      fab.style.top = newY + "px";
      fab.style.right = "auto";
      fab.style.bottom = "auto";
    }

    function onPointerUp(e) {
      fab.classList.remove("dragging");
      fab.style.transition = "";

      document.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseup", onPointerUp);
      document.removeEventListener("touchmove", onPointerMove);
      document.removeEventListener("touchend", onPointerUp);

      if (!hasMoved) {
        open();
      }

      isDragging = false;
      hasMoved = false;
    }

    function init() {
      fab = document.getElementById("chatFab");
      screen = document.getElementById("chatScreen");
      messagesEl = document.getElementById("chatMessages");
      inputEl = document.getElementById("chatInput");
      sendBtn = document.getElementById("chatSendBtn");
      backBtn = document.getElementById("chatBackBtn");
      clearBtn = document.getElementById("chatClearBtn");
      quickChipsEl = document.getElementById("chatQuickChips");

      if (!fab || !screen) return;

      // Drag events
      fab.addEventListener("mousedown", onPointerDown);
      fab.addEventListener("touchstart", onPointerDown, { passive: false });

      // Screen controls
      backBtn.addEventListener("click", close);
      clearBtn.addEventListener("click", clearChat);
      sendBtn.addEventListener("click", () => handleUserMessage(inputEl.value));
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleUserMessage(inputEl.value);
        }
      });

      // Mobile keyboard: scroll input into view when focused
      inputEl.addEventListener("focus", () => {
        setTimeout(() => {
          inputEl.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 300);
      });

      // VisualViewport resize for mobile keyboards
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", () => {
          if (isOpen) {
            screen.style.height = window.visualViewport.height + "px";
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
        });
      }

      // Update chips when navigation changes
      const observer = new MutationObserver(() => {
        if (isOpen) updateQuickChips();
      });
      const appContent = document.getElementById("mainAppContent");
      if (appContent) {
        observer.observe(appContent, { childList: false, subtree: true, attributes: true, attributeFilter: ["hidden"] });
      }
    }

    function setRole(role) {
      currentRole = role;
      if (isOpen) updateQuickChips();
    }

    return { init, open, close, clearChat, setRole };
  })();

  // =========================================
  //  18. BOOTSTRAP
  // =========================================
  document.addEventListener("DOMContentLoaded", () => {
    Clock.init();
    ThemeToggle.init();
    ProfileDropdown.init();
    Navigation.init();
    SimEngine.init();
    Splash.init();

    // Delayed chart init (after app transition)
    setTimeout(() => Dashboard.initCharts(), 5500);

    // Init chatbot
    ChatBot.init();

    // Expose globals for onclick handlers
    window.Dashboard = Dashboard;
    window.SessionController = SessionController;
    window.Analytics = Analytics;
    window.AlertSystem = AlertSystem;
    window.Navigation = Navigation;
    window.AuthScreen = AuthScreen;
    window.ReportsFilter = ReportsFilter;
    window.Reports = Reports;
    window.App = App;
    window.Toast = Toast;
    window.ChatBot = ChatBot;

    console.log("🚀 EcoPower IoT Monitoring System — Engine Booted");
    console.log("📊 SimEngine running at 1.5s intervals");
    console.log("🔋 Battery, 🌡️ Reactor, 💨 AQI, ⚡ Power — All simulated");
  });
})();