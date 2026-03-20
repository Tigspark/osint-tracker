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
- Global aircraft positions (5 continental regions)
- Color-coded by operator:
  - 🔴 Military
  - 🟠 Commercial airlines
  - 🔵 Low-cost carriers
  - ⚪ Private / General aviation

### 🚢 Maritime AIS Tracking
- Real-time ship positions (Baltic Sea AIS)
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

# Open in browser
# Just open index.html directly, or serve with:
python -m http.server 8080
# Then visit http://localhost:8080
```

## 🔧 Technologies

- **CesiumJS** - 3D globe visualization
- **Satellite.js** - Orbital calculations (NORAD TLE)
- **OpenSky Network API** - Aviation data
- **Digitraffic API** - Baltic AIS data
- **USGS Earthquake API** - Seismic data

## ⚠️ API Notes

- Aviation: Limited to OpenSky Network coverage area
- Marine: Baltic Sea coverage (public API limitation)
- Satellites: Full catalog from Celestrak

## 📁 Structure

```
osint-tracker/
├── index.html    # Single file app - everything included
└── README.md
```

## 🎮 Controls

- Click ☰ menu to toggle feeds
- Only ONE feed active at a time (prevents overload)
- Click on any marker for details
- Scroll/pinch to zoom, drag to pan

---

**License:** MIT  
**Author:** Tigspark
