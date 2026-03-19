"""
Combines Census block population with CTA station flows to produce
hour-by-hour block-level population estimates for Chicago.
Outputs: data/processed/chicago_population_hourly.json
         (used directly by the frontend)
"""

import pandas as pd
import geopandas as gpd
import numpy as np
import json
from pathlib import Path
from shapely.geometry import Point

PROCESSED_DIR = Path("../data/processed")
FRONTEND_DATA = Path("../frontend/data")
FRONTEND_DATA.mkdir(parents=True, exist_ok=True)

# LEHD estimates: Chicago daytime peak ~2.7M, overnight ~2.7M residential
# Source: US Census LEHD OnTheMap (Cook County)
OVERNIGHT_POPULATION = 2_696_555   # 2020 Census Chicago city pop
DAYTIME_PEAK         = 3_200_000   # LEHD daytime estimate

# Subway accounts for ~30% of Chicago commuters (rest: bus, drive, walk)
TRANSIT_CORRECTION_FACTOR = 1 / 0.30


def load_data():
    print("Loading processed data...")
    blocks = gpd.read_file(PROCESSED_DIR / "chicago_blocks.geojson")
    stations = gpd.read_file(PROCESSED_DIR / "cta_stations.geojson")
    flows = pd.read_csv(PROCESSED_DIR / "cta_hourly_flows.csv")
    return blocks, stations, flows


def assign_flows_to_blocks(blocks, stations, flows):
    """
    For each station, find nearest census blocks within 400m radius.
    Disperse net flow uniformly to those blocks.
    """
    print("Assigning station flows to census blocks...")

    # Project to meters for distance calc
    blocks_proj = blocks.to_crs("EPSG:32616")
    stations_proj = stations.to_crs("EPSG:32616")

    # Build station → block mapping (400m radius)
    station_block_map = {}
    for _, station in stations_proj.iterrows():
        sid = str(station.get("map_id", station.name))
        buffer = station.geometry.buffer(400)
        nearby = blocks_proj[blocks_proj.geometry.intersects(buffer)]
        if len(nearby) > 0:
            station_block_map[sid] = nearby.index.tolist()

    print(f"  Mapped {len(station_block_map)} stations to nearby blocks")
    return station_block_map


def build_hourly_population(blocks, flows, station_block_map):
    """
    For each (day_of_week, hour), compute block-level population:
    1. Start with overnight Census population
    2. Add/subtract CTA net flows dispersed to nearby blocks
    3. Scale by transit correction factor
    4. Normalize to LEHD bounds
    """
    print("Building hourly population estimates...")

    n_blocks = len(blocks)
    block_ids = blocks["GEOID20"].tolist()
    base_pop = blocks["population"].values.astype(float)

    # Index for fast lookup
    geoid_to_idx = {g: i for i, g in enumerate(block_ids)}

    results = {}

    for day in range(7):  # 0=Mon ... 6=Sun
        results[day] = {}
        day_flows = flows[flows["day_of_week"] == day]

        for hour in range(24):
            hour_flows = day_flows[day_flows["hour"] == hour]
            pop_array = base_pop.copy()

            # Disperse flows from each station to nearby blocks
            for _, row in hour_flows.iterrows():
                sid = str(int(row["station_id"])) if pd.notna(row["station_id"]) else None
                if sid not in station_block_map:
                    continue

                block_indices = station_block_map[sid]
                if not block_indices:
                    continue

                net = row["net_flow"] * TRANSIT_CORRECTION_FACTOR
                per_block = net / len(block_indices)

                for idx in block_indices:
                    pop_array[idx] = max(0, pop_array[idx] + per_block)

            # Normalize to LEHD bounds
            total = pop_array.sum()
            if total > 0:
                # Scale so overnight ~= OVERNIGHT_POPULATION
                # and peak hours approach DAYTIME_PEAK
                scale = OVERNIGHT_POPULATION / base_pop.sum()
                pop_array = pop_array * scale

            results[day][hour] = np.round(pop_array).astype(int).tolist()

    return results, block_ids


def export_frontend_data(blocks, results, block_ids):
    """Export compact JSON for the frontend."""
    print("Exporting frontend data...")

    # Block centroids for 3D bar positioning
    blocks_4326 = blocks.to_crs("EPSG:4326")
    centroids = blocks_4326.geometry.centroid

    block_features = []
    for i, (_, row) in enumerate(blocks_4326.iterrows()):
        block_features.append({
            "id": row["GEOID20"],
            "lon": round(centroids.iloc[i].x, 6),
            "lat": round(centroids.iloc[i].y, 6),
            "base_pop": int(row["population"])
        })

    # Hourly data: indexed by day → hour → array of pops (same order as blocks)
    output = {
        "blocks": block_features,
        "hourly": results
    }

    out_path = FRONTEND_DATA / "chicago_population.json"
    with open(out_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))  # compact

    size_mb = out_path.stat().st_size / 1_000_000
    print(f"  Saved → {out_path} ({size_mb:.1f} MB)")


def export_metadata():
    meta = {
        "city": "Chicago",
        "model_week": "2023-05-01 to 2023-05-07",
        "overnight_pop": OVERNIGHT_POPULATION,
        "daytime_peak": DAYTIME_PEAK,
        "data_sources": [
            "US Census 2020 (block-level residential population)",
            "CTA Rail Hourly Ridership - Chicago Data Portal",
            "US Census LEHD OnTheMap (daytime normalization)",
            "CTA GTFS (station locations)"
        ],
        "methodology": (
            "Block-level overnight populations from US Census 2020. "
            "Net hourly inflows/outflows estimated from CTA rail turnstile data, "
            "scaled by transit mode share (30%), dispersed to census blocks "
            "within 400m of each station. Normalized to LEHD daytime estimates."
        )
    }
    out_path = FRONTEND_DATA / "metadata.json"
    with open(out_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  Metadata → {out_path}")


if __name__ == "__main__":
    blocks, stations, flows = load_data()
    station_block_map = assign_flows_to_blocks(blocks, stations, flows)
    results, block_ids = build_hourly_population(blocks, flows, station_block_map)
    export_frontend_data(blocks, results, block_ids)
    export_metadata()
    print("Processing pipeline complete.")
