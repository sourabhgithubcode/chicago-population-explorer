/**
 * main.js — Application entry point
 */

(async () => {

  const loadingEl = document.createElement("div");
  loadingEl.id = "loading-overlay";
  loadingEl.innerHTML = `
    <div class="spinner"></div>
    <h2>Chicago Population Explorer</h2>
    <p>Loading map and data...</p>
  `;
  document.body.appendChild(loadingEl);

  try {
    const mapReady = MapView.init((areaNum, areaName) => {
      Chart.show(areaNum, areaName);
    });

    try {
      await AppData.load();
    } catch (e) {
      console.warn("Population data not found. Run the pipeline first.");
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

  // ── State ──────────────────────────────────────────────────────────────
  let currentDay  = 0;
  let currentHour = 0;
  let isPlaying   = false;
  let playTimer   = null;
  let mode        = "absolute";

  const blocks = AppData.getBlocks();

  // ── Initial render ─────────────────────────────────────────────────────
  MapView.setExaggeration(3.0);
  MapView.buildLegend(mode);
  render(0, 0);

  // ── Story ──────────────────────────────────────────────────────────────
  Story.init(({ day, hour }) => {
    setDayHour(day, hour);
  });

  // ── Nav tabs ───────────────────────────────────────────────────────────
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".side-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(`panel-${btn.dataset.tab}`);
      if (panel) panel.classList.add("active");
    });
  });

  // ── Day tabs ───────────────────────────────────────────────────────────
  document.querySelectorAll(".day-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      setDayHour(parseInt(btn.dataset.day), currentHour);
    });
  });

  // ── Hour slider ────────────────────────────────────────────────────────
  document.getElementById("hour-slider").addEventListener("input", (e) => {
    setDayHour(currentDay, parseInt(e.target.value));
  });

  // ── Play / Pause ───────────────────────────────────────────────────────
  document.getElementById("btn-play").addEventListener("click", () => {
    isPlaying = !isPlaying;
    document.getElementById("btn-play").innerHTML = isPlaying ? "&#9646;&#9646;" : "&#9654;";
    isPlaying ? startPlayback() : stopPlayback();
  });

  function startPlayback() {
    const speed = Number(document.getElementById("speed-select").value);
    playTimer = setInterval(() => {
      let h = currentHour + 1;
      let d = currentDay;
      if (h > 23) { h = 0; d = (d + 1) % 7; }
      setDayHour(d, h);
    }, speed);
  }

  function stopPlayback() { clearInterval(playTimer); }

  document.getElementById("speed-select").addEventListener("change", () => {
    if (isPlaying) { stopPlayback(); startPlayback(); }
  });

  // ── Exaggeration slider ────────────────────────────────────────────────
  document.getElementById("exaggeration-slider").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("exaggeration-label").textContent = val + "×";
    MapView.setExaggeration(val);
    render(currentDay, currentHour);
  });

  // ── Mode toggle ────────────────────────────────────────────────────────
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      MapView.setMode(mode);
      MapView.buildLegend(mode);
      render(currentDay, currentHour);
    });
  });

  // ── Core ───────────────────────────────────────────────────────────────
  function setDayHour(day, hour) {
    currentDay  = day;
    currentHour = hour;

    // Sync day tabs
    document.querySelectorAll(".day-tab").forEach(btn => {
      btn.classList.toggle("active", parseInt(btn.dataset.day) === day);
    });

    // Sync hour slider
    document.getElementById("hour-slider").value = hour;
    document.getElementById("hour-label").textContent = AppData.formatHour(hour);

    render(day, hour);
  }

  function render(day, hour) {
    const pops    = AppData.getHourlyPop(day, hour);
    const changes = AppData.getChange(day, hour);
    MapView.update(day, hour, blocks, pops, changes);
    updateStats(day, hour);
  }

  function updateStats(day, hour) {
    const total    = AppData.getTotalPop(day, hour);
    const baseline = AppData.getTotalPop(0, 3);
    const change   = total - baseline;
    const sign     = change >= 0 ? "+" : "";
    const pct      = baseline > 0 ? ((change / baseline) * 100).toFixed(1) : 0;

    const totalEl  = document.getElementById("stat-total");
    const changeEl = document.getElementById("stat-change");

    if (totalEl)  totalEl.textContent = total > 0 ? total.toLocaleString() : "—";
    if (changeEl) {
      changeEl.textContent = change !== 0
        ? `${sign}${change.toLocaleString()} (${sign}${pct}%)`
        : "Baseline";
      changeEl.className = "stat-value " +
        (change > 0 ? "positive" : change < 0 ? "negative" : "");
    }
  }

})();
