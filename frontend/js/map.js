/**
 * map.js — Mapbox GL map initialization and 3D population rendering
 */

const MapView = (() => {

  let _map = null;
  let _mode = "absolute"; // or "change"
  let _currentDay  = 0;
  let _currentHour = 0;
  let _geojsonData = null;

  // Color scales
  const ABSOLUTE_COLORS = [
    [0,     "#051e54"],
    [50,    "#0d47a1"],
    [200,   "#1565c0"],
    [500,   "#1976d2"],
    [1000,  "#e65100"],
    [2000,  "#e53935"],
    [5000,  "#c62828"],
    [10000, "#b71c1c"],
    [20000, "#ff1744"]
  ];

  const CHANGE_COLORS = [
    [-10000, "#1a237e"],
    [-5000,  "#283593"],
    [-1000,  "#3949ab"],
    [-200,   "#7986cb"],
    [0,      "#263238"],
    [200,    "#ef6c00"],
    [1000,   "#e53935"],
    [5000,   "#c62828"],
    [10000,  "#b71c1c"]
  ];

  const HEIGHT_SCALE = 0.02; // metres per person

  function init() {
    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

    _map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-87.6298, 41.8781], // Chicago
      zoom: 11,
      pitch: 45,
      bearing: -10,
      antialias: true
    });

    _map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    _map.addControl(new mapboxgl.ScaleControl({ unit: "imperial" }), "bottom-left");

    return new Promise(resolve => {
      _map.on("load", () => {
        _map.addSource("population", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });

        // Extruded 3D bars for population
        _map.addLayer({
          id: "population-extrusion",
          type: "fill-extrusion",
          source: "population",
          paint: {
            "fill-extrusion-color": ["get", "color"],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.85
          }
        });

        // Hover outline
        _map.addLayer({
          id: "population-outline",
          type: "line",
          source: "population",
          paint: {
            "line-color": "rgba(255,255,255,0.05)",
            "line-width": 0.3
          }
        });

        _setupInteractions();
        resolve(_map);
      });
    });
  }

  function _colorForValue(value, scale) {
    const stops = scale;
    if (value <= stops[0][0]) return stops[0][1];
    if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
    for (let i = 1; i < stops.length; i++) {
      if (value <= stops[i][0]) {
        return stops[i][1];
      }
    }
    return stops[stops.length - 1][1];
  }

  function _buildGeoJSON(blocks, populations, changes) {
    const scale = _mode === "absolute" ? ABSOLUTE_COLORS : CHANGE_COLORS;

    return {
      type: "FeatureCollection",
      features: blocks.map((block, i) => {
        const pop    = populations[i] ?? 0;
        const change = changes[i] ?? 0;
        const value  = _mode === "absolute" ? pop : change;
        const height = Math.max(0, Math.abs(value) * HEIGHT_SCALE);

        return {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [_blockToPolygon(block.lon, block.lat)]
          },
          properties: {
            geoid:      block.id,
            population: pop,
            change:     change,
            base_pop:   block.base_pop,
            color:      _colorForValue(value, scale),
            height:     height
          }
        };
      })
    };
  }

  /**
   * Approximate block as a small square around centroid
   * Real pipeline uses actual polygon geometry from GeoJSON
   */
  function _blockToPolygon(lon, lat) {
    const d = 0.0015; // ~150m
    return [
      [lon - d, lat - d],
      [lon + d, lat - d],
      [lon + d, lat + d],
      [lon - d, lat + d],
      [lon - d, lat - d]
    ];
  }

  function update(day, hour, blocks, populations, changes) {
    _currentDay  = day;
    _currentHour = hour;

    const geojson = _buildGeoJSON(blocks, populations, changes);
    _geojsonData = geojson;

    const source = _map.getSource("population");
    if (source) source.setData(geojson);
  }

  function setMode(mode) {
    _mode = mode;
  }

  function _setupInteractions() {
    const tooltip = document.getElementById("tooltip");

    _map.on("mousemove", "population-extrusion", (e) => {
      _map.getCanvas().style.cursor = "pointer";
      const props = e.features[0]?.properties;
      if (!props) return;

      const pop    = Number(props.population).toLocaleString();
      const change = Number(props.change);
      const base   = Number(props.base_pop).toLocaleString();
      const sign   = change >= 0 ? "+" : "";

      tooltip.innerHTML = `
        <div class="tt-title">Census Block</div>
        <div class="tt-row">
          <span>Current pop</span>
          <span class="tt-val">${pop}</span>
        </div>
        <div class="tt-row">
          <span>Overnight base</span>
          <span class="tt-val">${base}</span>
        </div>
        <div class="tt-row">
          <span>Change</span>
          <span class="tt-val" style="color:${change >= 0 ? '#56d364' : '#f85149'}">${sign}${Number(change).toLocaleString()}</span>
        </div>
      `;
      tooltip.classList.remove("hidden");
      tooltip.style.left = (e.originalEvent.clientX + 14) + "px";
      tooltip.style.top  = (e.originalEvent.clientY - 10) + "px";
    });

    _map.on("mouseleave", "population-extrusion", () => {
      _map.getCanvas().style.cursor = "";
      tooltip.classList.add("hidden");
    });
  }

  function buildLegend(mode) {
    const scale   = mode === "absolute" ? ABSOLUTE_COLORS : CHANGE_COLORS;
    const el      = document.getElementById("legend-scale");
    el.innerHTML  = "";

    const labels  = mode === "absolute"
      ? ["0","50","200","500","1k","2k","5k","10k","20k+"]
      : ["-10k","-5k","-1k","-200","0","+200","+1k","+5k","+10k+"];

    scale.forEach(([, color], i) => {
      const row = document.createElement("div");
      row.className = "legend-row";
      row.innerHTML = `
        <div class="legend-swatch" style="background:${color}"></div>
        <span class="legend-label">${labels[i]}</span>
      `;
      el.appendChild(row);
    });
  }

  function flyToChicago() {
    _map.flyTo({
      center: [-87.6298, 41.8781],
      zoom: 11,
      pitch: 45,
      bearing: -10,
      duration: 1500
    });
  }

  function flyTo(lng, lat, zoom = 13) {
    _map.flyTo({ center: [lng, lat], zoom, duration: 1200 });
  }

  return { init, update, setMode, buildLegend, flyToChicago, flyTo };
})();
