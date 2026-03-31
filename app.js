// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           ECOPOWER - IoT MONITORING SYSTEM                  ║
// ║                              JavaScript Organization                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: STATE VARIABLES
// ═══════════════════════════════════════════════════════════════════════════════
let isDark = false;
let pwrGenOn = true;
let mainPwrOn = false;
let sysOn = true;
let sessionActive = false;
let sessionSecs = 15 * 60 + 30;
let ctrlSecs = 45 * 60;
let liveWeight = 342;
let initialWeight = 500;
let charts = {};
let liveInterval = null;
let sessionInterval = null;
let ctrlInterval = null;
let sensorChart = null;
let sensorIntervals = {};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: THEME TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════
function toggleTheme() {
  isDark = !isDark;
  const app = document.getElementById('APP');
  document.getElementById('sun-icon').classList.toggle('hidden', isDark);
  document.getElementById('moon-icon').classList.toggle('hidden', !isDark);
  isDark ? app.classList.add('dark') : app.classList.remove('dark');
  updateChartsTheme();
  showToast(isDark ? '🌙 Dark mode on' : '☀️ Light mode on');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════
function switchScreen(name) {
  console.log('switchScreen called:', name);
  document.querySelectorAll('.screen').forEach(s => {
    console.log('Removing active from:', s.id);
    s.classList.remove('active');
  });
  const targetScreen = document.getElementById('screen-' + name);
  console.log('Target screen:', targetScreen);
  targetScreen.classList.add('active');
  document.getElementById('main-scroll').scrollTop = 0;
  ['home', 'analytics', 'control', 'alerts', 'reports'].forEach(id => {
    const btn = document.getElementById('nav-' + id);
    btn.className = 'nav-tab flex-1 flex flex-col items-center justify-center gap-0.5 ' +
      (id === name ? 'text-eco-800 dark:text-eco-400' : 'text-gray-400 dark:text-gray-600');
  });
  if (name === 'analytics' && !charts.heatmap) setTimeout(initHeatmapChart, 80);
}

function switchDashboardTab(tab) {
  const tabs = ['overview', 'sensors', 'power', 'charging'];
  
  tabs.forEach(t => {
    const btn = document.getElementById('dash-tab-' + t);
    const section = document.getElementById('dash-section-' + t);
    
    if (t === tab) {
      btn.classList.add('active');
      section.classList.remove('hidden');
    } else {
      btn.classList.remove('active');
      section.classList.add('hidden');
    }
  });
  
  showToast('Viewing: ' + tab.charAt(0).toUpperCase() + tab.slice(1));
  
  if (tab === 'sensors') {
    setTimeout(initAirQualityGraphSensors, 100);
  }
}

function switchHomeTab(tab) {
  const tabs = ['dashboard', 'sensors', 'insights'];
  const btnDashboard = document.getElementById('tab-dashboard');
  const btnSensors = document.getElementById('tab-sensors');
  const btnInsights = document.getElementById('tab-insights');
  
  const dashboardElements = document.querySelectorAll('.dashboard-content');
  const sensorsElements = document.querySelectorAll('.sensors-content');
  const insightsElements = document.querySelectorAll('.insights-content');
  
  tabs.forEach(t => {
    document.querySelectorAll('.home-section-' + t).forEach(el => el.style.display = 'none');
  });
  
  if (tab === 'dashboard') {
    btnDashboard.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400 border border-eco-300';
    btnSensors.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200';
    btnInsights.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200';
    document.querySelectorAll('.home-section-dashboard').forEach(el => el.style.display = 'block');
  } else if (tab === 'sensors') {
    btnSensors.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400 border border-eco-300';
    btnDashboard.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200';
    btnInsights.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200';
    document.querySelectorAll('.home-section-sensors').forEach(el => el.style.display = 'block');
  } else if (tab === 'insights') {
    btnInsights.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400 border border-eco-300';
    btnDashboard.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200';
    btnSensors.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200';
    document.querySelectorAll('.home-section-insights').forEach(el => el.style.display = 'block');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(6px)';
  }, 2200);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: SYSTEM TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════
function toggleSystem() {
  sysOn = !sysOn;
  const toggle = document.getElementById('sys-toggle');
  const dot = document.getElementById('sys-dot');
  const text = document.getElementById('sys-text');
  const label = document.getElementById('sys-label');
  toggle.classList.toggle('on', sysOn);
  dot.style.background = sysOn ? '#4CAF50' : '#9E9E9E';
  dot.classList.toggle('pulse-dot', sysOn);
  text.textContent = sysOn ? 'System Active' : 'System Offline';
  label.textContent = sysOn ? 'ON' : 'OFF';
  label.className = 'text-[9px] font-black uppercase ' + (sysOn ? 'text-eco-700 dark:text-eco-400' : 'text-gray-400');
  showToast(sysOn ? '✅ System activated' : '⏹ System deactivated');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: TARE FUNCTION (HOME SCREEN)
// ═══════════════════════════════════════════════════════════════════════════════
function doTare() {
  liveWeight = 0;
  document.getElementById('live-weight').textContent = '0';
  document.getElementById('wt-badge').textContent = 'TARED';
  document.getElementById('wt-badge').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
  showToast('⚖️ Scale tared to zero');
  setTimeout(() => {
    liveWeight = 500;
    document.getElementById('live-weight').textContent = '500';
    document.getElementById('wt-badge').textContent = 'READY';
    document.getElementById('wt-badge').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400';
    showToast('📦 500g detected · Ready to start');
  }, 1800);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: SESSION MANAGEMENT (HOME SCREEN)
// ═══════════════════════════════════════════════════════════════════════════════
function startSession() {
  if (liveWeight < 10) {
    showToast('⚠️ Add waste first, then TARE');
    return;
  }
  sessionActive = true;
  initialWeight = liveWeight;
  document.getElementById('initial-wt').textContent = initialWeight + 'g';
  document.getElementById('sess-initial').textContent = initialWeight;
  document.getElementById('sess-current').textContent = liveWeight;
  document.getElementById('active-session-card').style.display = 'block';
  document.getElementById('start-session-btn').disabled = true;
  document.getElementById('start-session-btn').style.opacity = '0.5';
  document.getElementById('wt-badge').textContent = 'BURNING';
  document.getElementById('wt-badge').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
  showToast('🔥 Session #001 started · ' + initialWeight + 'g saved');
  
  document.getElementById('temp-value').innerHTML = '<span class="text-base font-black font-mono">342°</span>';
  document.getElementById('smoke-value').textContent = '250';
  document.getElementById('air-value').textContent = '80';
  
  const tempGauge = document.querySelector('.temp-gauge');
  const smokeArc = document.querySelector('.smoke-arc');
  const airArc = document.querySelector('.air-arc');
  if (tempGauge) tempGauge.style.height = '34%';
  if (smokeArc) smokeArc.style.strokeDashoffset = 56;
  if (airArc) airArc.style.strokeDashoffset = 63;
  
  sessionInterval = setInterval(() => {
    if (liveWeight > 50) {
      liveWeight = Math.max(50, liveWeight - Math.floor(Math.random() * 4 + 1));
      document.getElementById('live-weight').textContent = liveWeight;
      document.getElementById('sess-current').textContent = liveWeight;
      
      const tempChange = Math.floor(Math.random() * 60) - 30;
      const smokeChange = Math.floor(Math.random() * 100) - 50;
      const airChange = Math.floor(Math.random() * 20) - 10;
      
      const newTemp = Math.max(100, Math.min(900, 342 + tempChange));
      const newSmoke = Math.max(50, Math.min(800, 250 + smokeChange));
      const newAir = Math.max(20, Math.min(400, 80 + airChange));
      
      document.getElementById('temp-value').innerHTML = '<span class="text-base font-black font-mono">' + newTemp + '°</span>';
      document.getElementById('smoke-value').textContent = newSmoke;
      document.getElementById('air-value').textContent = newAir;
      
      const tempGauge = document.querySelector('.temp-gauge');
      if (tempGauge) tempGauge.style.height = (newTemp / 1000 * 100) + '%';
      
      const smokeArc = document.querySelector('.smoke-arc');
      const airArc = document.querySelector('.air-arc');
      if (smokeArc) {
        const smokePercent = Math.min(newSmoke / 1000, 1);
        smokeArc.style.strokeDashoffset = 75 * (1 - smokePercent);
      }
      if (airArc) {
        const airPercent = Math.min(newAir / 500, 1);
        airArc.style.strokeDashoffset = 75 * (1 - airPercent);
      }
    } else {
      clearInterval(sessionInterval);
      showToast('🔔 Fire Out detected · Click END SESSION');
    }
  }, 800);
  
  sessionSecs = 0;
  const timerEl = document.getElementById('sess-timer');
  const timerInterval = setInterval(() => {
    if (!sessionActive) {
      clearInterval(timerInterval);
      return;
    }
    sessionSecs++;
    const m = Math.floor(sessionSecs / 60).toString().padStart(2, '0');
    const s = (sessionSecs % 60).toString().padStart(2, '0');
    timerEl.textContent = m + ':' + s;
  }, 1000);
}

function endSession() {
  sessionActive = false;
  clearInterval(sessionInterval);
  const burned = initialWeight - liveWeight;
  document.getElementById('active-session-card').style.display = 'none';
  document.getElementById('start-session-btn').disabled = false;
  document.getElementById('start-session-btn').style.opacity = '1';
  document.getElementById('wt-badge').textContent = 'COMPLETE';
  document.getElementById('wt-badge').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400';
  showToast('✅ Session ended · ' + burned + 'g burned · Data saved');
  
  document.getElementById('temp-value').innerHTML = '<span class="text-base font-black font-mono">--°</span>';
  document.getElementById('smoke-value').textContent = '--';
  document.getElementById('air-value').textContent = '--';
  
  const tempGauge = document.querySelector('.temp-gauge');
  const smokeArc = document.querySelector('.smoke-arc');
  const airArc = document.querySelector('.air-arc');
  if (tempGauge) tempGauge.style.height = '0%';
  if (smokeArc) smokeArc.style.strokeDashoffset = 100;
  if (airArc) airArc.style.strokeDashoffset = 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: POWER GENERATION TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════
function togglePowerGen() {
  pwrGenOn = !pwrGenOn;
  const t = document.getElementById('pwr-toggle');
  t.classList.toggle('on', pwrGenOn);
  document.getElementById('pwr-val').textContent = pwrGenOn ? '18.5' : '0.0';
  showToast(pwrGenOn ? '⚡ Power generation ON' : 'Power generation OFF');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: BATTERY SELECTION
// ═══════════════════════════════════════════════════════════════════════════════
function selectBattery(which) {
  const batteries = document.querySelectorAll('.radio-opt');
  const checkIcons = document.querySelectorAll('.check-icon');
  
  batteries.forEach((battery, index) => {
    if ((which === 'auto' && index === 0) || (which === 'internal' && index === 1) || (which === 'secondary' && index === 2)) {
      battery.className = 'radio-opt p-3 rounded-xl border-2 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10';
      checkIcons[index].classList.remove('hidden');
    } else {
      battery.className = 'radio-opt p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700';
      checkIcons[index].classList.add('hidden');
    }
  });
  
  const labels = { 'auto': 'Auto', 'internal': 'Internal', 'secondary': 'Secondary' };
  showToast('Selected: ' + labels[which] + ' Charging');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: FAN CONTROL
// ═══════════════════════════════════════════════════════════════════════════════
function setFan(mode) {
  ['auto', 'on', 'off'].forEach(m => {
    document.getElementById('fan-' + m).className = 'fan-btn ripple ' + (m === mode ? 'active' : '');
  });
  const dot = document.getElementById('fan-dot');
  const text = document.getElementById('fan-text');
  if (mode === 'off') {
    dot.style.background = '#9E9E9E';
    dot.classList.remove('pulse-dot');
    text.textContent = 'Stopped';
    text.className = 'text-[9px] font-bold text-gray-400';
  } else {
    dot.style.background = '#4CAF50';
    dot.classList.add('pulse-dot');
    text.textContent = mode === 'auto' ? 'Running · Auto' : 'Running · Manual';
    text.className = 'text-[9px] font-bold text-eco-700 dark:text-eco-400';
  }
  showToast('Fan: ' + mode.toUpperCase());
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: ALERT FILTER
// ═══════════════════════════════════════════════════════════════════════════════
function filterAlerts(type, btn) {
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.remove('active');
    c.classList.add('inactive');
  });
  btn.classList.add('active');
  btn.classList.remove('inactive');
  document.querySelectorAll('.alert-card').forEach(card => {
    card.style.display = (type === 'all' || card.dataset.type === type) ? 'block' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: REPORT TABS
// ═══════════════════════════════════════════════════════════════════════════════
function setReportTab(btn) {
  document.querySelectorAll('.report-tab').forEach(t => {
    t.classList.remove('active');
    t.classList.add('inactive');
  });
  btn.classList.add('active');
  btn.classList.remove('inactive');
  showToast('Viewing: ' + btn.textContent + ' Report');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: CONTROL SCREEN TIMER
// ═══════════════════════════════════════════════════════════════════════════════
function startCtrlTimer() {
  ctrlInterval = setInterval(() => {
    if (ctrlSecs > 0) ctrlSecs--;
    const m = Math.floor(ctrlSecs / 60).toString().padStart(2, '0');
    const s = (ctrlSecs % 60).toString().padStart(2, '0');
    const el = document.getElementById('ctrl-timer');
    if (el) el.textContent = m + ':' + s;
  }, 1000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 14: CHARTS - INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
function getC() {
  return {
    grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    tick: isDark ? '#555' : '#BDBDBD',
    green: isDark ? '#4CAF50' : '#2E7D32',
    yellow: '#FBC02D'
  };
}

function initCharts() {
  initAirQualityGraph();
  initPowerGraph();
}

function initPowerGraph() {
  const ctx = document.getElementById('powerGraph');
  if (!ctx) return;
  
  const gridColor = isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  
  const powerData = [5.2, 5.8, 6.1, 6.0, 6.3, 6.5, 6.2, 6.4, 6.6, 6.5, 6.5];
  const labels = ['-50s', '-45s', '-40s', '-35s', '-30s', '-25s', '-20s', '-15s', '-10s', '-5s', 'Now'];
  
  charts.power = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Power (W)',
        data: powerData,
        borderColor: '#FBC02D',
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointBackgroundColor: '#FBC02D'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 8 }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 8 } },
          min: 0,
          max: 10
        }
      }
    }
  });
  
  setInterval(() => {
    if (!charts.power) return;
    const newPower = (5 + Math.random() * 2).toFixed(1);
    charts.power.data.datasets[0].data.push(parseFloat(newPower));
    charts.power.data.datasets[0].data.shift();
    charts.power.update('none');
    document.getElementById('live-power').textContent = newPower;
  }, 2000);
}

function initAirQualityGraph() {
  const ctx = document.getElementById('airQualityGraph');
  if (!ctx) return;
  
  const gridColor = isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  
  const smokeData = [420, 435, 450, 440, 460, 445, 450, 430, 455, 440, 450];
  const airData = [45, 42, 40, 38, 42, 39, 40, 41, 39, 40, 40];
  const labels = ['-50s', '-45s', '-40s', '-35s', '-30s', '-25s', '-20s', '-15s', '-10s', '-5s', 'Now'];
  
  charts.airQuality = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Before Filter (PPM)',
          data: smokeData,
          borderColor: '#EF5350',
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 2,
          pointBackgroundColor: '#EF5350'
        },
        {
          label: 'After Filter (AQI)',
          data: airData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 2,
          pointBackgroundColor: '#4CAF50'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1F2937' : '#fff',
          titleColor: isDark ? '#F9FAFB' : '#111827',
          bodyColor: isDark ? '#9CA3AF' : '#6B7280'
        }
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 8 }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 8 } },
          min: 0,
          max: 500
        }
      }
    }
  });
  
  setInterval(() => {
    if (!charts.airQuality) return;
    
    const newSmoke = Math.floor(400 + Math.random() * 100);
    const newAir = Math.floor(30 + Math.random() * 30);
    
    charts.airQuality.data.datasets[0].data.push(newSmoke);
    charts.airQuality.data.datasets[0].data.shift();
    charts.airQuality.data.datasets[1].data.push(newAir);
    charts.airQuality.data.datasets[1].data.shift();
    
    charts.airQuality.update('none');
  }, 2000);
}

function initAirQualityGraphSensors() {
  const ctx = document.getElementById('airQualityGraphSensors');
  if (!ctx || charts.airQualitySensors) return;
  
  const gridColor = isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  
  const smokeData = [420, 435, 450, 440, 460, 445, 450, 430, 455, 440, 450];
  const airData = [45, 42, 40, 38, 42, 39, 40, 41, 39, 40, 40];
  const labels = ['-50s', '-45s', '-40s', '-35s', '-30s', '-25s', '-20s', '-15s', '-10s', '-5s', 'Now'];
  
  charts.airQualitySensors = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Raw Smoke (PPM)',
          data: smokeData,
          borderColor: '#EF5350',
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 2,
          pointBackgroundColor: '#EF5350'
        },
        {
          label: 'Filtered Air (AQI)',
          data: airData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 2,
          pointBackgroundColor: '#4CAF50'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 8 }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 8 } },
          min: 0,
          max: 500
        }
      }
    }
  });
  
  setInterval(() => {
    if (!charts.airQualitySensors) return;
    const newSmoke = Math.floor(400 + Math.random() * 100);
    const newAir = Math.floor(30 + Math.random() * 30);
    charts.airQualitySensors.data.datasets[0].data.push(newSmoke);
    charts.airQualitySensors.data.datasets[0].data.shift();
    charts.airQualitySensors.data.datasets[1].data.push(newAir);
    charts.airQualitySensors.data.datasets[1].data.shift();
    charts.airQualitySensors.update('none');
  }, 2000);
}

function initHeatmapChart() {
  if (charts.heatmap) return;
  const c = getC();
  const ctx = document.getElementById('heatmapChart');
  if (!ctx) return;
  charts.heatmap = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [28, 42, 38, 55, 82, 48, 30],
        backgroundColor: ['rgba(46,125,50,0.45)', 'rgba(46,125,50,0.55)', 'rgba(46,125,50,0.5)', 'rgba(46,125,50,0.65)', 'rgba(46,125,50,1)', 'rgba(46,125,50,0.6)', 'rgba(46,125,50,0.4)'],
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: ctx => ctx.parsed.y + ' sessions'
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#000000',
            font: {
              size: 12,
              weight: '700',
              family: 'Roboto, sans-serif'
            }
          }
        },
        y: {
          display: true,
          position: 'left',
          grid: {
            color: 'rgba(0,0,0,0.1)'
          },
          ticks: {
            color: '#000000',
            font: {
              size: 11,
              weight: '600',
              family: 'Roboto, sans-serif'
            },
            stepSize: 20,
            callback: function(value) {
              return value;
            }
          },
          min: 0,
          max: 100
        }
      },
      animation: {
        duration: 700,
        easing: 'easeOutBounce'
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 15: CHARTS - THEME UPDATE
// ═══════════════════════════════════════════════════════════════════════════════
function updateChartsTheme() {
  const c = getC();
  const gridColor = isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  
  if (charts.heatmap) {
    charts.heatmap.options.scales.x.ticks.color = c.tick;
    charts.heatmap.update('none');
  }
  
  if (sensorChart) {
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#1F2937' : '#F9FAFB';
    const gridColor = isDark ? '#374151' : '#E5E7EB';
    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    
    sensorChart.updateOptions({
      chart: { background: bgColor },
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      xaxis: { labels: { style: { colors: textColor } } },
      yaxis: { labels: { style: { colors: textColor } } },
      tooltip: { theme: isDark ? 'dark' : 'light' }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 16: LIVE POWER & ENERGY SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

function startLiveSim() {
  liveInterval = setInterval(() => {
    if (!pwrGenOn) return;
    const v = (17 + Math.random() * 2.5).toFixed(1);
    const el = document.getElementById('pwr-val');
    if (el) el.textContent = v;
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 17: LIVE GAUGE SIMULATION (TEMP, SMOKE, AIR)
// ═══════════════════════════════════════════════════════════════════════════════
let gaugeTemp = 350;
let gaugeSmoke = 200;
let gaugeAir = 60;

function startGaugeSim() {
  setInterval(() => {
    try {
    gaugeTemp += (Math.floor(Math.random() * 30) + 15);
    if (gaugeTemp >= 1000) {
      gaugeTemp = 0;
    }
    if (Math.random() > 0.85) {
      gaugeTemp = Math.floor(Math.random() * 1000);
    }
    
    gaugeSmoke += Math.floor(Math.random() * 40) + 20;
    if (gaugeSmoke >= 800) {
      gaugeSmoke = 0;
    }
    if (Math.random() > 0.85) {
      gaugeSmoke = Math.floor(Math.random() * 800);
    }
    
    gaugeAir += Math.floor(Math.random() * 20) + 10;
    if (gaugeAir >= 400) {
      gaugeAir = 0;
    }
    if (Math.random() > 0.85) {
      gaugeAir = Math.floor(Math.random() * 400);
    }
    
    const tempValue = document.getElementById('temp-value');
    const tempGaugeBar = document.getElementById('temp-gauge-bar');
    if (tempValue) {
      tempValue.textContent = gaugeTemp + '°';
    }
    if (tempGaugeBar) {
      tempGaugeBar.style.height = (gaugeTemp / 1000 * 100) + '%';
      if (gaugeTemp >= 800) {
        tempGaugeBar.style.background = 'linear-gradient(to top, #ef4444, #ef4444)';
      } else if (gaugeTemp >= 600) {
        tempGaugeBar.style.background = 'linear-gradient(to top, #f97316, #f97316)';
      } else if (gaugeTemp >= 400) {
        tempGaugeBar.style.background = 'linear-gradient(to top, #eab308, #eab308)';
      } else if (gaugeTemp >= 200) {
        tempGaugeBar.style.background = 'linear-gradient(to top, #22c55e, #22c55e)';
      } else {
        tempGaugeBar.style.background = 'linear-gradient(to top, #3b82f6, #60a5fa)';
      }
    }
    
    const smokeValue = document.getElementById('smoke-value');
    const airValue = document.getElementById('air-value');
    const smokeStatus = document.getElementById('smoke-status');
    const airStatus = document.getElementById('air-status');
    const smokeGaugeFill = document.getElementById('smoke-gauge-fill');
    const airGaugeFill = document.getElementById('air-gauge-fill');
    
    if (smokeValue) {
      smokeValue.textContent = gaugeSmoke;
    }
    if (airValue) {
      airValue.textContent = gaugeAir;
    }
    
    // Update Smoke Gauge Fill (Half Circle)
    if (smokeGaugeFill) {
      const arcLength = 126;
      const percent = Math.min(gaugeSmoke / 800, 1);
      smokeGaugeFill.style.strokeDashoffset = arcLength * (1 - percent);
    }
    
    // Update Air Gauge Fill (Half Circle)
    if (airGaugeFill) {
      const arcLength = 126;
      const percent = Math.min(gaugeAir / 400, 1);
      airGaugeFill.style.strokeDashoffset = arcLength * (1 - percent);
    }
    
    // Update Smoke Status
    if (smokeStatus) {
      if (gaugeSmoke <= 100) {
        smokeStatus.textContent = 'GOOD';
        smokeStatus.className = 'mt-1 text-[7px] font-black text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded';
      } else if (gaugeSmoke <= 300) {
        smokeStatus.textContent = 'MODERATE';
        smokeStatus.className = 'mt-1 text-[7px] font-black text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded';
      } else if (gaugeSmoke <= 500) {
        smokeStatus.textContent = 'UNHEALTHY';
        smokeStatus.className = 'mt-1 text-[7px] font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded';
      } else {
        smokeStatus.textContent = 'HAZARDOUS';
        smokeStatus.className = 'mt-1 text-[7px] font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded';
      }
    }
    
    // Update Air Status
    if (airStatus) {
      if (gaugeAir <= 50) {
        airStatus.textContent = 'GOOD';
        airStatus.className = 'mt-1 text-[7px] font-black text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded';
      } else if (gaugeAir <= 100) {
        airStatus.textContent = 'MODERATE';
        airStatus.className = 'mt-1 text-[7px] font-black text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded';
      } else if (gaugeAir <= 150) {
        airStatus.textContent = 'UNHEALTHY';
        airStatus.className = 'mt-1 text-[7px] font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded';
      } else {
        airStatus.textContent = 'HAZARDOUS';
        airStatus.className = 'mt-1 text-[7px] font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded';
      }
    }
    } catch(e) { console.error('Gauge update error:', e); }
  }, 1200);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 18: LIVE SESSION SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════
let liveWaste = 188;
let liveEnergy = 87;
let liveCompletion = 8;
let liveGrade = 'A';

function startLiveSessionSim() {
  setInterval(() => {
    try {
      liveWaste += Math.floor(Math.random() * 5) + 2;
      if (liveWaste > 500) liveWaste = 100;
      
      liveEnergy += Math.floor(Math.random() * 3) + 1;
      if (liveEnergy > 200) liveEnergy = 50;
      
      if (liveCompletion > 1) {
        liveCompletion -= Math.random() > 0.7 ? 1 : 0;
        if (liveCompletion < 1) liveCompletion = 10;
      }
      
      const ratio = liveEnergy / (liveWaste / 100);
      if (ratio > 0.5) liveGrade = 'A';
      else if (ratio > 0.4) liveGrade = 'B';
      else if (ratio > 0.3) liveGrade = 'C';
      else liveGrade = 'D';
      
      const wasteEl = document.getElementById('live-waste');
      const energyEl = document.getElementById('live-energy');
      const completionEl = document.getElementById('live-completion');
      const gradeEl = document.getElementById('live-grade');
      const estEnergyEl = document.getElementById('live-est-energy');
      
      if (wasteEl) wasteEl.textContent = liveWaste;
      if (energyEl) energyEl.textContent = liveEnergy;
      if (completionEl) completionEl.textContent = '~' + liveCompletion;
      if (gradeEl) gradeEl.textContent = liveGrade;
      if (estEnergyEl) estEnergyEl.textContent = Math.floor(liveEnergy * 1.5);
    } catch(e) { console.error('Live session error:', e); }
  }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 19: SENSOR MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function openSensorModal(type) {
  const modal = document.getElementById('sensor-modal');
  const title = document.getElementById('modal-title');
  const value = document.getElementById('modal-value');
  if (!modal || !title || !value) return;
  
  modal.classList.remove('hidden');
  
  // Clear any existing intervals
  Object.values(sensorIntervals).forEach(interval => clearInterval(interval));
  sensorIntervals = {};
  
  // Destroy existing chart properly
  if (sensorChart) {
    try {
      sensorChart.destroy();
    } catch (e) {
      console.error('Error destroying chart:', e);
    }
    sensorChart = null;
  }
  
  const chartEl = document.getElementById('sensorChart');
  if (!chartEl) return;
  
  const ctx = chartEl.getContext('2d');
  
  let chartData, chartColor, unit;
  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  const labels = ['-50s', '-45s', '-40s', '-35s', '-30s', '-25s', '-20s', '-15s', '-10s', '-5s', 'Now'];
  
  if (type === 'temp') {
    title.textContent = 'Reactor Temperature (°C)';
    value.textContent = 'Current: 342°C';
    chartColor = '#F97316';
    unit = '°C';
    chartData = [280, 295, 310, 325, 332, 338, 340, 342, 341, 340, 342];
    
    sensorChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Temperature (°C)',
          data: chartData,
          borderColor: '#F97316',
          backgroundColor: 'rgba(249, 115, 22, 0.35)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#F97316',
          pointBorderColor: isDark ? '#374151' : '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1F2937' : '#fff',
            titleColor: isDark ? '#F9FAFB' : '#111827',
            bodyColor: isDark ? '#9CA3AF' : '#6B7280'
          }
        },
        scales: {
          x: {
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: tickColor, font: { size: 9 }, maxTicksLimit: 6 }
          },
          y: {
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: tickColor, font: { size: 9 } },
            min: 0,
            max: 800
          }
        }
      }
    });
    
    startTempSensorSimulation();
    return;
  }
  
  if (type === 'smoke') {
    title.textContent = 'Raw Smoke (PPM) - MQ-135';
    value.textContent = 'Current: 125 PPM';
    chartColor = '#78909C';
    unit = 'PPM';
    chartData = [180, 165, 150, 140, 135, 130, 128, 125, 126, 124, 125];
  } else if (type === 'air') {
    title.textContent = 'Air Quality (Before vs After)';
    value.textContent = 'Current: 450 PPM / 40 AQI';
    
    const smokeData = [420, 435, 450, 440, 460, 445, 450, 430, 455, 440, 450];
    const airData = [45, 42, 40, 38, 42, 39, 40, 41, 39, 40, 40];
    
    sensorChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Raw Smoke (PPM)',
            data: smokeData,
            borderColor: '#EF5350',
            backgroundColor: 'rgba(239, 83, 80, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 2,
            pointBackgroundColor: '#EF5350'
          },
          {
            label: 'Filtered Air (AQI)',
            data: airData,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 2,
            pointBackgroundColor: '#4CAF50'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
          tooltip: {
            backgroundColor: isDark ? '#1F2937' : '#fff',
            titleColor: isDark ? '#F9FAFB' : '#111827',
            bodyColor: isDark ? '#9CA3AF' : '#6B7280'
          }
        },
        scales: {
          x: {
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: tickColor, font: { size: 9 }, maxTicksLimit: 6 }
          },
          y: {
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: tickColor, font: { size: 9 } },
            min: 0,
            max: 500
          }
        }
      }
    });
    
    startAirSensorSimulation();
    return;
  } else if (type === 'waste') {
    title.textContent = 'Waste vs Time';
    value.textContent = 'Current: 900g';
    chartColor = '#F97316';
    unit = 'g';
    chartData = [2000, 1900, 1750, 1600, 1450, 1300, 1150, 1000, 900];
  }
  
  sensorChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['-50m', '-45m', '-40m', '-35m', '-30m', '-25m', '-20m', '-15m', '-10m', '-5m', 'Now'],
      datasets: [{
        data: chartData,
        borderColor: chartColor,
        backgroundColor: chartColor + '20',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: chartColor,
        pointBorderColor: isDark ? '#374151' : '#fff',
        pointBorderWidth: 1.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1F2937' : '#fff',
          titleColor: isDark ? '#F9FAFB' : '#111827',
          bodyColor: isDark ? '#9CA3AF' : '#6B7280',
          borderColor: isDark ? '#374151' : '#E5E7EB',
          borderWidth: 1,
          callbacks: {
            label: ctx => ctx.parsed.y + ' ' + unit
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 9, family: 'Roboto Mono' }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 9, family: 'Roboto Mono' } },
          min: type === 'temp' ? 0 : (type === 'smoke' ? 100 : 0),
          max: type === 'temp' ? 800 : (type === 'smoke' ? 200 : 2500)
        }
      },
      animation: { duration: 800 }
    }
  });
  
  startSensorSimulation(type, chartColor, unit);
}

function closeSensorModal() {
  document.getElementById('sensor-modal').classList.add('hidden');
  Object.values(sensorIntervals).forEach(interval => clearInterval(interval));
  sensorIntervals = {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 21: POWER MODAL
// ═══════════════════════════════════════════════════════════════════════════════
let powerModalChart = null;

function openPowerModal() {
  const modal = document.getElementById('power-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  initPowerModalChart();
}

function closePowerModal() {
  const modal = document.getElementById('power-modal');
  if (modal) modal.classList.add('hidden');
  if (powerModalChart) {
    powerModalChart.destroy();
    powerModalChart = null;
  }
}

function initPowerModalChart() {
  const ctx = document.getElementById('powerGraphModal');
  if (!ctx) return;
  
  if (powerModalChart) powerModalChart.destroy();
  
  const gridColor = isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  
  const powerData = [5.2, 5.8, 6.1, 6.0, 6.3, 6.5, 6.2, 6.4, 6.6, 6.5, 6.5];
  const labels = ['-50s', '-45s', '-40s', '-35s', '-30s', '-25s', '-20s', '-15s', '-10s', '-5s', 'Now'];
  
  powerModalChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Power (W)',
        data: powerData,
        borderColor: '#FBC02D',
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#FBC02D'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1F2937' : '#fff',
          titleColor: isDark ? '#F9FAFB' : '#111827',
          bodyColor: isDark ? '#9CA3AF' : '#6B7280'
        }
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 10 }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 10 } },
          min: 0,
          max: 10
        }
      }
    }
  });
  
  setInterval(() => {
    if (!powerModalChart) return;
    const newPower = (5 + Math.random() * 2).toFixed(1);
    powerModalChart.data.datasets[0].data.push(parseFloat(newPower));
    powerModalChart.data.datasets[0].data.shift();
    powerModalChart.update('none');
    document.getElementById('modal-power').textContent = newPower;
    document.getElementById('live-power').textContent = newPower;
  }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATTERY MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
let currentBatteryType = 'internal';
let batteryChart = null;
let batteryCharging = true;

function openBatteryModal(type) {
  currentBatteryType = type;
  const modal = document.getElementById('battery-modal');
  const title = document.getElementById('battery-modal-title');
  
  modal.classList.remove('hidden');
  
  title.textContent = type === 'internal' ? 'Internal Battery' : 'Secondary Battery';
  switchBatteryView(type);
  initBatteryChart();
}

function closeBatteryModal() {
  document.getElementById('battery-modal').classList.add('hidden');
}

function switchBatteryView(type) {
  currentBatteryType = type;
  const btnInternal = document.getElementById('btn-internal');
  const btnSecondary = document.getElementById('btn-secondary');
  
  if (type === 'internal') {
    btnInternal.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400 border border-eco-300 dark:border-eco-700';
    btnSecondary.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
    document.getElementById('battery-modal-title').textContent = 'Internal Battery';
  } else {
    btnSecondary.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400 border border-eco-300 dark:border-eco-700';
    btnInternal.className = 'flex-1 py-2 px-3 rounded-lg text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
    document.getElementById('battery-modal-title').textContent = 'Secondary Battery';
  }
  
  updateBatteryModal();
}

function updateBatteryModal() {
  const pctEl = document.getElementById('battery-modal-pct');
  const voltageEl = document.getElementById('battery-modal-voltage');
  const statusEl = document.getElementById('battery-modal-status');
  const runtimeEl = document.getElementById('battery-modal-runtime');
  const gaugeFill = document.getElementById('battery-gauge-fill');
  
  const isInternal = currentBatteryType === 'internal';
  const pct = isInternal ? 50 : 65;
  const voltage = (12 - (100 - pct) * 0.02).toFixed(1);
  const runtime = (pct * 0.09).toFixed(1);
  
  if (pctEl) pctEl.textContent = pct + '%';
  if (voltageEl) voltageEl.textContent = voltage + 'V';
  if (statusEl) {
    statusEl.textContent = batteryCharging ? 'CHARGING' : 'ACTIVE';
    statusEl.className = batteryCharging ? 'text-[10px] font-black text-green-600 dark:text-green-400' : 'text-[10px] font-black text-blue-600 dark:text-blue-400';
  }
  if (runtimeEl) runtimeEl.textContent = runtime + ' hrs';
  if (gaugeFill) {
    const arcLength = 126;
    gaugeFill.style.strokeDashoffset = arcLength * (1 - pct / 100);
  }
}

function toggleBatteryCharging() {
  batteryCharging = !batteryCharging;
  const btn = document.getElementById('battery-charge-btn');
  if (batteryCharging) {
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg> CHARGING';
    btn.className = 'flex-1 py-2.5 rounded-xl font-bold text-[9px] flex items-center justify-center gap-1 bg-eco-100 dark:bg-eco-900/20 text-eco-700 dark:text-eco-400 border border-eco-300 dark:border-eco-700';
    showToast('Battery charging enabled');
  } else {
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10M18.4 6.6L16 9M5.6 6.6L8 9"/></svg> ACTIVE';
    btn.className = 'flex-1 py-2.5 rounded-xl font-bold text-[9px] flex items-center justify-center gap-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700';
    showToast('Battery charging disabled');
  }
  updateBatteryModal();
}

function initBatteryChart() {
  const ctx = document.getElementById('batteryChart');
  if (!ctx) return;
  
  if (batteryChart) batteryChart.destroy();
  
  const gridColor = isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  
  const data = currentBatteryType === 'internal' 
    ? [45, 48, 52, 55, 58, 62, 65, 68, 72, 75, 78, 82, 85, 88, 92, 95, 98, 100, 100, 100]
    : [55, 58, 62, 65, 68, 72, 75, 78, 82, 85, 88, 92, 95, 98, 100, 100, 100, 100, 100, 100];
  const labels = data.map((_, i) => i === data.length - 1 ? 'Now' : '-' + (data.length - 1 - i) + 'h');
  
  batteryChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointBackgroundColor: '#4CAF50'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 8 }, callback: v => v + '%' },
          min: 0,
          max: 100
        }
      }
    }
  });
}

function startAirSensorSimulation() {
  const valueEl = document.getElementById('modal-value');
  let smokeData = [420, 435, 450, 440, 460, 445, 450, 430, 455, 440, 450];
  let airData = [45, 42, 40, 38, 42, 39, 40, 41, 39, 40, 40];
  
  sensorIntervals.air = setInterval(() => {
    if (!sensorChart) return;
    
    const newSmoke = Math.floor(400 + Math.random() * 100);
    const newAir = Math.floor(30 + Math.random() * 30);
    
    smokeData.push(newSmoke);
    smokeData.shift();
    airData.push(newAir);
    airData.shift();
    
    sensorChart.data.datasets[0].data = smokeData;
    sensorChart.data.datasets[1].data = airData;
    sensorChart.update('none');
    
    valueEl.textContent = 'Current: ' + newSmoke + ' PPM / ' + newAir + ' AQI';
  }, 2000);
}

function startTempSensorSimulation() {
  const valueEl = document.getElementById('modal-value');
  let data = [280, 295, 310, 325, 332, 338, 340, 342, 341, 340, 342];
  
  sensorIntervals.temp = setInterval(() => {
    if (!sensorChart) return;
    
    const newVal = 330 + Math.floor(Math.random() * 20);
    data.push(newVal);
    data.shift();
    
    sensorChart.data.datasets[0].data = data;
    sensorChart.update('none');
    
    valueEl.textContent = 'Current: ' + newVal + ' °C';
  }, 2000);
}

function startSensorSimulation(type, chartColor, unit) {
  if (type === 'temp' || type === 'air') return;
  
  let data = [];
  for (let i = 0; i < 11; i++) {
    if (type === 'smoke') data.push(115 + Math.floor(Math.random() * 15));
    else if (type === 'waste') data.push(900 + Math.floor(Math.random() * 50));
  }
  
  const valueEl = document.getElementById('modal-value');
  
  sensorIntervals.main = setInterval(() => {
    if (!sensorChart) return;
    
    const newVal = type === 'smoke' ? 115 + Math.floor(Math.random() * 15) :
                   Math.max(100, 900 - Math.floor(Math.random() * 50));
    
    data.push(newVal);
    data.shift();
    
    sensorChart.data.datasets[0].data = data;
    sensorChart.update('none');
    
    valueEl.textContent = 'Current: ' + newVal + ' ' + unit;
  }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 20: CHART MODAL (POWER & ENERGY)
// ═══════════════════════════════════════════════════════════════════════════════
let modalChart = null;
let currentChartType = null;
let modalInterval = null;

function openChartModal(type) {
  const modal = document.getElementById('chart-modal');
  const title = document.getElementById('chart-modal-title');
  const valueEl = document.getElementById('chart-modal-value');
  if (!modal) return;
  
  // Clear previous interval
  if (modalInterval) {
    clearInterval(modalInterval);
    modalInterval = null;
  }
  
  currentChartType = type;
  modal.classList.remove('hidden');
  
  if (type === 'power') {
    title.textContent = 'TEG Power Output';
    title.className = 'text-sm font-black text-gray-900 dark:text-white';
    valueEl.className = 'text-xs font-bold text-yellow-600 dark:text-yellow-400 font-mono';
    createModalChart('power');
  } else {
    title.textContent = 'Energy Output';
    title.className = 'text-sm font-black text-blue-600 dark:text-blue-400';
    valueEl.className = 'text-xs font-bold text-blue-600 dark:text-blue-400 font-mono';
    createModalChart('energy');
  }
}

function closeChartModal() {
  const modal = document.getElementById('chart-modal');
  if (modal) modal.classList.add('hidden');
  
  // Clear interval
  if (modalInterval) {
    clearInterval(modalInterval);
    modalInterval = null;
  }
  
  if (modalChart) {
    modalChart.destroy();
    modalChart = null;
  }
  currentChartType = null;
}

function createModalChart(type) {
  const ctx = document.getElementById('modalChart');
  if (!ctx) return;
  
  if (modalChart) {
    modalChart.destroy();
  }
  
  const gridColor = isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  const valueEl = document.getElementById('chart-modal-value');
  
  let data, labels, color, bgColor, maxVal, unit;
  
  if (type === 'power') {
    data = [10, 12, 11, 14, 16, 15, 17, 18, 18.5, 17, 19, 18, 20, 19, 21, 20, 22, 21];
    color = '#FBC02D';
    bgColor = 'rgba(251, 191, 36, 0.1)';
    maxVal = 30;
    unit = ' W';
  } else {
    data = [20, 28, 35, 42, 50, 58, 65, 75, 87, 95, 105, 112, 120, 128, 135, 142, 148, 155];
    color = '#3B82F6';
    bgColor = 'rgba(59, 130, 246, 0.1)';
    maxVal = 200;
    unit = ' Wh';
  }
  
  labels = [];
  for (let i = 17; i >= 1; i--) {
    labels.push('-' + i + 'm');
  }
  labels.push('Now');
  
  modalChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        borderColor: color,
        backgroundColor: bgColor,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: color,
        pointBorderColor: isDark ? '#374151' : '#fff',
        pointBorderWidth: 1.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1F2937' : '#fff',
          titleColor: isDark ? '#F9FAFB' : '#111827',
          bodyColor: isDark ? '#9CA3AF' : '#6B7280',
          borderColor: isDark ? '#374151' : '#E5E7EB',
          borderWidth: 1,
          callbacks: {
            label: ctx => ctx.parsed.y + unit
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 9, family: 'Roboto Mono' }, maxTicksLimit: 8 }
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { size: 9, family: 'Roboto Mono' }, callback: ctx => ctx + unit },
          min: 0,
          max: maxVal
        }
      },
      animation: { duration: 800 }
    }
  });
  
  // Update modal value
  const lastVal = data[data.length - 1];
  valueEl.textContent = lastVal + unit;
  
  // Live update - use single interval
  modalInterval = setInterval(() => {
    if (!modalChart || currentChartType !== type) {
      clearInterval(modalInterval);
      modalInterval = null;
      return;
    }
    
    let newVal;
    if (type === 'power') {
      newVal = 15 + Math.floor(Math.random() * 10);
    } else {
      const lastData = modalChart.data.datasets[0].data;
      newVal = Math.min(200, lastData[lastData.length - 1] + Math.floor(Math.random() * 8) + 2);
    }
    
    modalChart.data.datasets[0].data.push(newVal);
    modalChart.data.datasets[0].data.shift();
    modalChart.update('none');
    valueEl.textContent = newVal + unit;
  }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 22: BATTERY SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════
let batteryInternal = 50;
let batterySecondary = 50;
let batteryInterval = null;
let lastLowAlert = 0;
let lastFullAlert = 0;

function startBatterySim() {
  batteryInterval = setInterval(() => {
    if (Math.random() > 0.5) {
      batteryInternal += Math.floor(Math.random() * 8) + 3;
      if (batteryInternal >= 100) {
        batteryInternal = 0;
        batteryInternal += Math.floor(Math.random() * 8) + 3;
      }
    } else {
      batteryInternal -= Math.floor(Math.random() * 8) + 3;
      if (batteryInternal <= 0) {
        batteryInternal = 100;
        batteryInternal -= Math.floor(Math.random() * 8) + 3;
      }
    }
    
    if (Math.random() > 0.5) {
      batterySecondary += Math.floor(Math.random() * 5) + 2;
      if (batterySecondary >= 100) {
        batterySecondary = 0;
        batterySecondary += Math.floor(Math.random() * 5) + 2;
      }
    } else {
      batterySecondary -= Math.floor(Math.random() * 5) + 2;
      if (batterySecondary <= 0) {
        batterySecondary = 100;
        batterySecondary -= Math.floor(Math.random() * 5) + 2;
      }
    }
    
    const internalFill = document.getElementById('battery-internal-fill');
    const internalPct = document.getElementById('battery-internal-pct');
    const internalStatus = document.getElementById('internal-status');
    const internalCharging = document.getElementById('internal-charging');
    const internalContainer = document.getElementById('battery-internal-container');
    
    if (internalFill && internalPct) {
      internalFill.style.width = batteryInternal + '%';
      internalPct.textContent = batteryInternal + '%';
      
      if (batteryInternal >= 90) {
        internalStatus.innerHTML = '<svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> FULL';
        internalStatus.className = 'text-[7px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1';
        internalFill.classList.remove('battery-fill-charging');
        internalContainer.classList.remove('battery-charging-glow');
      } else if (batteryInternal <= 20) {
        internalStatus.innerHTML = '<svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg> LOW';
        internalStatus.className = 'text-[7px] font-bold text-red-500 dark:text-red-400 flex items-center gap-1';
        internalFill.classList.remove('battery-fill-charging');
        internalContainer.classList.remove('battery-charging-glow');
      } else {
        internalStatus.innerHTML = '<svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg> CHARGING';
        internalStatus.className = 'text-[7px] font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1';
        internalFill.classList.add('battery-fill-charging');
        internalContainer.classList.add('battery-charging-glow');
      }
    }
    
    const secondaryFill = document.getElementById('battery-secondary-fill');
    const secondaryPct = document.getElementById('battery-secondary-pct');
    const secondaryContainer = document.getElementById('battery-secondary-container');
    const secondaryStatus = document.getElementById('secondary-status');
    
    if (secondaryFill && secondaryPct) {
      secondaryFill.style.width = batterySecondary + '%';
      secondaryPct.textContent = batterySecondary + '%';
      
      if (batterySecondary >= 90) {
        if (secondaryStatus) {
          secondaryStatus.innerHTML = '<svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> FULL';
          secondaryStatus.className = 'text-[7px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1';
        }
        secondaryFill.classList.remove('battery-fill-charging-blue');
        secondaryContainer.classList.remove('battery-charging-glow-blue');
      } else if (batterySecondary <= 20) {
        if (secondaryStatus) {
          secondaryStatus.innerHTML = '<svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg> LOW - NEEDS SWAP';
          secondaryStatus.className = 'text-[7px] font-bold text-red-500 dark:text-red-400 flex items-center gap-1';
        }
        secondaryFill.classList.remove('battery-fill-charging-blue');
        secondaryContainer.classList.remove('battery-charging-glow-blue');
      } else {
        if (secondaryStatus) {
          secondaryStatus.innerHTML = '<svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg> CHARGING';
          secondaryStatus.className = 'text-[7px] font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1';
        }
        secondaryFill.classList.add('battery-fill-charging-blue');
        secondaryContainer.classList.add('battery-charging-glow-blue');
      }
    }
  }, 800);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 23: CONTROL SCREEN - TARE
// ═══════════════════════════════════════════════════════════════════════════════
let liveWeightCtrl = 342;
let initialWeightCtrl = 500;
let sessionActiveCtrl = false;
let sessionSecsCtrl = 15 * 60 + 30;
let sessionIntervalCtrl = null;

function doTareCtrl() {
  liveWeightCtrl = 0;
  document.getElementById('live-weight-ctrl').textContent = '0';
  document.getElementById('wt-badge-ctrl').textContent = 'TARED';
  document.getElementById('wt-badge-ctrl').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
  showToast('⚖️ Scale tared to zero');
  setTimeout(() => {
    liveWeightCtrl = 500;
    document.getElementById('live-weight-ctrl').textContent = '500';
    document.getElementById('wt-badge-ctrl').textContent = 'READY';
    document.getElementById('wt-badge-ctrl').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400';
    showToast('📦 500g detected · Ready to start');
  }, 1800);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 24: CONTROL SCREEN - SESSION
// ═══════════════════════════════════════════════════════════════════════════════
function startSessionCtrl() {
  if (liveWeightCtrl < 10) {
    showToast('⚠️ Add waste first, then TARE');
    return;
  }
  sessionActiveCtrl = true;
  initialWeightCtrl = liveWeightCtrl;
  document.getElementById('initial-wt-ctrl').textContent = initialWeightCtrl + 'g';
  document.getElementById('sess-initial-ctrl').textContent = initialWeightCtrl;
  document.getElementById('sess-current-ctrl').textContent = liveWeightCtrl;
  document.getElementById('active-session-card-ctrl').style.display = 'block';
  document.getElementById('start-session-btn-ctrl').disabled = true;
  document.getElementById('start-session-btn-ctrl').style.opacity = '0.5';
  document.getElementById('wt-badge-ctrl').textContent = 'BURNING';
  document.getElementById('wt-badge-ctrl').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
  showToast('🔥 Session #001 started · ' + initialWeightCtrl + 'g saved');
  
  sessionActive = true;
  liveWeight = liveWeightCtrl;
  initialWeight = initialWeightCtrl;
  document.getElementById('live-weight').textContent = liveWeightCtrl;
  document.getElementById('active-session-card').style.display = 'block';
  document.getElementById('start-session-btn').disabled = true;
  document.getElementById('start-session-btn').style.opacity = '0.5';
  document.getElementById('wt-badge').textContent = 'BURNING';
  document.getElementById('wt-badge').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
  document.getElementById('initial-wt').textContent = initialWeightCtrl + 'g';
  document.getElementById('sess-initial').textContent = initialWeightCtrl;
  document.getElementById('sess-current').textContent = initialWeightCtrl;
  
  sessionIntervalCtrl = setInterval(() => {
    if (liveWeightCtrl > 50) {
      liveWeightCtrl = Math.max(50, liveWeightCtrl - Math.floor(Math.random() * 4 + 1));
      liveWeight = liveWeightCtrl;
      sessionSecsCtrl++;
      sessionSecs++;
      const m1 = Math.floor(sessionSecsCtrl / 60).toString().padStart(2, '0');
      const s1 = (sessionSecsCtrl % 60).toString().padStart(2, '0');
      const m2 = Math.floor(sessionSecs / 60).toString().padStart(2, '0');
      const s2 = (sessionSecs % 60).toString().padStart(2, '0');
      document.getElementById('live-weight-ctrl').textContent = liveWeightCtrl;
      document.getElementById('sess-current-ctrl').textContent = liveWeightCtrl;
      document.getElementById('live-weight').textContent = liveWeightCtrl;
      document.getElementById('sess-current').textContent = liveWeightCtrl;
      document.getElementById('sess-timer-ctrl').textContent = m1 + ':' + s1;
      document.getElementById('sess-timer').textContent = m2 + ':' + s2;
    } else {
      clearInterval(sessionIntervalCtrl);
      showToast('🔔 Fire Out detected · Click END SESSION');
    }
  }, 800);
}

function endSessionCtrl() {
  sessionActiveCtrl = false;
  clearInterval(sessionIntervalCtrl);
  const burned = initialWeightCtrl - liveWeightCtrl;
  document.getElementById('active-session-card-ctrl').style.display = 'none';
  document.getElementById('start-session-btn-ctrl').disabled = false;
  document.getElementById('start-session-btn-ctrl').style.opacity = '1';
  document.getElementById('wt-badge-ctrl').textContent = 'COMPLETE';
  document.getElementById('wt-badge-ctrl').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400';
  showToast('✅ Session ended · ' + burned + 'g burned · Data saved');
  
  sessionActive = false;
  liveWeight = 0;
  initialWeight = 0;
  document.getElementById('live-weight').textContent = '0';
  document.getElementById('active-session-card').style.display = 'none';
  document.getElementById('start-session-btn').disabled = false;
  document.getElementById('start-session-btn').style.opacity = '1';
  document.getElementById('wt-badge').textContent = 'COMPLETE';
  document.getElementById('wt-badge').className = 'ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400';
  document.getElementById('initial-wt').textContent = '—';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 25: USB CHARGING SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════
let usbOn = false;
let usbEnergy = 0;
let usbDevices = 0;
let usbInterval = null;

function toggleUSB() {
  usbOn = !usbOn;
  const btn = document.getElementById('usb-toggle-btn');
  const dot = document.getElementById('usb-dot');
  const text = document.getElementById('usb-text');
  const statusEl = document.getElementById('residents-status');
  const headerBtn = document.getElementById('header-charge-btn');
  const chargeIconOff = document.getElementById('charge-icon-off');
  const chargeIconOn = document.getElementById('charge-icon-on');
  
  if (usbOn) {
    btn.className = 'w-full py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 ripple bg-blue-500 text-white';
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10M18.4 6.6L16 9M5.6 6.6L8 9"/></svg> CHARGING ACTIVE';
    dot.style.background = '#4CAF50';
    text.textContent = 'Active';
    text.className = 'text-[9px] font-bold text-eco-700';
    if (statusEl) {
      statusEl.textContent = 'CHARGING';
      statusEl.className = 'text-[8px] font-bold text-eco-700 bg-eco-50 dark:bg-eco-900/20 px-2 py-1 rounded-full';
    }
    if (headerBtn) headerBtn.style.background = '#E8F5E9';
    if (chargeIconOff) chargeIconOff.classList.add('hidden');
    if (chargeIconOn) chargeIconOn.classList.remove('hidden');
    showToast('🔌 USB Charging Port Enabled');
  } else {
    btn.className = 'w-full py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 ripple bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10M18.4 6.6L16 9M5.6 6.6L8 9"/></svg> ENABLE CHARGING';
    dot.style.background = '#9E9E9E';
    text.textContent = 'Inactive';
    text.className = 'text-[9px] font-bold text-gray-500';
    if (statusEl) {
      statusEl.textContent = 'IDLE';
      statusEl.className = 'text-[8px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full';
    }
    if (headerBtn) headerBtn.style.background = 'transparent';
    if (chargeIconOff) chargeIconOff.classList.remove('hidden');
    if (chargeIconOn) chargeIconOn.classList.add('hidden');
    showToast('⏹ USB Charging Port Disabled');
  }
}

function startUSBSim() {
  usbInterval = setInterval(() => {
    if (!usbOn) return;
    
    usbEnergy += (Math.random() * 0.4 + 0.1);
    
    const energyEl = document.getElementById('usb-energy');
    const devicesEl = document.getElementById('usb-devices');
    const valueEl = document.getElementById('usb-value');
    
    if (energyEl) energyEl.textContent = usbEnergy.toFixed(1);
    if (devicesEl) devicesEl.textContent = Math.floor(usbEnergy / 5);
    if (valueEl) valueEl.textContent = '₱' + Math.floor(usbEnergy * 1.2);
    
    const residentEnergy = document.getElementById('resident-energy');
    const residentDevices = document.getElementById('resident-devices');
    const residentValue = document.getElementById('resident-value');
    const residentPhones = document.getElementById('resident-phones');
    
    if (residentEnergy) residentEnergy.textContent = Math.floor(45 + usbEnergy);
    if (residentDevices) residentDevices.textContent = Math.floor(12 + usbEnergy / 5);
    if (residentValue) residentValue.textContent = '₱' + Math.floor(54 + usbEnergy * 1.2);
    if (residentPhones) residentPhones.textContent = Math.floor(9 + usbEnergy / 5);
  }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 26: INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  try {
    initCharts();
  } catch(e) { console.error('initCharts error:', e); }
  try {
    startCtrlTimer();
  } catch(e) { console.error('startCtrlTimer error:', e); }
  try {
    startLiveSim();
  } catch(e) { console.error('startLiveSim error:', e); }
  try {
    startBatterySim();
  } catch(e) { console.error('startBatterySim error:', e); }
  try {
    startGaugeSim();
  } catch(e) { console.error('startGaugeSim error:', e); }
  try {
    startLiveSessionSim();
  } catch(e) { console.error('startLiveSessionSim error:', e); }
  try {
    startUSBSim();
  } catch(e) { console.error('startUSBSim error:', e); }
});
