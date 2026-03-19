"""
Fetches full year (2023) CTA rail daily ridership from Chicago Data Portal.
Removes outliers (3-sigma + federal holidays), then averages by day-of-week
to produce a clean "typical week" model.

Dataset 5neh-572f: CTA L Station Entries - Daily Totals
Outputs: data/raw/cta_daily_ridership_2023.csv
         data/processed/cta_stations.geojson
         data/processed/cta_hourly_flows.csv
"""

import requests
import pandas as pd
import geopandas as gpd
import numpy as np
from shapely.geometry import Point
from pathlib import Path

RAW_DIR       = Path("../data/raw")
PROCESSED_DIR = Path("../data/processed")
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

CTA_DAILY_URL    = "https://data.cityofchicago.org/resource/5neh-572f.json"
CTA_STATIONS_URL = "https://data.cityofchicago.org/resource/8pix-ypme.json"

# Full year 2023
DATE_START = "2023-01-01T00:00:00.000"
DATE_END   = "2023-12-31T23:59:59.000"

# US Federal holidays 2023 (abnormal ridership patterns)
FEDERAL_HOLIDAYS_2023 = {
    "2023-01-02",  # New Year's Day observed
    "2023-01-16",  # MLK Day
    "2023-02-20",  # Presidents Day
    "2023-05-29",  # Memorial Day
    "2023-06-19",  # Juneteenth
    "2023-07-04",  # Independence Day
    "2023-09-04",  # Labor Day
    "2023-11-23",  # Thanksgiving
    "2023-11-24",  # Day after Thanksgiving (high shopping traffic)
    "2023-12-25",  # Christmas
    "2023-12-26",  # Christmas observed
}

# Realistic hourly share of daily ridership (sums to 1.0)
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
for k in HOURLY_DIST:
    HOURLY_DIST[k] = HOURLY_DIST[k] / HOURLY_DIST[k].sum()

DAY_TO_DAYTYPE = {0:"W", 1:"W", 2:"W", 3:"W", 4:"W", 5:"A", 6:"U"}


def fetch_daily_ridership():
    print("Fetching full year 2023 CTA ridership (~52k rows)...")
    all_rows = []
    offset   = 0
    limit    = 50000

    while True:
        params = {
            "$where": f"date >= '{DATE_START}' AND date <= '{DATE_END}'",
            "$limit":  limit,
            "$offset": offset,
            "$order":  "date ASC"
        }
        resp = requests.get(CTA_DAILY_URL, params=params, timeout=60)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            break
        all_rows.extend(rows)
        print(f"  Fetched {len(all_rows):,} rows...", end="\r")
        offset += limit
        if len(rows) < limit:
            break

    df = pd.DataFrame(all_rows)
    df["date"]        = pd.to_datetime(df["date"])
    df["rides"]       = pd.to_numeric(df["rides"], errors="coerce").fillna(0)
    df["day_of_week"] = df["date"].dt.dayofweek
    df["daytype"]     = df["day_of_week"].map(DAY_TO_DAYTYPE)
    df["date_str"]    = df["date"].dt.strftime("%Y-%m-%d")

    out = RAW_DIR / "cta_daily_ridership_2023.csv"
    df.to_csv(out, index=False)
    print(f"\n  Saved {len(df):,} rows → {out}")
    return df


def remove_outliers(df):
    print("Removing outliers...")
    before = len(df)

    # 1. Remove federal holidays
    df = df[~df["date_str"].isin(FEDERAL_HOLIDAYS_2023)]

    # 2. Remove zero-ride days (station closed / missing data)
    df = df[df["rides"] > 0]

    # 3. Remove 3-sigma outliers per station per day-type
    def filter_sigma(group):
        mean = group["rides"].mean()
        std  = group["rides"].std()
        if std == 0 or pd.isna(std):
            return group
        return group[
            (group["rides"] >= mean - 3 * std) &
            (group["rides"] <= mean + 3 * std)
        ]

    df = (df.groupby(["station_id", "daytype"], group_keys=False)
            .apply(filter_sigma))

    removed = before - len(df)
    pct     = removed / before * 100
    print(f"  Removed {removed:,} outlier rows ({pct:.1f}%) → {len(df):,} clean rows remain")
    return df


def build_typical_week(df):
    """
    Average all clean Mondays → one typical Monday per station,
    all clean Tuesdays → one typical Tuesday, etc.
    Result: one row per (station_id, day_of_week) — the "typical week"
    """
    print("Averaging into typical week...")
    typical = (df.groupby(["station_id", "stationname", "day_of_week", "daytype"])["rides"]
                 .mean()
                 .reset_index()
                 .rename(columns={"rides": "avg_rides"}))
    print(f"  {len(typical):,} station-day rows in typical week")
    return typical


def build_hourly_flows(typical_df):
    """Expand typical daily averages into hourly flows using distribution curves."""
    print("Expanding to hourly flows...")
    rows = []
    for _, rec in typical_df.iterrows():
        dist = HOURLY_DIST[rec["daytype"]]
        for hour in range(24):
            rows.append({
                "station_id":  str(rec["station_id"]),
                "day_of_week": int(rec["day_of_week"]),
                "hour":        hour,
                "avg_entries": float(rec["avg_rides"]) * dist[hour]
            })

    flows = pd.DataFrame(rows)

    # Departure proxy: arrivals shift forward 9 hours
    dep = flows.copy()
    dep["hour"] = (dep["hour"] + 9) % 24
    dep = dep.rename(columns={"avg_entries": "estimated_departures"})

    flows = flows.merge(dep, on=["station_id", "day_of_week", "hour"], how="left")
    flows["estimated_departures"] = flows["estimated_departures"].fillna(0)
    flows["net_flow"] = flows["avg_entries"] - flows["estimated_departures"]

    out = PROCESSED_DIR / "cta_hourly_flows.csv"
    flows.to_csv(out, index=False)
    print(f"  Saved {len(flows):,} hourly rows → {out}")
    return flows


def fetch_station_locations():
    print("Fetching CTA station locations...")
    all_rows = []
    offset   = 0
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

    df  = pd.DataFrame(all_rows)
    df  = df.dropna(subset=["location"])
    df["lat"] = df["location"].apply(
        lambda x: float(x["latitude"])  if isinstance(x, dict) else None)
    df["lon"] = df["location"].apply(
        lambda x: float(x["longitude"]) if isinstance(x, dict) else None)
    df  = df.dropna(subset=["lat", "lon"])
    df  = df.drop_duplicates(subset=["map_id"])

    gdf = gpd.GeoDataFrame(
        df[["map_id", "station_name", "lat", "lon"]],
        geometry=[Point(xy) for xy in zip(df["lon"], df["lat"])],
        crs="EPSG:4326"
    )
    out = PROCESSED_DIR / "cta_stations.geojson"
    gdf.to_file(out, driver="GeoJSON")
    print(f"  Saved {len(gdf)} stations → {out}")
    return gdf


if __name__ == "__main__":
    raw      = fetch_daily_ridership()
    clean    = remove_outliers(raw)
    typical  = build_typical_week(clean)
    build_hourly_flows(typical)
    fetch_station_locations()
    print("\nCTA pipeline complete.")
    print(f"  Year coverage : 2023 (full year)")
    print(f"  Raw rows      : {len(raw):,}")
    print(f"  Clean rows    : {len(clean):,}")
    print(f"  Typical week  : {len(typical):,} station-day averages")
