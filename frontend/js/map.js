/**
 * map.js — Mapbox GL map with smooth animation + community area overlay
 */

const MapView = (() => {

  let _map           = null;
  let _mode          = "absolute";
  let _geojsonCache  = null;    // full GeoJSON with stable features

  // Smooth animation state
  let _currentHeights = [];     // per-feature current rendered height
  let _targetHeights  = [];     // per-feature target height
  let _currentColors  = [];
  let _targetColors   = [];
  let _animFrame      = null;
  let _animStart      = null;
  const ANIM_MS       = 500;    // animation duration

  // Community areas
  let _communityAreasLoaded = false;
  let _onAreaClick = null;

  const ABSOLUTE_SCALE = [
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

  const CHANGE_SCALE = [
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

  const HEIGHT_SCALE_BASE = 0.40;   // tall base — visible at Cook County zoom
  let   _exaggeration    = 3.0;     // default 3× — slider starts here

  // ── Init ────────────────────────────────────────────────────────────────

  // Cook County bounds (includes Chicago + immediate ring)
  const COOK_COUNTY_BOUNDS = [
    [-88.2635, 41.4690],   // SW corner
    [-87.5240, 42.1545]    // NE corner
  ];

  function init(onAreaClick) {
    _onAreaClick = onAreaClick;
    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

    _map = new mapboxgl.Map({
      container:  "map",
      style:      "mapbox://styles/mapbox/dark-v11",
      center:     [-87.6298, 41.8781],
      zoom:       10.5,
      minZoom:    9.5,
      maxZoom:    16,
      pitch:      50,
      bearing:    -10,
      antialias:  true,
      maxBounds:  [
        [-88.35, 41.38],   // SW — slight padding outside Cook County
        [-87.42, 42.23]    // NE — slight padding outside Cook County
      ]
    });

    _map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    _map.addControl(new mapboxgl.ScaleControl({ unit: "imperial" }), "bottom-left");

    return new Promise(resolve => {
      _map.on("load", () => {
        // Population extrusion layer
        _map.addSource("population", {
          type: "geojson",
          data: { type:"FeatureCollection", features:[] }
        });
        _map.addLayer({
          id:   "population-extrusion",
          type: "fill-extrusion",
          source: "population",
          paint: {
            "fill-extrusion-color":   ["get","color"],
            "fill-extrusion-height":  ["get","height"],
            "fill-extrusion-base":    0,
            "fill-extrusion-opacity": 0.85
          }
        });
        _map.addLayer({
          id:   "population-outline",
          type: "line",
          source: "population",
          paint: {
            "line-color": "rgba(255,255,255,0.04)",
            "line-width": 0.3
          }
        });

        _loadCommunityAreas();
        _setupBlockInteraction();
        resolve(_map);
      });
    });
  }

  // ── Community Areas ─────────────────────────────────────────────────────

  async function _loadCommunityAreas() {
    try {
      const resp = await fetch("./data/community_areas.geojson");
      if (!resp.ok) throw new Error("Community areas not found");
      const geojson = await resp.json();

      _map.addSource("community-areas", { type:"geojson", data: geojson });

      // Invisible fill for click detection
      _map.addLayer({
        id:     "community-areas-fill",
        type:   "fill",
        source: "community-areas",
        paint:  { "fill-color":"transparent", "fill-opacity":0 }
      });

      // Boundary lines
      _map.addLayer({
        id:     "community-areas-border",
        type:   "line",
        source: "community-areas",
        paint:  {
          "line-color": "rgba(255,255,255,0.18)",
          "line-width": 1.2,
          "line-dasharray": [3, 2]
        }
      });

      // Hover highlight
      _map.addLayer({
        id:     "community-areas-hover",
        type:   "fill",
        source: "community-areas",
        paint:  {
          "fill-color":   "rgba(88,166,255,0.12)",
          "fill-opacity": ["case",
            ["boolean",["feature-state","hovered"],false], 1, 0
          ]
        }
      });

      // Labels — show at zoom 11+
      _map.addLayer({
        id:     "community-areas-labels",
        type:   "symbol",
        source: "community-areas",
        minzoom: 11,
        layout: {
          "text-field":       ["get","name"],
          "text-size":        11,
          "text-font":        ["DIN Pro Medium","Arial Unicode MS Regular"],
          "text-max-width":   8,
          "text-anchor":      "center",
          "text-allow-overlap": false
        },
        paint: {
          "text-color":       "rgba(230,237,243,0.75)",
          "text-halo-color":  "rgba(13,17,23,0.8)",
          "text-halo-width":  1.5
        }
      });

      _setupCommunityAreaInteraction();
      _communityAreasLoaded = true;
      console.log("Community areas loaded:", geojson.features.length);
    } catch (e) {
      console.warn("Community areas not loaded:", e.message,
                   "— run build_community_areas.py");
    }
  }

  let _hoveredAreaId = null;

  function _setupCommunityAreaInteraction() {
    _map.on("mousemove", "community-areas-fill", (e) => {
      _map.getCanvas().style.cursor = "pointer";
      const id = e.features[0]?.id ?? e.features[0]?.properties?.area_num;
      if (_hoveredAreaId !== null) {
        _map.setFeatureState(
          { source:"community-areas", id: _hoveredAreaId }, { hovered: false }
        );
      }
      _hoveredAreaId = id;
      _map.setFeatureState(
        { source:"community-areas", id }, { hovered: true }
      );
    });

    _map.on("mouseleave", "community-areas-fill", () => {
      _map.getCanvas().style.cursor = "";
      if (_hoveredAreaId !== null) {
        _map.setFeatureState(
          { source:"community-areas", id: _hoveredAreaId }, { hovered: false }
        );
      }
      _hoveredAreaId = null;
    });

    _map.on("click", "community-areas-fill", (e) => {
      const props = e.features[0]?.properties;
      if (!props || !_onAreaClick) return;
      _onAreaClick(
        parseInt(props.area_num || props.area_numbe || 0),
        props.name || props.community || "Area"
      );
    });
  }

  // ── Block hover tooltip ──────────────────────────────────────────────────

  function _setupBlockInteraction() {
    const tooltip = document.getElementById("tooltip");

    _map.on("mousemove", "population-extrusion", (e) => {
      const props = e.features[0]?.properties;
      if (!props) return;

      const pop    = Number(props.population).toLocaleString();
      const change = Number(props.change);
      const base   = Number(props.base_pop).toLocaleString();
      const sign   = change >= 0 ? "+" : "";

      tooltip.innerHTML = `
        <div class="tt-title">Census Block</div>
        <div class="tt-row">
          <span>Current</span>
          <span class="tt-val">${pop}</span>
        </div>
        <div class="tt-row">
          <span>Overnight</span>
          <span class="tt-val">${base}</span>
        </div>
        <div class="tt-row">
          <span>Change</span>
          <span class="tt-val" style="color:${change>=0?'#56d364':'#f85149'}">
            ${sign}${Number(change).toLocaleString()}
          </span>
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

  // ── Color helpers ────────────────────────────────────────────────────────

  function _colorForValue(value, scale) {
    if (value <= scale[0][0]) return scale[0][1];
    for (let i = 1; i < scale.length; i++) {
      if (value <= scale[i][0]) return scale[i][1];
    }
    return scale[scale.length - 1][1];
  }

  function _hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return [r, g, b];
  }

  function _lerpColor(c1, c2, t) {
    const [r1,g1,b1] = _hexToRgb(c1);
    const [r2,g2,b2] = _hexToRgb(c2);
    const r = Math.round(r1 + (r2-r1)*t);
    const g = Math.round(g1 + (g2-g1)*t);
    const b = Math.round(b1 + (b2-b1)*t);
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
  }

  // ── Build GeoJSON (first time only, then reuse) ──────────────────────────

  function _buildInitialGeoJSON(blocks, populations, changes) {
    const scale = _mode === "absolute" ? ABSOLUTE_SCALE : CHANGE_SCALE;
    const features = blocks.map((block, i) => {
      const pop    = populations[i] ?? 0;
      const change = changes[i]     ?? 0;
      const value  = _mode === "absolute" ? pop : change;
      return {
        type: "Feature",
        id: i,
        geometry: {
          type: "Polygon",
          coordinates: [_blockToPolygon(block.lon, block.lat)]
        },
        properties: {
          geoid:      block.id,
          population: pop,
          change,
          base_pop:   block.base_pop,
          color:      _colorForValue(value, scale),
          height:     Math.max(0, Math.abs(value) * HEIGHT_SCALE_BASE * _exaggeration)
        }
      };
    });

    _currentHeights = features.map(f => f.properties.height);
    _currentColors  = features.map(f => f.properties.color);
    _targetHeights  = [..._currentHeights];
    _targetColors   = [..._currentColors];
    _geojsonCache   = { type:"FeatureCollection", features };
    return _geojsonCache;
  }

  function _blockToPolygon(lon, lat) {
    const d = 0.0015;
    return [
      [lon-d, lat-d],[lon+d, lat-d],
      [lon+d, lat+d],[lon-d, lat+d],
      [lon-d, lat-d]
    ];
  }

  // ── Smooth animation ─────────────────────────────────────────────────────

  function _easeInOut(t) {
    return t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
  }

  function _startAnimation() {
    if (_animFrame) cancelAnimationFrame(_animFrame);
    _animStart = performance.now();

    const fromHeights = [..._currentHeights];
    const fromColors  = [..._currentColors];

    function tick(ts) {
      const raw = (ts - _animStart) / ANIM_MS;
      const t   = _easeInOut(Math.min(raw, 1));

      const features = _geojsonCache.features;
      for (let i = 0; i < features.length; i++) {
        const h = fromHeights[i] + (_targetHeights[i] - fromHeights[i]) * t;
        const c = raw >= 1
          ? _targetColors[i]
          : (fromColors[i] === _targetColors[i]
             ? _targetColors[i]
             : _lerpColor(fromColors[i], _targetColors[i], t));
        features[i].properties.height = h;
        features[i].properties.color  = c;
      }

      _map.getSource("population").setData(_geojsonCache);

      if (raw < 1) {
        _animFrame = requestAnimationFrame(tick);
      } else {
        _currentHeights = [..._targetHeights];
        _currentColors  = [..._targetColors];
        _animFrame = null;
      }
    }

    _animFrame = requestAnimationFrame(tick);
  }

  // ── Public update ────────────────────────────────────────────────────────

  function update(day, hour, blocks, populations, changes) {
    const scale = _mode === "absolute" ? ABSOLUTE_SCALE : CHANGE_SCALE;

    if (!_geojsonCache) {
      const geojson = _buildInitialGeoJSON(blocks, populations, changes);
      _map.getSource("population").setData(geojson);
      return;
    }

    // Compute targets
    for (let i = 0; i < blocks.length; i++) {
      const pop    = populations[i] ?? 0;
      const change = changes[i]     ?? 0;
      const value  = _mode === "absolute" ? pop : change;
      _geojsonCache.features[i].properties.population = pop;
      _geojsonCache.features[i].properties.change     = change;
      _targetHeights[i] = Math.max(0, Math.abs(value) * HEIGHT_SCALE_BASE * _exaggeration);
      _targetColors[i]  = _colorForValue(value, scale);
    }

    _startAnimation();
  }

  function setMode(mode) {
    _mode = mode;
    _geojsonCache   = null;
    _currentHeights = [];
    _currentColors  = [];
  }

  function setExaggeration(val) {
    _exaggeration   = val;
    _geojsonCache   = null;
    _currentHeights = [];
    _currentColors  = [];
  }

  // ── Legend ───────────────────────────────────────────────────────────────

  function buildLegend(mode) {
    const scale  = mode === "absolute" ? ABSOLUTE_SCALE : CHANGE_SCALE;
    const el     = document.getElementById("legend-scale");
    el.innerHTML = "";
    const labels = mode === "absolute"
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
    _map.fitBounds(COOK_COUNTY_BOUNDS, {
      padding: 20, pitch: 50, bearing: -10, duration: 1500
    });
  }

  function flyTo(lng, lat, zoom=13) {
    _map.flyTo({ center:[lng,lat], zoom, duration:1200 });
  }

  return { init, update, setMode, setExaggeration, buildLegend, flyToChicago, flyTo };
})();
