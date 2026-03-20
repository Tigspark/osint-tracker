# 🌍 OSINT Tracker - Global Command Center

Real-time tracking of satellites, aircraft, maritime vessels, and seismic activity using CesiumJS.

## 📡 Features

### 🛰️ Satellite Tracking
- Full NORAD satellite catalog
- Color-coded by type:
  - 🟢 GPS / Starlink / Communication
  - 🟡 Navigation satellites
  - 🔴 Military / Government
  - ⚪ Commercial

### ✈️ Aviation Tracking
- Global aircraft positions
- Color-coded by operator:
  - 🔴 Military
  - 🟠 Commercial airlines
  - 🔵 Low-cost carriers
  - ⚪ Private / General aviation

### 🚢 Maritime AIS Tracking
- Real-time ship positions
- Color-coded by vessel type:
  - 🟠 Cargo / Freight
  - 🟡 Tanker / Chemical
  - 🟢 Passenger / Ferry
  - 🔵 Fishing / Research
  - 🟣 Tug / Service vessels
  - 🔷 Navigation buoys

### ⚠️ Seismic Activity
- 24-hour earthquake feed
- Size indicates magnitude
- USGS data source

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Tigspark/osint-tracker.git
cd osint-tracker

# Open index.html in a browser
# Or serve with any static server:
npx serve .
```

## 📁 Project Structure

- `main` branch - **OSINT Tracker** (Global Command Center)
- `trading-bot` branch - **Crypto Trading Bot**

## 🔧 Technologies

- **CesiumJS** - 3D globe visualization
- **Satellite.js** - Orbital calculations
- **OpenSky Network API** - Aviation data
- **Digitraffic API** - Baltic AIS data
- **USGS Earthquake API** - Seismic data

## ⚠️ API Notes

- Aviation: Requires CORS proxy for browser access
- Marine: Baltic Sea coverage (limited by public API)
- Satellites: Full catalog from Celestrak

---

## 🤖 Trading Bot (see `trading-bot` branch)

The crypto trading bot with Grid, DCA, and Mean Reversion strategies is in the `trading-bot` branch.

```bash
git checkout trading-bot
```

---

**License:** MIT  
**Author:** Tigspark
