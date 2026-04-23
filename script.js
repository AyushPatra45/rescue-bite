import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

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
   INLINE MESSAGE HELPER
================================================ */
function showMsg(el, message, type = "success") {
  if (!el) return;
  el.style.display  = "block";
  el.style.background = type === "success"
    ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
  el.style.border = type === "success"
    ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)";
  el.style.color = type === "success" ? "#86efac" : "#fca5a5";
  el.textContent = message;
}

/* ================================================
   GEOCODE LOCATION (OpenStreetMap Nominatim)
   Converts a location name → { lat, lng }
   Free, no API key needed.
================================================ */
async function geocodeLocation(locationText) {
  const url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(locationText)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "RescueBite-FoodApp/1.0" }
  });

  const data = await res.json();

  if (!data || data.length === 0) {
    return null;
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
}

/* ================================================
   FOOD DONATION FORM  (donate.html)
================================================ */
const form        = document.getElementById("foodForm");
const foodSuccess = document.getElementById("foodSuccess");
const foodError   = document.getElementById("foodError");
const donateBtn   = document.getElementById("donateBtn");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title    = document.getElementById("title").value.trim();
    const quantity = Number(document.getElementById("quantity").value);
    const location = document.getElementById("location").value.trim();

    if (foodSuccess) foodSuccess.style.display = "none";
    if (foodError)   foodError.style.display   = "none";
    if (donateBtn)   { donateBtn.textContent = "📍 Locating address…"; donateBtn.disabled = true; }

    try {
      // Geocode the user-entered location to lat/lng
      const coords = await geocodeLocation(location);

      if (!coords) {
        showMsg(foodError, "❌ Could not find that location. Please enter a more specific address (e.g. Tambaram, Chennai).", "error");
        showToast("❌ Location not found.", "error");
        if (donateBtn) { donateBtn.textContent = "📍 Post Food"; donateBtn.disabled = false; }
        return;
      }

      await addDoc(collection(db, "FoodSurplus"), {
        title,
        quantity,
        location,
        lat: coords.lat,
        lng: coords.lng,
        status: "available",
        createdAt: new Date()
      });

      showMsg(foodSuccess, "✅ Food posted! Nearby NGOs can now claim it.", "success");
      showToast("✅ Food post submitted!", "success");
      form.reset();
    } catch (err) {
      showMsg(foodError, "❌ Failed to post. Please try again.", "error");
      showToast("❌ Submission failed.", "error");
      console.error(err);
    } finally {
      if (donateBtn) { donateBtn.textContent = "📍 Post Food"; donateBtn.disabled = false; }
    }
  });
}

/* ================================================
   NGO REQUEST FORM  (request.html)
================================================ */
const ngoForm     = document.getElementById("ngoForm");
const matchResult = document.getElementById("matchResult");
const requestBtn  = document.getElementById("requestBtn");

if (ngoForm) {
  ngoForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ngoName        = document.getElementById("ngoName").value.trim();
    const quantityNeeded = Number(document.getElementById("quantityNeeded").value);
    const locationNGO    = document.getElementById("locationNGO").value.trim();
    const urgency        = document.getElementById("urgency").value;

    if (matchResult) matchResult.style.display = "none";
    if (requestBtn)  { requestBtn.textContent = "📍 Locating address…"; requestBtn.disabled = true; }

    try {
      // Geocode the user-entered location to lat/lng
      const coords = await geocodeLocation(locationNGO);

      if (!coords) {
        showMsg(matchResult, "❌ Could not find that location. Please enter a more specific address (e.g. Velachery, Chennai).", "error");
        showToast("❌ Location not found.", "error");
        if (requestBtn) { requestBtn.textContent = "📍 Post Request"; requestBtn.disabled = false; }
        return;
      }

      await addDoc(collection(db, "NGORequests"), {
        ngoName,
        quantityNeeded,
        location: locationNGO,
        urgency,
        lat: coords.lat,
        lng: coords.lng,
        status: "pending",
        createdAt: new Date()
      });

      showMsg(matchResult,
        `✅ Request posted for ${ngoName}! Go to Smart Match to find nearby donors.`,
        "success"
      );
      showToast("✅ NGO request submitted!", "success");
      ngoForm.reset();
    } catch (err) {
      showMsg(matchResult, "❌ Failed to post. Please try again.", "error");
      showToast("❌ Submission failed.", "error");
      console.error(err);
    } finally {
      if (requestBtn) { requestBtn.textContent = "📍 Post Request"; requestBtn.disabled = false; }
    }
  });
}

/* ================================================
   REALTIME FOOD LIST  (donate.html)
================================================ */
const foodList   = document.getElementById("foodList");
const emptyState = document.getElementById("emptyState");

if (foodList) {
  onSnapshot(collection(db, "FoodSurplus"), (snapshot) => {
    foodList.innerHTML = "";
    const items = [];

    snapshot.forEach((doc) => {
      const d = { id: doc.id, ...doc.data() };
      if (d.status === "available") items.push(d);
    });

    if (items.length === 0) {
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    items.forEach((d) => {
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `
        <div>
          <div class="item-title">${d.title}</div>
          <div class="item-sub">Qty: ${d.quantity} &nbsp;•&nbsp; ${d.location}</div>
        </div>
        <span class="chip ok">Available</span>
      `;
      foodList.appendChild(row);
    });
  });
}