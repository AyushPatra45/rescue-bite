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
   HAVERSINE DISTANCE  (km)
================================================ */
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ================================================
   GENERATE MATCH CARDS
================================================ */
async function generateMatches() {
  if (!matchGrid) return;

  // Show loading
  matchGrid.innerHTML = `
    <div class="card" style="grid-column:1 / -1; text-align:center; padding:40px;">
      <div class="loader"></div>
      <p class="muted">Analysing matches…</p>
    </div>`;

  const [foodSnap, ngoSnap] = await Promise.all([
    getDocs(collection(db, "FoodSurplus")),
    getDocs(collection(db, "NGORequests"))
  ]);

  const pairs = [];

  ngoSnap.forEach((ngoDoc) => {
    const ngo = ngoDoc.data();
    if (ngo.status !== "pending") return;

    foodSnap.forEach((foodDoc) => {
      const food = foodDoc.data();
      if (food.status !== "available") return;

      // Skip if either entry has no GPS data
      if (food.lat == null || food.lng == null || ngo.lat == null || ngo.lng == null) return;

      const distance     = calcDistance(food.lat, food.lng, ngo.lat, ngo.lng);
      const etaMins      = Math.round((distance / 30) * 60);
      if (distance > 20) return;                             // outside 20 km range

      // Scoring
      let score = 0;
      if (distance <= 5)       score += 50;
      else if (distance <= 12) score += 35;
      else                     score += 20;

      if (Number(food.quantity) >= Number(ngo.quantityNeeded)) score += 30;
      if (ngo.urgency === "High")   score += 20;
      if (ngo.urgency === "Medium") score += 10;

      pairs.push({
        score, distance, etaMins,
        food: { ...food, id: foodDoc.id },
        ngo:  { ...ngo,  id: ngoDoc.id  }
      });
    });
  });

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
  if (sortBy === "distance") {
    pairs.sort((a, b) => a.distance - b.distance);
  } else {
    pairs.sort((a, b) => b.score - a.score);
  }

  pairs.forEach(({ score, distance, etaMins, food, ngo }) => {
    const scoreClass = score >= 70 ? "ok" : score >= 40 ? "warn" : "mid";
    const canConfirm = distance <= 20;

    const card = document.createElement("article");
    card.className = "match-card";
    card.innerHTML = `
      <div class="match-top">
        <span class="chip ${scoreClass}">Score: ${score}%</span>
        <span class="chip mid">${distance.toFixed(1)} km</span>
        <span class="chip ${etaMins <= 10 ? "ok" : "warn"}">ETA: ${etaMins} mins</span>
        ${ngo.urgency === "High" ? '<span class="chip danger">High Urgency</span>' : ""}
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
        ${canConfirm
          ? `<button class="confirm-btn">✅ Confirm Match</button>`
          : `<span class="chip danger" style="flex:1;justify-content:center;">Too Far</span>`
        }
        <button class="btn-ghost reject-btn">Reject</button>
      </div>
    `;

    // Confirm
    const confirmBtn = card.querySelector(".confirm-btn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", async () => {
        confirmBtn.textContent = "Confirming…";
        confirmBtn.disabled    = true;
        try {
          await Promise.all([
            updateDoc(doc(db, "FoodSurplus", food.id),  { status: "matched"   }),
            updateDoc(doc(db, "NGORequests", ngo.id),   { status: "fulfilled" })
          ]);
          showToast(`✅ Match confirmed — ${food.title} → ${ngo.ngoName}`, "success");
          generateMatches();
        } catch (err) {
          showToast("❌ Could not confirm match. Try again.", "error");
          console.error(err);
          confirmBtn.textContent = "✅ Confirm Match";
          confirmBtn.disabled    = false;
        }
      });
    }

    // Reject — just remove the card locally
    const rejectBtn = card.querySelector(".reject-btn");
    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => {
        card.style.animation = "toastOut 0.25s ease forwards";
        setTimeout(() => card.remove(), 250);
        showToast("Match dismissed.", "error");
      });
    }

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