"""
Fetches CTA bus ridership (full year 2023) and GTFS stop locations.
Distributes route-level ridership to individual bus stops,
then builds hourly flow estimates per stop.

Datasets:
  - jyb9-n7fm : CTA Bus Routes Daily Totals (Chicago Data Portal)
  - CTA GTFS  : stop locations, route-to-stop mapping

Outputs:
  data/processed/bus_stops.geojson
  data/processed/bus_hourly_flows.csv
"""

import requests
import zipfile
import io
import pandas as pd
import geopandas as gpd
import numpy as np
from shapely.geometry import Point
from pathlib import Path

RAW_DIR       = Path("../data/raw")
PROCESSED_DIR = Path("../data/processed")
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

CTA_BUS_URL  = "https://data.cityofchicago.org/resource/jyb9-n7fm.json"
CTA_GTFS_URL = "https://www.transitchicago.com/downloads/sch_data/google_transit.zip"

DATE_START = "2023-01-01T00:00:00.000"
DATE_END   = "2023-12-31T23:59:59.000"

# Same federal holidays as rail pipeline
FEDERAL_HOLIDAYS_2023 = {
    "2023-01-02","2023-01-16","2023-02-20","2023-05-29",
    "2023-06-19","2023-07-04","2023-09-04","2023-11-23",
    "2023-11-24","2023-12-25","2023-12-26",
}

# Bus hourly distribution — slightly flatter peaks than rail
# (bus riders include more non-9-to-5 workers: retail, healthcare, service)
HOURLY_DIST = {
    "W": np.array([
        0.003, 0.002, 0.001, 0.001, 0.004, 0.012,
        0.038, 0.075, 0.085, 0.065, 0.055, 0.058,
        0.060, 0.055, 0.050, 0.058, 0.080, 0.075,
        0.058, 0.048, 0.038, 0.028, 0.018, 0.008
    ]),
    "A": np.array([
        0.006, 0.004, 0.002, 0.002, 0.003, 0.006,
        0.012, 0.022, 0.038, 0.055, 0.068, 0.075,
        0.078, 0.078, 0.072, 0.068, 0.062, 0.058,
        0.052, 0.044, 0.038, 0.028, 0.016, 0.010
    ]),
    "U": np.array([
        0.008, 0.005, 0.003, 0.002, 0.002, 0.004,
        0.008, 0.014, 0.026, 0.046, 0.065, 0.074,
        0.079, 0.079, 0.073, 0.068, 0.062, 0.058,
        0.054, 0.044, 0.034, 0.024, 0.014, 0.008
    ])
}
for k in HOURLY_DIST:
    HOURLY_DIST[k] = HOURLY_DIST[k] / HOURLY_DIST[k].sum()

DAY_TO_DAYTYPE = {0:"W",1:"W",2:"W",3:"W",4:"W",5:"A",6:"U"}


# ── 1. Fetch bus ridership ─────────────────────────────────────────────────

def fetch_bus_ridership():
    print("Fetching full year 2023 CTA bus ridership...")
    all_rows = []
    offset, limit = 0, 50000

    while True:
        params = {
            "$where":  f"date >= '{DATE_START}' AND date <= '{DATE_END}'",
            "$limit":  limit,
            "$offset": offset,
            "$order":  "date ASC"
        }
        resp = requests.get(CTA_BUS_URL, params=params, timeout=60)
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
    df["route"]       = df["route"].astype(str).str.strip()

    out = RAW_DIR / "cta_bus_ridership_2023.csv"
    df.to_csv(out, index=False)
    print(f"\n  Saved {len(df):,} rows → {out}")
    return df


# ── 2. Outlier removal ────────────────────────────────────────────────────

def remove_outliers(df):
    print("Removing outliers from bus data...")
    before = len(df)

    df = df[~df["date_str"].isin(FEDERAL_HOLIDAYS_2023)]
    df = df[df["rides"] > 0]

    def filter_sigma(group):
        mean = group["rides"].mean()
        std  = group["rides"].std()
        if std == 0 or pd.isna(std):
            return group
        return group[
            (group["rides"] >= mean - 3 * std) &
            (group["rides"] <= mean + 3 * std)
        ]

    df = df.groupby(["route", "daytype"], group_keys=False).apply(filter_sigma)
    removed = before - len(df)
    print(f"  Removed {removed:,} outliers ({removed/before*100:.1f}%) "
          f"→ {len(df):,} clean rows")
    return df


# ── 3. Download GTFS & build route → stops mapping ────────────────────────

def download_gtfs():
    gtfs_path = RAW_DIR / "cta_gtfs.zip"
    if not gtfs_path.exists():
        print("Downloading CTA GTFS (~10MB)...")
        resp = requests.get(CTA_GTFS_URL, timeout=120)
        resp.raise_for_status()
        with open(gtfs_path, "wb") as f:
            f.write(resp.content)
        print(f"  Saved → {gtfs_path}")
    else:
        print("  GTFS already downloaded.")

    with zipfile.ZipFile(gtfs_path) as z:
        stops      = pd.read_csv(io.BytesIO(z.read("stops.txt")),
                                  dtype={"stop_id": str})
        routes     = pd.read_csv(io.BytesIO(z.read("routes.txt")),
                                  dtype={"route_id": str})
        trips      = pd.read_csv(io.BytesIO(z.read("trips.txt")),
                                  dtype={"route_id": str, "trip_id": str})
        stop_times = pd.read_csv(io.BytesIO(z.read("stop_times.txt")),
                                  dtype={"trip_id": str, "stop_id": str},
                                  usecols=["trip_id", "stop_id"])

    print(f"  GTFS loaded: {len(stops):,} stops | "
          f"{len(routes):,} routes | {len(trips):,} trips")
    return stops, routes, trips, stop_times


def build_route_stop_map(stops, routes, trips, stop_times):
    """Map route_short_name → unique stop_ids → lat/lon."""
    print("Building route → stop mapping...")

    # trip_id → route_id
    trip_route = trips[["trip_id", "route_id"]].drop_duplicates()

    # stop_time → route_id
    merged = stop_times.merge(trip_route, on="trip_id")

    # route_id → route_short_name
    route_names = routes[["route_id", "route_short_name"]].copy()
    route_names["route_short_name"] = (route_names["route_short_name"]
                                       .astype(str).str.strip())
    merged = merged.merge(route_names, on="route_id")

    # Unique stop per route_short_name
    route_stops = (merged.groupby("route_short_name")["stop_id"]
                         .apply(lambda x: list(x.unique()))
                         .reset_index()
                         .rename(columns={"route_short_name": "route",
                                          "stop_id": "stop_ids"}))

    # Stop locations
    stop_locs = stops[["stop_id", "stop_lat", "stop_lon"]].copy()
    stop_locs.columns = ["stop_id", "lat", "lon"]

    print(f"  Mapped {len(route_stops):,} routes to their stops")
    return route_stops, stop_locs


# ── 4. Build per-stop ridership ───────────────────────────────────────────

def build_stop_ridership(bus_df, route_stops, stop_locs):
    """
    Distribute each route's average daily rides equally to its stops.
    Returns per-stop average daily rides by day_of_week + daytype.
    """
    print("Distributing route ridership to individual stops...")

    # Average rides per route per day_of_week
    typical = (bus_df.groupby(["route", "day_of_week", "daytype"])["rides"]
                     .mean().reset_index().rename(columns={"rides": "avg_rides"}))

    # Merge route → stop_ids
    typical = typical.merge(route_stops, on="route", how="inner")

    rows = []
    for _, rec in typical.iterrows():
        stop_ids   = rec["stop_ids"]
        n_stops    = len(stop_ids)
        if n_stops == 0:
            continue
        rides_each = rec["avg_rides"] / n_stops
        for sid in stop_ids:
            rows.append({
                "stop_id":     sid,
                "day_of_week": rec["day_of_week"],
                "daytype":     rec["daytype"],
                "avg_rides":   rides_each
            })

    stop_rides = pd.DataFrame(rows)

    # Aggregate (a stop may appear on multiple routes)
    stop_rides = (stop_rides.groupby(["stop_id", "day_of_week", "daytype"])
                            ["avg_rides"].sum().reset_index())

    # Attach coordinates
    stop_rides = stop_rides.merge(stop_locs, on="stop_id", how="inner")
    stop_rides = stop_rides.dropna(subset=["lat", "lon"])

    print(f"  {len(stop_rides):,} stop-day rows built")
    return stop_rides


# ── 5. Build hourly flows per stop ───────────────────────────────────────

def build_hourly_flows(stop_rides):
    print("Expanding to hourly bus flows...")
    rows = []
    for _, rec in stop_rides.iterrows():
        dist = HOURLY_DIST[rec["daytype"]]
        for hour in range(24):
            rows.append({
                "stop_id":     rec["stop_id"],
                "lat":         rec["lat"],
                "lon":         rec["lon"],
                "day_of_week": int(rec["day_of_week"]),
                "hour":        hour,
                "avg_entries": float(rec["avg_rides"]) * dist[hour]
            })

    flows = pd.DataFrame(rows)

    # Departure proxy: 9-hour shift
    dep = flows[["stop_id","day_of_week","hour","avg_entries"]].copy()
    dep["hour"] = (dep["hour"] + 9) % 24
    dep = dep.rename(columns={"avg_entries": "estimated_departures"})

    flows = flows.merge(dep, on=["stop_id","day_of_week","hour"], how="left")
    flows["estimated_departures"] = flows["estimated_departures"].fillna(0)
    flows["net_flow"] = flows["avg_entries"] - flows["estimated_departures"]

    out = PROCESSED_DIR / "bus_hourly_flows.csv"
    flows.to_csv(out, index=False)
    print(f"  Saved {len(flows):,} rows → {out}")
    return flows


# ── 6. Save bus stop GeoJSON ─────────────────────────────────────────────

def save_bus_stops(stop_locs, stop_rides):
    print("Saving bus stop locations...")

    # Keep only stops that appear in our ridership data
    used_stops = stop_rides[["stop_id","lat","lon"]].drop_duplicates("stop_id")

    gdf = gpd.GeoDataFrame(
        used_stops,
        geometry=[Point(xy) for xy in zip(used_stops["lon"], used_stops["lat"])],
        crs="EPSG:4326"
    )
    out = PROCESSED_DIR / "bus_stops.geojson"
    gdf.to_file(out, driver="GeoJSON")
    print(f"  Saved {len(gdf):,} bus stops → {out}")
    return gdf


# ── Main ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    raw          = fetch_bus_ridership()
    clean        = remove_outliers(raw)
    stops, routes, trips, stop_times = download_gtfs()
    route_stops, stop_locs           = build_route_stop_map(stops, routes,
                                                             trips, stop_times)
    stop_rides   = build_stop_ridership(clean, route_stops, stop_locs)
    build_hourly_flows(stop_rides)
    save_bus_stops(stop_locs, stop_rides)

    print("\nBus pipeline complete.")
    print(f"  Raw rows      : {len(raw):,}")
    print(f"  Clean rows    : {len(clean):,}")
    print(f"  Unique routes : {clean['route'].nunique()}")
    print(f"  Bus stops used: {stop_rides['stop_id'].nunique():,}")
