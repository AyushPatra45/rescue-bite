import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const matchGrid  = document.getElementById("matchGrid");
const sortSelect = document.getElementById("sortSelect");

/* ================================================
   LEAFLET MAP SETUP
================================================ */
const map = L.map("map", {
  zoomControl: true,
  scrollWheelZoom: true
}).setView([12.95, 80.15], 12);  // Default: Chennai area

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19
}).addTo(map);

// Layer groups for easy clearing
const markersLayer = L.layerGroup().addTo(map);
const routeLayer   = L.layerGroup().addTo(map);

// Custom icons
const donorIcon = L.divIcon({
  className: "map-marker-donor",
  html: '<div style="background:#22c55e; width:14px; height:14px; border-radius:50%; border:3px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const ngoIcon = L.divIcon({
  className: "map-marker-ngo",
  html: '<div style="background:#ef4444; width:14px; height:14px; border-radius:50%; border:3px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

/* ================================================
   TOAST HELPER
================================================ */
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ================================================
   OSRM ROUTING API  (Free — no key needed)
   Returns { distance (km), duration (mins), geometry }
================================================ */
async function getRoute(lat1, lng1, lat2, lng2) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: +(route.distance / 1000).toFixed(1),       // metres → km
        duration: Math.round(route.duration / 60),            // seconds → mins
        geometry: route.geometry                               // GeoJSON LineString
      };
    }
  } catch (err) {
    console.warn("OSRM fallback to haversine:", err.message);
  }
  return null; // fallback
}

/* ================================================
   HAVERSINE FALLBACK
================================================ */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ================================================
   SHOW ROUTE ON MAP
================================================ */
function showRouteOnMap(food, ngo, geometry) {
  routeLayer.clearLayers();

  // Route polyline
  if (geometry) {
    const coords = geometry.coordinates.map(c => [c[1], c[0]]); // swap lng,lat → lat,lng
    L.polyline(coords, {
      color: "#818cf8",
      weight: 4,
      opacity: 0.85,
      dashArray: "8 6"
    }).addTo(routeLayer);
  } else {
    // Straight line fallback
    L.polyline([[food.lat, food.lng], [ngo.lat, ngo.lng]], {
      color: "#818cf8", weight: 3, opacity: 0.6, dashArray: "6 6"
    }).addTo(routeLayer);
  }

  // Fit map to route
  const bounds = L.latLngBounds([
    [food.lat, food.lng],
    [ngo.lat, ngo.lng]
  ]);
  map.fitBounds(bounds.pad(0.3));
}

/* ================================================
   POPULATE MAP MARKERS
================================================ */
function populateMapMarkers(pairs) {
  markersLayer.clearLayers();
  const addedFood = new Set();
  const addedNgo  = new Set();
  const allCoords = [];

  pairs.forEach(({ food, ngo }) => {
    if (!addedFood.has(food.id)) {
      addedFood.add(food.id);
      L.marker([food.lat, food.lng], { icon: donorIcon })
        .bindPopup(`<b>🟢 ${food.title}</b><br>Qty: ${food.quantity}<br>📍 ${food.location}`)
        .addTo(markersLayer);
      allCoords.push([food.lat, food.lng]);
    }
    if (!addedNgo.has(ngo.id)) {
      addedNgo.add(ngo.id);
      L.marker([ngo.lat, ngo.lng], { icon: ngoIcon })
        .bindPopup(`<b>🔴 ${ngo.ngoName}</b><br>Needs: ${ngo.quantityNeeded}<br>📍 ${ngo.location}`)
        .addTo(markersLayer);
      allCoords.push([ngo.lat, ngo.lng]);
    }
  });

  if (allCoords.length > 1) {
    map.fitBounds(L.latLngBounds(allCoords).pad(0.15));
  } else if (allCoords.length === 1) {
    map.setView(allCoords[0], 13);
  }
}

/* ================================================
   UPDATE STATS BAR
================================================ */
function updateStats(pairs) {
  document.getElementById("statMatches").textContent = pairs.length;

  if (pairs.length === 0) {
    document.getElementById("statAvgDist").textContent = "—";
    document.getElementById("statAvgTime").textContent = "—";
    return;
  }

  const avgDist = pairs.reduce((s, p) => s + p.roadDistance, 0) / pairs.length;
  const avgTime = pairs.reduce((s, p) => s + p.roadTime, 0) / pairs.length;

  document.getElementById("statAvgDist").textContent = avgDist.toFixed(1);
  document.getElementById("statAvgTime").textContent = Math.round(avgTime);
}

/* ================================================
   GENERATE MATCH CARDS
================================================ */
async function generateMatches() {
  if (!matchGrid) return;

  matchGrid.innerHTML = `
    <div class="card" style="grid-column:1 / -1; text-align:center; padding:40px;">
      <div class="loader"></div>
      <p class="muted">Fetching data & computing road distances…</p>
    </div>`;

  const [foodSnap, ngoSnap] = await Promise.all([
    getDocs(collection(db, "FoodSurplus")),
    getDocs(collection(db, "NGORequests"))
  ]);

  // Build raw pairs (haversine pre-filter)
  const rawPairs = [];

  ngoSnap.forEach((ngoDoc) => {
    const ngo = ngoDoc.data();
    if (ngo.status !== "pending") return;

    foodSnap.forEach((foodDoc) => {
      const food = foodDoc.data();
      if (food.status !== "available") return;
      if (food.lat == null || food.lng == null || ngo.lat == null || ngo.lng == null) return;

      const hDist = haversine(food.lat, food.lng, ngo.lat, ngo.lng);
      if (hDist > 25) return; // pre-filter (generous buffer since road > straight-line)

      rawPairs.push({
        food: { ...food, id: foodDoc.id },
        ngo:  { ...ngo,  id: ngoDoc.id },
        hDist
      });
    });
  });

  // Get real road distances from OSRM (batch, max ~15 at a time to be nice to the free API)
  const pairs = [];

  for (const raw of rawPairs) {
    const route = await getRoute(raw.food.lat, raw.food.lng, raw.ngo.lat, raw.ngo.lng);

    let roadDistance, roadTime, routeGeo;

    if (route) {
      roadDistance = route.distance;
      roadTime    = route.duration;
      routeGeo    = route.geometry;
    } else {
      // Fallback: haversine + estimated time
      roadDistance = +raw.hDist.toFixed(1);
      roadTime    = Math.round((raw.hDist / 30) * 60);
      routeGeo    = null;
    }

    if (roadDistance > 20) continue; // real road distance filter

    // Scoring
    let score = 0;
    if (roadDistance <= 5)       score += 50;
    else if (roadDistance <= 12) score += 35;
    else                        score += 20;

    if (Number(raw.food.quantity) >= Number(raw.ngo.quantityNeeded)) score += 30;
    if (raw.ngo.urgency === "High")   score += 20;
    if (raw.ngo.urgency === "Medium") score += 10;

    pairs.push({
      score,
      roadDistance,
      roadTime,
      routeGeo,
      food: raw.food,
      ngo:  raw.ngo
    });
  }

  // Update stats
  updateStats(pairs);

  // Populate map
  populateMapMarkers(pairs);
  routeLayer.clearLayers();

  matchGrid.innerHTML = "";

  if (pairs.length === 0) {
    matchGrid.innerHTML = `
      <div class="card" style="grid-column:1 / -1; text-align:center; padding:40px;">
        <p style="font-size:32px; margin-bottom:10px;">🤷</p>
        <p class="muted">No nearby matches found yet.</p>
        <p class="muted" style="margin-top:4px;">Try adding more food posts or NGO requests.</p>
      </div>`;
    return;
  }

  // Sort
  const sortBy = sortSelect ? sortSelect.value : "score";
  if (sortBy === "distance")    pairs.sort((a, b) => a.roadDistance - b.roadDistance);
  else if (sortBy === "time")   pairs.sort((a, b) => a.roadTime - b.roadTime);
  else                          pairs.sort((a, b) => b.score - a.score);

  pairs.forEach(({ score, roadDistance, roadTime, routeGeo, food, ngo }) => {
    const scoreClass = score >= 70 ? "ok" : score >= 40 ? "warn" : "mid";

    const card = document.createElement("article");
    card.className = "match-card";
    card.innerHTML = `
      <div class="match-top">
        <span class="chip ${scoreClass}">Score: ${score}%</span>
        <span class="chip mid">🛣️ ${roadDistance} km</span>
        <span class="chip ${roadTime <= 10 ? "ok" : roadTime <= 20 ? "warn" : "danger"}">🚗 ${roadTime} min</span>
        ${ngo.urgency === "High" ? '<span class="chip danger">🔴 Urgent</span>' : ""}
      </div>

      <div class="match-body">
        <div class="match-col">
          <div class="match-title">Food Donor</div>
          <div class="match-main">${food.title}</div>
          <div class="match-sub">Qty: ${food.quantity}</div>
          <div class="match-sub">📍 ${food.location}</div>
        </div>

        <div class="match-arrow">→</div>

        <div class="match-col">
          <div class="match-title">NGO</div>
          <div class="match-main">${ngo.ngoName}</div>
          <div class="match-sub">Needs: ${ngo.quantityNeeded}</div>
          <div class="match-sub">📍 ${ngo.location}</div>
        </div>
      </div>

      <div class="match-footer">
        <button class="btn-secondary view-route-btn" style="flex:1;">🗺️ View Route</button>
        <button class="confirm-btn" style="flex:1;">✅ Confirm</button>
        <button class="btn-ghost reject-btn">✕</button>
      </div>
    `;

    // View Route — show driving route on map
    card.querySelector(".view-route-btn").addEventListener("click", () => {
      showRouteOnMap(food, ngo, routeGeo);
      showToast(`Route: ${food.title} → ${ngo.ngoName} (${roadDistance} km, ~${roadTime} min)`, "success");
      // Scroll to map
      document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "center" });
    });

    // Confirm Match
    const confirmBtn = card.querySelector(".confirm-btn");
    confirmBtn.addEventListener("click", async () => {
      confirmBtn.textContent = "Confirming…";
      confirmBtn.disabled = true;
      try {
        await Promise.all([
          updateDoc(doc(db, "FoodSurplus", food.id), { status: "matched" }),
          updateDoc(doc(db, "NGORequests", ngo.id),  { status: "fulfilled" })
        ]);
        showToast(`✅ Matched: ${food.title} → ${ngo.ngoName}`, "success");
        generateMatches();
      } catch (err) {
        showToast("❌ Could not confirm match.", "error");
        console.error(err);
        confirmBtn.textContent = "✅ Confirm";
        confirmBtn.disabled = false;
      }
    });

    // Reject
    card.querySelector(".reject-btn").addEventListener("click", () => {
      card.style.animation = "toastOut 0.25s ease forwards";
      setTimeout(() => card.remove(), 250);
      showToast("Match dismissed.", "error");
    });

    matchGrid.appendChild(card);
  });
}

/* ================================================
   CONTROLS
================================================ */
document.getElementById("refreshBtn")?.addEventListener("click", generateMatches);
sortSelect?.addEventListener("change", generateMatches);

/* ================================================
   INITIAL LOAD
================================================ */
generateMatches();