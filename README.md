# Chicago Population Explorer

An interactive hour-by-hour 3D visualization of Chicago's population distribution across census blocks, powered by CTA rail ridership data and US Census demographics.

**Live:** https://sourabhgithubcode.github.io/chicago-population-explorer

---

## What It Shows

Chicago's population swings from **2.7 million overnight residents** to over **3.2 million** at weekday peak, as workers flood the Loop and Streeterville from surrounding neighborhoods and suburbs. This tool visualizes that dynamic — block by block, hour by hour — across a full week.

## Data Sources

| Data | Source |
|------|--------|
| Block-level residential population | US Census 2020 |
| Hourly rail ridership | [CTA — Chicago Data Portal](https://data.cityofchicago.org) |
| Daytime population normalization | US Census LEHD OnTheMap |
| Station locations | CTA GTFS |

## Tech Stack

- **Mapbox GL JS** — 3D map rendering
- **D3.js** — Charts and data binding
- **Python + GeoPandas** — Data pipeline
- **GitHub Actions** — Automated deployment

## Running the Pipeline

```bash
cd pipeline
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

python fetch_census.py    # Downloads Census block data
python fetch_cta.py       # Downloads CTA ridership data
python process.py         # Builds hourly population model
```

Output files are written to `frontend/data/`.

## Local Development

```bash
# Copy config and add your Mapbox public token
cp config.example.js frontend/config.js
# Edit frontend/config.js with your token

# Serve locally
cd frontend
python -m http.server 8080
# Open http://localhost:8080
```

## Deploying

Push to `main`. GitHub Actions injects the Mapbox token from repository secrets and deploys to GitHub Pages automatically.

To set the secret:
`Settings → Secrets → Actions → New repository secret → MAPBOX_TOKEN`

## Methodology

Overnight populations from the 2020 US Census at the block level. Net hourly inflows and outflows are estimated from CTA rail turnstile data, scaled by Chicago's transit mode share (~30%), and dispersed uniformly to census blocks within 400 meters of each station. Final estimates are normalized against LEHD daytime population benchmarks.

**Known limitations:** Bus riders and drivers are not captured. Blocks far from CTA stations may be underestimated. Model represents a hypothetical week in Spring 2023.
