"""
Combines Census block population with CTA rail + bus station flows to produce
hour-by-hour block-level population estimates for Chicago.

Rail:  400m buffer around each L station
Bus:   150m buffer around each bus stop (tighter, stops are dense)

Outputs:
  frontend/data/chicago_population.json
  frontend/data/metadata.json
"""

import pandas as pd
import geopandas as gpd
import numpy as np
import json
from pathlib import Path

PROCESSED_DIR = Path("../data/processed")
FRONTEND_DATA = Path("../frontend/data")
FRONTEND_DATA.mkdir(parents=True, exist_ok=True)

OVERNIGHT_POPULATION = 2_696_555   # 2020 Census Chicago city pop
DAYTIME_PEAK         = 3_200_000   # LEHD daytime estimate

# Transit mode shares (Chicago)
# Rail  ~25% of transit trips
# Bus   ~35% of transit trips
# Drive/walk/other ~40%
RAIL_CORRECTION = 1 / 0.25
BUS_CORRECTION  = 1 / 0.35


# ── Load ──────────────────────────────────────────────────────────────────

def load_data():
    print("Loading processed data...")
    blocks   = gpd.read_file(PROCESSED_DIR / "chicago_blocks.geojson")

    # Rail
    stations      = gpd.read_file(PROCESSED_DIR / "cta_stations.geojson")
    rail_flows    = pd.read_csv(PROCESSED_DIR / "cta_hourly_flows.csv",
                                dtype={"station_id": str})

    # Bus (optional — only if pipeline has been run)
    bus_flows_path = PROCESSED_DIR / "bus_hourly_flows.csv"
    bus_stops_path = PROCESSED_DIR / "bus_stops.geojson"
    if bus_flows_path.exists() and bus_stops_path.exists():
        bus_flows = pd.read_csv(bus_flows_path, dtype={"stop_id": str})
        bus_stops = gpd.read_file(bus_stops_path)
        print(f"  Bus data loaded: {len(bus_stops):,} stops, "
              f"{len(bus_flows):,} flow rows")
    else:
        bus_flows = None
        bus_stops = None
        print("  Bus data not found — using rail only")

    return blocks, stations, rail_flows, bus_stops, bus_flows


# ── Spatial assignment ────────────────────────────────────────────────────

def assign_to_blocks(blocks, points_gdf, radius_m):
    """
    For each point (station or stop), find census blocks within radius_m.
    Returns dict: point_id → [block_indices]
    """
    blocks_proj = blocks.to_crs("EPSG:32616")
    points_proj = points_gdf.to_crs("EPSG:32616")

    id_col = "map_id" if "map_id" in points_gdf.columns else "stop_id"
    mapping = {}

    for _, pt in points_proj.iterrows():
        pid    = str(pt[id_col])
        buf    = pt.geometry.buffer(radius_m)
        nearby = blocks_proj[blocks_proj.geometry.intersects(buf)]
        if len(nearby) > 0:
            mapping[pid] = nearby.index.tolist()

    return mapping


# ── Population model ──────────────────────────────────────────────────────

def hourly_target(day, hour):
    """
    Return the expected total city population for a given day/hour.
    Weekday daytime peaks at ~3.2M (LEHD estimate), overnight ~2.7M.
    Weekend daytime is moderate (~2.85M).
    """
    if day < 5:  # Mon–Fri
        if 7 <= hour <= 19:
            # Bell curve peaking at noon
            t = 1.0 - abs(hour - 13) / 6.0
            t = max(0.0, t)
            return OVERNIGHT_POPULATION + t * (DAYTIME_PEAK - OVERNIGHT_POPULATION)
        elif 5 <= hour < 7 or 19 < hour <= 22:
            return OVERNIGHT_POPULATION + 100_000
        else:
            return OVERNIGHT_POPULATION
    else:  # Sat–Sun
        if 10 <= hour <= 20:
            t = 1.0 - abs(hour - 15) / 5.0
            t = max(0.0, t)
            return OVERNIGHT_POPULATION + t * 200_000
        else:
            return OVERNIGHT_POPULATION


def build_hourly_population(blocks, rail_flows, rail_map,
                             bus_flows, bus_map):
    print("Building hourly population estimates (rail + bus)...")

    base_pop  = blocks["population"].values.astype(float)
    # Scale raw Census block pops so they sum to OVERNIGHT_POPULATION
    census_scale = OVERNIGHT_POPULATION / max(base_pop.sum(), 1)
    base_pop     = base_pop * census_scale

    results = {}

    for day in range(7):
        results[day] = {}
        day_rail = rail_flows[rail_flows["day_of_week"] == day]
        day_bus  = bus_flows[bus_flows["day_of_week"] == day] \
                   if bus_flows is not None else pd.DataFrame()

        for hour in range(24):
            pop = base_pop.copy()

            # ── Rail flows ──────────────────────────────────
            hour_rail = day_rail[day_rail["hour"] == hour]
            for _, row in hour_rail.iterrows():
                sid     = str(int(float(row["station_id"]))) \
                          if pd.notna(row["station_id"]) else None
                indices = rail_map.get(sid, [])
                if not indices:
                    continue
                net     = row["net_flow"] * RAIL_CORRECTION
                per_blk = net / len(indices)
                for idx in indices:
                    pop[idx] = max(0, pop[idx] + per_blk)

            # ── Bus flows ───────────────────────────────────
            if not day_bus.empty:
                hour_bus = day_bus[day_bus["hour"] == hour]
                for _, row in hour_bus.iterrows():
                    sid     = str(row["stop_id"])
                    indices = bus_map.get(sid, [])
                    if not indices:
                        continue
                    net     = row["net_flow"] * BUS_CORRECTION
                    per_blk = net / len(indices)
                    for idx in indices:
                        pop[idx] = max(0, pop[idx] + per_blk)

            # ── Time-varying normalization ──────────────────
            # Scale so the city total matches the expected population
            # for this specific day/hour (higher during daytime).
            target     = hourly_target(day, hour)
            cur_total  = pop.sum()
            if cur_total > 0:
                pop = pop * (target / cur_total)

            results[day][hour] = np.round(pop).astype(int).tolist()

        print(f"  Day {day} done", end="\r")

    print()
    return results


# ── Export ────────────────────────────────────────────────────────────────

def export_frontend_data(blocks, results):
    print("Exporting frontend data...")

    blocks_4326 = blocks.to_crs("EPSG:4326")
    centroids   = blocks_4326.geometry.to_crs("EPSG:32616").centroid \
                             .to_crs("EPSG:4326")

    block_features = []
    for i, (_, row) in enumerate(blocks_4326.iterrows()):
        block_features.append({
            "id":       row["GEOID20"],
            "lon":      round(centroids.iloc[i].x, 6),
            "lat":      round(centroids.iloc[i].y, 6),
            "base_pop": int(row["population"])
        })

    output = {
        "blocks":  block_features,
        "hourly":  results
    }

    out = FRONTEND_DATA / "chicago_population.json"
    with open(out, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_mb = out.stat().st_size / 1_000_000
    print(f"  Saved → {out} ({size_mb:.1f} MB)")


def export_metadata(has_bus):
    sources = [
        "US Census 2020 (block-level residential population)",
        "CTA Rail Hourly Ridership - Chicago Data Portal (full year 2023)",
        "CTA Bus Route Ridership - Chicago Data Portal (full year 2023)",
        "CTA GTFS (bus stop and rail station locations)",
        "US Census LEHD OnTheMap (daytime normalization)"
    ]
    if not has_bus:
        sources = [s for s in sources if "Bus" not in s]

    meta = {
        "city":            "Chicago",
        "model_week":      "Typical week — averaged from full year 2023",
        "overnight_pop":   OVERNIGHT_POPULATION,
        "daytime_peak":    DAYTIME_PEAK,
        "transit_sources": "CTA Rail + CTA Bus" if has_bus else "CTA Rail only",
        "data_sources":    sources,
        "methodology": (
            "Block-level overnight populations from US Census 2020. "
            "Hourly net inflows/outflows from CTA rail (400m buffer) and "
            "CTA bus (150m buffer), each scaled by their respective mode shares "
            "(rail 25%, bus 35%). Full year 2023 data with 3-sigma outlier "
            "removal and federal holiday exclusion. Normalized to LEHD "
            "daytime population estimates."
        )
    }
    out = FRONTEND_DATA / "metadata.json"
    with open(out, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  Metadata → {out}")


# ── Main ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    blocks, stations, rail_flows, bus_stops, bus_flows = load_data()

    print("Mapping rail stations to blocks (400m)...")
    rail_map = assign_to_blocks(blocks, stations, radius_m=400)
    print(f"  Mapped {len(rail_map)} rail stations")

    bus_map = {}
    if bus_stops is not None:
        print("Mapping bus stops to blocks (150m)...")
        bus_map = assign_to_blocks(blocks, bus_stops, radius_m=150)
        print(f"  Mapped {len(bus_map):,} bus stops")

    results = build_hourly_population(
        blocks, rail_flows, rail_map, bus_flows, bus_map
    )
    export_frontend_data(blocks, results)
    export_metadata(has_bus=bus_stops is not None)

    print("\nProcessing pipeline complete.")
    print(f"  Rail stations : {len(rail_map)}")
    print(f"  Bus stops     : {len(bus_map):,}")
    print(f"  Blocks        : {len(blocks):,}")
