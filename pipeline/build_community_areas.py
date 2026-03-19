"""
Aggregates block-level hourly populations to Chicago's 77 community areas.
Run AFTER process.py has generated chicago_population.json.

Outputs:
  frontend/data/community_areas.geojson   — boundaries + names
  frontend/data/community_areas_hourly.json — hourly pop per area
"""

import json
import requests
import geopandas as gpd
import pandas as pd
import numpy as np
from pathlib import Path
from shapely.geometry import Point

PROCESSED_DIR = Path("../data/processed")
FRONTEND_DATA = Path("../frontend/data")

COMMUNITY_AREAS_URL = (
    "https://data.cityofchicago.org/resource/igwz-8jzy.geojson"
    "?$limit=100"
)


def fetch_community_areas():
    print("Fetching Chicago 77 community areas...")
    resp = requests.get(COMMUNITY_AREAS_URL, timeout=30)
    resp.raise_for_status()
    gdf = gpd.read_file(resp.text)
    gdf = gdf.to_crs("EPSG:4326")
    gdf["area_num"] = pd.to_numeric(gdf["area_numbe"], errors="coerce").astype(int)
    gdf["name"]     = gdf["community"].str.title()
    gdf = gdf[["area_num", "name", "geometry"]].sort_values("area_num")
    print(f"  Loaded {len(gdf)} community areas")
    return gdf


def build_block_area_map(blocks_gdf, areas_gdf):
    """Spatial join: each block → community area index."""
    print("Joining blocks to community areas...")

    blocks_proj = blocks_gdf[["GEOID20","geometry"]].to_crs("EPSG:32616")
    centroids   = blocks_proj.copy()
    centroids["geometry"] = blocks_proj.geometry.centroid

    areas_proj  = areas_gdf[["area_num","name","geometry"]].to_crs("EPSG:32616")

    joined = gpd.sjoin(
        centroids, areas_proj,
        how="left", predicate="within"
    )
    # area_num for each block (NaN if outside all areas)
    block_area = joined["area_num"].fillna(-1).astype(int).tolist()
    print(f"  Mapped {sum(a >= 0 for a in block_area):,} / "
          f"{len(block_area):,} blocks to a community area")
    return block_area


def aggregate_hourly(pop_json, block_area, areas_gdf):
    """Sum block populations by community area for each day/hour."""
    print("Aggregating hourly populations by community area...")

    blocks  = pop_json["blocks"]
    hourly  = pop_json["hourly"]
    n_areas = len(areas_gdf)

    # area_num → index in areas list
    area_nums = areas_gdf["area_num"].tolist()
    area_idx  = {num: i for i, num in enumerate(area_nums)}

    result = {}
    for day_str, day_data in hourly.items():
        result[day_str] = {}
        for hour_str, pops in day_data.items():
            totals = [0] * n_areas
            for blk_idx, pop in enumerate(pops):
                a_num = block_area[blk_idx]
                if a_num in area_idx:
                    totals[area_idx[a_num]] += pop
            result[day_str][hour_str] = totals

    return result


def export(areas_gdf, hourly_result):
    # GeoJSON with names
    areas_out = areas_gdf[["area_num","name","geometry"]].copy()
    out_geo   = FRONTEND_DATA / "community_areas.geojson"
    areas_out.to_file(out_geo, driver="GeoJSON")
    print(f"  Saved → {out_geo}")

    # Area metadata list
    areas_meta = [
        {"area_num": int(r.area_num), "name": r.name}
        for _, r in areas_gdf.iterrows()
    ]

    out_hourly = FRONTEND_DATA / "community_areas_hourly.json"
    with open(out_hourly, "w") as f:
        json.dump({"areas": areas_meta, "hourly": hourly_result},
                  f, separators=(",", ":"))
    size_kb = out_hourly.stat().st_size / 1000
    print(f"  Saved → {out_hourly} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    areas_gdf = fetch_community_areas()
    blocks    = gpd.read_file(PROCESSED_DIR / "chicago_blocks.geojson")

    with open(FRONTEND_DATA / "chicago_population.json") as f:
        pop_json = json.load(f)

    block_area    = build_block_area_map(blocks, areas_gdf)
    hourly_result = aggregate_hourly(pop_json, block_area, areas_gdf)
    export(areas_gdf, hourly_result)
    print("Community areas pipeline complete.")
