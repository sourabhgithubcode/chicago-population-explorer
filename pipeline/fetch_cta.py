"""
Fetches CTA rail ridership data from Chicago Data Portal (Socrata API).
Dataset: CTA - Ridership - 'L' Station Entries - Hourly Totals
No API key required for basic access.
Outputs: data/raw/cta_hourly_ridership.csv
         data/processed/cta_stations.geojson
"""

import requests
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from pathlib import Path

RAW_DIR = Path("../data/raw")
PROCESSED_DIR = Path("../data/processed")

# Chicago Data Portal - CTA hourly station entries
# Dataset: t2rn-p8d7
CTA_HOURLY_URL = "https://data.cityofchicago.org/resource/t2rn-p8d7.json"

# CTA Station locations dataset
CTA_STATIONS_URL = "https://data.cityofchicago.org/resource/8pix-ypme.json"

# Fetch a full recent week (Mon-Sun spring 2023 - week of May 1)
# We use $where to get a specific week for the "typical week" model
DATE_START = "2023-05-01T00:00:00"
DATE_END   = "2023-05-07T23:59:59"


def fetch_hourly_ridership():
    print("Fetching CTA hourly ridership data...")
    all_rows = []
    limit = 50000
    offset = 0

    while True:
        params = {
            "$where": f"date >= '{DATE_START}' AND date <= '{DATE_END}'",
            "$limit": limit,
            "$offset": offset,
            "$order": "date ASC"
        }
        resp = requests.get(CTA_HOURLY_URL, params=params, timeout=60)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            break
        all_rows.extend(rows)
        offset += limit
        print(f"  Fetched {len(all_rows):,} rows...")
        if len(rows) < limit:
            break

    df = pd.DataFrame(all_rows)
    df["date"] = pd.to_datetime(df["date"])
    df["hour"] = df["date"].dt.hour
    df["day_of_week"] = df["date"].dt.dayofweek  # 0=Mon
    df["rides"] = pd.to_numeric(df["rides"], errors="coerce").fillna(0)

    out_path = RAW_DIR / "cta_hourly_ridership.csv"
    df.to_csv(out_path, index=False)
    print(f"  Saved {len(df):,} rows → {out_path}")
    return df


def fetch_station_locations():
    print("Fetching CTA station locations...")
    params = {"$limit": 1000}
    resp = requests.get(CTA_STATIONS_URL, params=params, timeout=30)
    resp.raise_for_status()
    stations = pd.DataFrame(resp.json())

    stations = stations.dropna(subset=["location"])
    stations["lat"] = stations["location"].apply(
        lambda x: float(x["latitude"]) if isinstance(x, dict) else None
    )
    stations["lon"] = stations["location"].apply(
        lambda x: float(x["longitude"]) if isinstance(x, dict) else None
    )
    stations = stations.dropna(subset=["lat", "lon"])

    gdf = gpd.GeoDataFrame(
        stations,
        geometry=[Point(xy) for xy in zip(stations["lon"], stations["lat"])],
        crs="EPSG:4326"
    )

    cols = ["map_id", "station_name", "lat", "lon", "geometry"]
    cols = [c for c in cols if c in gdf.columns]
    gdf = gdf[cols]

    out_path = PROCESSED_DIR / "cta_stations.geojson"
    gdf.to_file(out_path, driver="GeoJSON")
    print(f"  Saved {len(gdf)} stations → {out_path}")
    return gdf


def build_hourly_flows(ridership_df):
    """
    Compute net hourly flows per station:
    Positive = net inflow (more arriving than departing)
    Since CTA only provides entries, we compute:
      - entries at hour H = inflow at H
      - departure proxy = shift by average commute time (45 min)
    """
    print("Computing hourly net flows per station...")

    # Aggregate: mean rides per station per day_of_week per hour
    agg = (
        ridership_df
        .groupby(["station_id", "day_of_week", "hour"])["rides"]
        .mean()
        .reset_index()
        .rename(columns={"rides": "avg_entries"})
    )

    # Departure proxy: people who entered leave ~9hrs later (work commute model)
    # Simple approach: departures at hour H = entries at hour (H-9) % 24
    agg["departure_hour"] = (agg["hour"] + 9) % 24
    departures = agg[["station_id", "day_of_week", "hour", "avg_entries"]].copy()
    departures = departures.rename(columns={
        "hour": "departure_hour",
        "avg_entries": "estimated_departures"
    })

    flows = agg.merge(
        departures,
        on=["station_id", "day_of_week", "departure_hour"],
        how="left"
    )
    flows["estimated_departures"] = flows["estimated_departures"].fillna(0)
    flows["net_flow"] = flows["avg_entries"] - flows["estimated_departures"]

    out_path = PROCESSED_DIR / "cta_hourly_flows.csv"
    flows.to_csv(out_path, index=False)
    print(f"  Saved {len(flows):,} rows → {out_path}")
    return flows


if __name__ == "__main__":
    ridership = fetch_hourly_ridership()
    fetch_station_locations()
    build_hourly_flows(ridership)
    print("CTA data pipeline complete.")
