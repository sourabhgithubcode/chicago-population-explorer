/**
 * main.js — Application entry point, wires everything together
 */

(async () => {

  // Show loading state
  const loadingEl = document.createElement("div");
  loadingEl.id = "loading-overlay";
  loadingEl.innerHTML = `
    <div class="spinner"></div>
    <h2>Chicago Population Explorer</h2>
    <p>Loading map and data...</p>
  `;
  document.body.appendChild(loadingEl);

  try {
    // Initialize map first (needs DOM)
    const mapReady = MapView.init((areaNum, areaName) => {
      Chart.show(areaNum, areaName);
    });

    // Load population data
    let dataReady;
    try {
      dataReady = AppData.load();
      await dataReady;
    } catch (e) {
      // Data not yet generated — show demo mode with empty map
      console.warn("Population data not found. Run pipeline/fetch_census.py, fetch_cta.py, process.py");
      document.getElementById("stats-total").textContent = "Run pipeline";
    }

    await mapReady;
    await Chart.init();
    loadingEl.remove();

  } catch (err) {
    loadingEl.innerHTML = `
      <h2>Error loading map</h2>
      <p>${err.message}</p>
      <p style="font-size:11px;color:#8b949e;margin-top:8px">Check console for details.</p>
    `;
    console.error(err);
    return;
  }

  // ---- State ----
  let timeIndex  = 0;   // 0–167
  let isPlaying  = false;
  let playTimer  = null;
  let mode       = "absolute";

  const blocks   = AppData.getBlocks();

  // ---- Initial render ----
  MapView.buildLegend(mode);
  renderTimeIndex(0);

  // ---- Story ----
  Story.init(({ day, hour }) => {
    const index = day * 24 + hour;
    setTimeIndex(index);
    syncSlider(index);
    syncTimeDisplay(day, hour);
  });

  // ---- Tab switching ----
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".side-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(`panel-${btn.dataset.tab}`);
      if (panel) panel.classList.add("active");
    });
  });

  // ---- Play / Pause ----
  document.getElementById("btn-play").addEventListener("click", () => {
    isPlaying = !isPlaying;
    document.getElementById("btn-play").innerHTML = isPlaying ? "&#9646;&#9646;" : "&#9654;";
    if (isPlaying) startPlayback();
    else stopPlayback();
  });

  function startPlayback() {
    const speed = Number(document.getElementById("speed-select").value);
    playTimer = setInterval(() => {
      timeIndex = (timeIndex + 1) % 168;
      syncSlider(timeIndex);
      const { day, hour } = AppData.timeIndexToDayHour(timeIndex);
      renderTimeIndex(timeIndex);
      syncTimeDisplay(day, hour);
    }, speed);
  }

  function stopPlayback() {
    clearInterval(playTimer);
  }

  document.getElementById("speed-select").addEventListener("change", () => {
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  });

  // ---- Slider ----
  document.getElementById("time-slider").addEventListener("input", (e) => {
    const idx = Number(e.target.value);
    setTimeIndex(idx);
    const { day, hour } = AppData.timeIndexToDayHour(idx);
    syncTimeDisplay(day, hour);
  });

  // ---- Mode toggle ----
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      MapView.setMode(mode);
      MapView.buildLegend(mode);
      renderTimeIndex(timeIndex);
    });
  });

  // ---- Core render ----
  function renderTimeIndex(index) {
    const { day, hour } = AppData.timeIndexToDayHour(index);
    const pops    = AppData.getHourlyPop(day, hour);
    const changes = AppData.getChange(day, hour);
    MapView.update(day, hour, blocks, pops, changes);
    updateStatsOverlay(day, hour);
  }

  function setTimeIndex(index) {
    timeIndex = index;
    renderTimeIndex(index);
  }

  function syncSlider(index) {
    document.getElementById("time-slider").value = index;
  }

  function syncTimeDisplay(day, hour) {
    document.getElementById("day-label").textContent  = AppData.DAY_NAMES[day];
    document.getElementById("hour-label").textContent = AppData.formatHour(hour);
  }

  function updateStatsOverlay(day, hour) {
    const total    = AppData.getTotalPop(day, hour);
    const baseline = AppData.getTotalPop(0, 3);
    const change   = total - baseline;
    const sign     = change >= 0 ? "+" : "";
    const pct      = baseline > 0 ? ((change / baseline) * 100).toFixed(1) : 0;

    const totalEl  = document.getElementById("stat-total");
    const changeEl = document.getElementById("stat-change");

    if (totalEl)  totalEl.textContent  = total > 0 ? total.toLocaleString() : "—";
    if (changeEl) {
      changeEl.textContent = change !== 0
        ? `${sign}${change.toLocaleString()} (${sign}${pct}%)`
        : "Baseline";
      changeEl.className = "stat-value " + (change > 0 ? "positive" : change < 0 ? "negative" : "");
    }
  }

})();
