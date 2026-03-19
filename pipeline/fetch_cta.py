"""
Fetches CTA rail daily ridership from Chicago Data Portal.
Dataset 5neh-572f: CTA L Station Entries - Daily Totals
Applies realistic hourly distribution curves (weekday/saturday/sunday).
Outputs: data/raw/cta_daily_ridership.csv
         data/processed/cta_stations.geojson
         data/processed/cta_hourly_flows.csv
"""

import requests
import pandas as pd
import geopandas as gpd
import numpy as np
from shapely.geometry import Point
from pathlib import Path

RAW_DIR = Path("../data/raw")
PROCESSED_DIR = Path("../data/processed")
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

CTA_DAILY_URL    = "https://data.cityofchicago.org/resource/5neh-572f.json"
CTA_STATIONS_URL = "https://data.cityofchicago.org/resource/8pix-ypme.json"

# Spring 2023 week: Mon May 1 – Sun May 7
DATE_START = "2023-05-01T00:00:00.000"
DATE_END   = "2023-05-07T23:59:59.000"

# Realistic hourly share of daily ridership (sums to 1.0)
# Based on published CTA ridership profiles
HOURLY_DIST = {
    "W": np.array([  # Weekday
        0.002, 0.001, 0.001, 0.001, 0.003, 0.010,
        0.040, 0.090, 0.095, 0.060, 0.045, 0.050,
        0.055, 0.050, 0.045, 0.055, 0.090, 0.085,
        0.060, 0.045, 0.035, 0.025, 0.015, 0.007
    ]),
    "A": np.array([  # Saturday
        0.005, 0.003, 0.002, 0.002, 0.003, 0.005,
        0.010, 0.020, 0.035, 0.050, 0.065, 0.075,
        0.080, 0.080, 0.075, 0.070, 0.065, 0.060,
        0.055, 0.045, 0.040, 0.030, 0.015, 0.010
    ]),
    "U": np.array([  # Sunday/Holiday
        0.007, 0.004, 0.003, 0.002, 0.002, 0.004,
        0.007, 0.013, 0.025, 0.045, 0.065, 0.075,
        0.080, 0.080, 0.075, 0.070, 0.065, 0.060,
        0.055, 0.045, 0.035, 0.025, 0.015, 0.008
    ])
}

# Normalize to sum to exactly 1.0
for k in HOURLY_DIST:
    HOURLY_DIST[k] = HOURLY_DIST[k] / HOURLY_DIST[k].sum()

# Map day of week (0=Mon..6=Sun) to CTA daytype
DAY_TO_DAYTYPE = {0:"W", 1:"W", 2:"W", 3:"W", 4:"W", 5:"A", 6:"U"}


def fetch_daily_ridership():
    print("Fetching CTA daily ridership (May 1-7, 2023)...")
    params = {
        "$where": f"date >= '{DATE_START}' AND date <= '{DATE_END}'",
        "$limit": 10000,
        "$order": "date ASC"
    }
    resp = requests.get(CTA_DAILY_URL, params=params, timeout=60)
    resp.raise_for_status()
    df = pd.DataFrame(resp.json())

    if df.empty:
        raise ValueError("No ridership data returned. Check date range.")

    df["date"]    = pd.to_datetime(df["date"])
    df["rides"]   = pd.to_numeric(df["rides"], errors="coerce").fillna(0)
    df["day_of_week"] = df["date"].dt.dayofweek
    df["daytype"] = df["day_of_week"].map(DAY_TO_DAYTYPE)

    out = RAW_DIR / "cta_daily_ridership.csv"
    df.to_csv(out, index=False)
    print(f"  Saved {len(df):,} rows → {out}")
    return df


def fetch_station_locations():
    print("Fetching CTA station locations...")
    all_rows = []
    offset = 0
    while True:
        resp = requests.get(CTA_STATIONS_URL,
                            params={"$limit": 1000, "$offset": offset},
                            timeout=30)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            break
        all_rows.extend(rows)
        offset += 1000
        if len(rows) < 1000:
            break

    df = pd.DataFrame(all_rows)
    df = df.dropna(subset=["location"])
    df["lat"] = df["location"].apply(
        lambda x: float(x["latitude"]) if isinstance(x, dict) else None)
    df["lon"] = df["location"].apply(
        lambda x: float(x["longitude"]) if isinstance(x, dict) else None)
    df = df.dropna(subset=["lat", "lon"])

    # One entry per map_id (unique station)
    df = df.drop_duplicates(subset=["map_id"])

    gdf = gpd.GeoDataFrame(
        df[["map_id", "station_name", "lat", "lon"]],
        geometry=[Point(xy) for xy in zip(df["lon"], df["lat"])],
        crs="EPSG:4326"
    )

    out = PROCESSED_DIR / "cta_stations.geojson"
    gdf.to_file(out, driver="GeoJSON")
    print(f"  Saved {len(gdf)} stations → {out}")
    return gdf


def build_hourly_flows(daily_df):
    """
    Expand daily ridership into hourly entries using distribution curves.
    Then compute net flows: entries at hour H minus departures (entries shifted +9h).
    """
    print("Expanding daily → hourly flows...")

    rows = []
    for _, record in daily_df.iterrows():
        dist   = HOURLY_DIST[record["daytype"]]
        day    = int(record["day_of_week"])
        sid    = str(record["station_id"])
        rides  = float(record["rides"])

        for hour in range(24):
            rows.append({
                "station_id":  sid,
                "day_of_week": day,
                "hour":        hour,
                "avg_entries": rides * dist[hour]
            })

    flows = pd.DataFrame(rows)

    # Average across multiple days of same type (handles the week correctly)
    flows = (flows.groupby(["station_id", "day_of_week", "hour"])["avg_entries"]
             .mean().reset_index())

    # Departure proxy: people who arrive at H leave ~9 hrs later
    dep = flows.copy()
    dep["hour"] = (dep["hour"] + 9) % 24
    dep = dep.rename(columns={"avg_entries": "estimated_departures"})

    flows = flows.merge(dep, on=["station_id", "day_of_week", "hour"], how="left")
    flows["estimated_departures"] = flows["estimated_departures"].fillna(0)
    flows["net_flow"] = flows["avg_entries"] - flows["estimated_departures"]

    out = PROCESSED_DIR / "cta_hourly_flows.csv"
    flows.to_csv(out, index=False)
    print(f"  Saved {len(flows):,} hourly flow rows → {out}")
    return flows


if __name__ == "__main__":
    daily = fetch_daily_ridership()
    fetch_station_locations()
    build_hourly_flows(daily)
    print("CTA pipeline complete.")
