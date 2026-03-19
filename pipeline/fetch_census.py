"""
Fetches Chicago block-level population data from US Census Bureau.
Uses Census 2020 PL94-171 redistricting data (free, no API key needed).
Outputs: data/processed/chicago_blocks.geojson
"""

import requests
import geopandas as gpd
import pandas as pd
import json
import os
from pathlib import Path

RAW_DIR = Path("../data/raw")
PROCESSED_DIR = Path("../data/processed")
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Illinois FIPS = 17, Cook County FIPS = 031
STATE_FIPS = "17"
COUNTY_FIPS = "031"

CENSUS_API = (
    "https://api.census.gov/data/2020/dec/pl"
    f"?get=P1_001N,GEO_ID"
    f"&for=block:*"
    f"&in=state:{STATE_FIPS}+county:{COUNTY_FIPS}"
)

TIGER_URL = (
    "https://www2.census.gov/geo/tiger/TIGER2020/TABBLOCK20/"
    "tl_2020_17_tabblock20.zip"
)


def fetch_population():
    print("Fetching Census block populations for Cook County...")
    resp = requests.get(CENSUS_API, timeout=60)
    resp.raise_for_status()
    data = resp.json()

    header = data[0]
    rows = data[1:]
    df = pd.DataFrame(rows, columns=header)
    df = df.rename(columns={"P1_001N": "population"})
    df["population"] = pd.to_numeric(df["population"])

    # Build GEOID: state + county + tract + block
    df["GEOID20"] = df["state"] + df["county"] + df["tract"] + df["block"]
    df = df[["GEOID20", "population"]]

    out_path = RAW_DIR / "cook_county_population.csv"
    df.to_csv(out_path, index=False)
    print(f"  Saved {len(df):,} blocks → {out_path}")
    return df


def fetch_block_shapefile():
    zip_path = RAW_DIR / "il_tabblock20.zip"
    if not zip_path.exists():
        print("Downloading Illinois block shapefile (~200MB)...")
        resp = requests.get(TIGER_URL, stream=True, timeout=300)
        resp.raise_for_status()
        with open(zip_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"  Saved → {zip_path}")
    else:
        print("  Block shapefile already downloaded.")

    gdf = gpd.read_file(f"zip://{zip_path}")
    return gdf


def clip_to_chicago(gdf):
    """Clip to Chicago city boundary using community area bounding box."""
    # Chicago approximate bounds
    CHICAGO_BOUNDS = {
        "minx": -87.9401, "miny": 41.6445,
        "maxx": -87.5240, "maxy": 42.0230
    }
    gdf = gdf.cx[
        CHICAGO_BOUNDS["minx"]:CHICAGO_BOUNDS["maxx"],
        CHICAGO_BOUNDS["miny"]:CHICAGO_BOUNDS["maxy"]
    ]
    return gdf


def build_geojson(pop_df, blocks_gdf):
    print("Merging population with block geometries...")
    blocks_gdf = clip_to_chicago(blocks_gdf)
    merged = blocks_gdf.merge(pop_df, on="GEOID20", how="left")
    merged["population"] = merged["population"].fillna(0).astype(int)
    merged = merged[["GEOID20", "population", "geometry"]]
    merged = merged.to_crs("EPSG:4326")

    out_path = PROCESSED_DIR / "chicago_blocks.geojson"
    merged.to_file(out_path, driver="GeoJSON")
    print(f"  Saved {len(merged):,} blocks → {out_path}")
    return merged


if __name__ == "__main__":
    pop_df = fetch_population()
    blocks_gdf = fetch_block_shapefile()
    build_geojson(pop_df, blocks_gdf)
    print("Census data pipeline complete.")
