/**
 * chart.js — Community area 24-hour population chart (D3)
 */

const Chart = (() => {

  const DAY_COLORS = [
    "#58a6ff",  // Mon — blue
    "#79c0ff",  // Tue
    "#a5d6ff",  // Wed
    "#58a6ff",  // Thu
    "#388bfd",  // Fri
    "#f0883e",  // Sat — orange
    "#d29922"   // Sun — gold
  ];
  const DAY_NAMES  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const HOURS      = Array.from({length:24}, (_,i) => i);

  let _areaData    = null;   // community_areas_hourly.json
  let _panel       = null;
  let _svg         = null;
  let _width       = 0;
  let _height      = 0;
  let _margin      = { top: 20, right: 20, bottom: 36, left: 52 };

  async function init() {
    try {
      const resp = await fetch("./data/community_areas_hourly.json");
      if (!resp.ok) throw new Error("Community area data not found");
      _areaData = await resp.json();
      console.log(`Chart: loaded ${_areaData.areas.length} community areas`);
    } catch (e) {
      console.warn("Chart data not available:", e.message);
    }
    _buildPanel();
  }

  function _buildPanel() {
    // Create panel
    _panel = document.createElement("div");
    _panel.id = "chart-panel";
    _panel.className = "hidden";
    _panel.innerHTML = `
      <div class="chart-header">
        <div class="chart-title-row">
          <span id="chart-area-name">—</span>
          <button id="chart-close">✕</button>
        </div>
        <div class="chart-legend" id="chart-legend"></div>
      </div>
      <div id="chart-svg-container"></div>
      <div class="chart-footer">
        <span id="chart-peak-info"></span>
      </div>
    `;
    document.getElementById("map-container").appendChild(_panel);
    document.getElementById("chart-close")
            .addEventListener("click", hide);
  }

  function show(areaNum, areaName) {
    if (!_areaData) return;

    const areaIdx = _areaData.areas.findIndex(a => a.area_num === areaNum);
    if (areaIdx < 0) return;

    // Build 7 × 24 data matrix
    const series = Array.from({length:7}, (_, day) => ({
      day,
      values: HOURS.map(h => _areaData.hourly[day]?.[h]?.[areaIdx] ?? 0)
    }));

    _panel.classList.remove("hidden");
    document.getElementById("chart-area-name").textContent = areaName;
    _render(series, areaName);
    _buildLegend();
    _setPeakInfo(series);
  }

  function hide() {
    _panel.classList.add("hidden");
  }

  function _render(series, areaName) {
    const container = document.getElementById("chart-svg-container");
    container.innerHTML = "";

    const W = container.clientWidth  || 300;
    const H = 180;
    _width  = W - _margin.left - _margin.right;
    _height = H - _margin.top  - _margin.bottom;

    const allVals = series.flatMap(s => s.values);
    const maxVal  = d3.max(allVals) || 1;

    const xScale = d3.scaleLinear().domain([0, 23]).range([0, _width]);
    const yScale = d3.scaleLinear().domain([0, maxVal * 1.1]).range([_height, 0]);

    const svg = d3.select(container)
      .append("svg")
      .attr("width",  W)
      .attr("height", H);

    const g = svg.append("g")
      .attr("transform", `translate(${_margin.left},${_margin.top})`);

    // Grid lines
    g.append("g").attr("class","grid")
      .call(d3.axisLeft(yScale).ticks(4)
              .tickSize(-_width).tickFormat(""))
      .selectAll("line").style("stroke","rgba(48,54,61,0.8)");
    g.select(".grid .domain").remove();

    // X axis
    g.append("g").attr("class","x-axis")
      .attr("transform", `translate(0,${_height})`)
      .call(d3.axisBottom(xScale)
              .ticks(12)
              .tickFormat(h => h === 0 ? "12a" : h === 12 ? "12p"
                              : h < 12 ? `${h}a` : `${h-12}p`))
      .selectAll("text")
      .style("fill","#8b949e").style("font-size","10px");
    g.select(".x-axis .domain").style("stroke","#30363d");
    g.selectAll(".x-axis .tick line").style("stroke","#30363d");

    // Y axis
    g.append("g").attr("class","y-axis")
      .call(d3.axisLeft(yScale).ticks(4)
              .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d))
      .selectAll("text")
      .style("fill","#8b949e").style("font-size","10px");
    g.select(".y-axis .domain").style("stroke","#30363d");
    g.selectAll(".y-axis .tick line").style("stroke","#30363d");

    const line = d3.line()
      .x((_, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Draw lines — weekdays thin, weekend bold
    series.forEach(s => {
      const isWeekend = s.day >= 5;
      g.append("path")
        .datum(s.values)
        .attr("fill", "none")
        .attr("stroke", DAY_COLORS[s.day])
        .attr("stroke-width", isWeekend ? 2.5 : 1.5)
        .attr("stroke-opacity", isWeekend ? 1 : 0.7)
        .attr("d", line);
    });

    // Hover crosshair
    const focus = g.append("g").attr("class","focus").style("display","none");
    focus.append("line").attr("class","focus-line")
      .attr("y1", 0).attr("y2", _height)
      .style("stroke","rgba(255,255,255,0.3)")
      .style("stroke-width", 1)
      .style("stroke-dasharray","3,3");

    const tooltip = d3.select(container).append("div")
      .attr("class","chart-crosshair-tip hidden");

    svg.append("rect")
      .attr("class","overlay")
      .attr("transform", `translate(${_margin.left},${_margin.top})`)
      .attr("width", _width).attr("height", _height)
      .style("fill","none").style("pointer-events","all")
      .on("mousemove", function(event) {
        const [mx] = d3.pointer(event);
        const hour = Math.round(xScale.invert(mx));
        if (hour < 0 || hour > 23) return;

        focus.style("display", null);
        focus.select(".focus-line")
          .attr("x1", xScale(hour)).attr("x2", xScale(hour));

        const fmt = h => h === 0 ? "12 AM" : h === 12 ? "12 PM"
                        : h < 12 ? `${h} AM` : `${h-12} PM`;

        let html = `<div class="ctt-hour">${fmt(hour)}</div>`;
        series.forEach(s => {
          const val = s.values[hour];
          html += `<div class="ctt-row">
            <span class="ctt-dot" style="background:${DAY_COLORS[s.day]}"></span>
            <span class="ctt-day">${DAY_NAMES[s.day]}</span>
            <span class="ctt-val">${val.toLocaleString()}</span>
          </div>`;
        });
        tooltip.html(html).classed("hidden", false)
          .style("left", (mx + _margin.left + 8) + "px")
          .style("top",  "10px");
      })
      .on("mouseleave", () => {
        focus.style("display","none");
        tooltip.classed("hidden", true);
      });
  }

  function _buildLegend() {
    const el = document.getElementById("chart-legend");
    el.innerHTML = DAY_NAMES.map((d, i) => `
      <span class="chart-leg-item">
        <span class="chart-leg-dot" style="background:${DAY_COLORS[i]}"></span>
        ${d}
      </span>
    `).join("");
  }

  function _setPeakInfo(series) {
    let peakVal = 0, peakDay = 0, peakHour = 0;
    series.forEach(s => {
      s.values.forEach((v, h) => {
        if (v > peakVal) { peakVal = v; peakDay = s.day; peakHour = h; }
      });
    });
    const fmt = h => h < 12 ? `${h||12} AM` : `${h-12||12} PM`;
    document.getElementById("chart-peak-info").textContent =
      `Peak: ${peakVal.toLocaleString()} people · ${DAY_NAMES[peakDay]} ${fmt(peakHour)}`;
  }

  return { init, show, hide };
})();
