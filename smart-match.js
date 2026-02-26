import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const matchGrid = document.querySelector(".match-grid");

/* ---------------- DISTANCE CALCULATION ---------------- */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in KM

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ---------------- MATCH GENERATION ---------------- */
async function generateMatches() {
  if (!matchGrid) return;

  const foodSnap = await getDocs(collection(db, "FoodSurplus"));
  const ngoSnap = await getDocs(collection(db, "NGORequests"));

  matchGrid.innerHTML = "";

  ngoSnap.forEach((ngoDoc) => {
    const ngo = ngoDoc.data();

    if (ngo.status !== "pending") return;

    foodSnap.forEach((foodDoc) => {
      const food = foodDoc.data();

      if (food.status !== "available") return;

      // ✅ Proper geo safety check
      if (
        food.lat == null ||
        food.lng == null ||
        ngo.lat == null ||
        ngo.lng == null
      ) {
        return;
      }

      /* -------- DISTANCE CALCULATION -------- */
      const distance = calculateDistance(
        food.lat,
        food.lng,
        ngo.lat,
        ngo.lng
      );

      const estimatedTime = (distance / 30) * 60; // 30km/h avg speed

      let score = 0;
      let canConfirm = false;

      /* -------- DISTANCE SCORING -------- */
      if (distance <= 8) {
        score += 50;
        canConfirm = true;
      } else if (distance <= 20) {
        score += 30;
        canConfirm = true;
      } else {
        canConfirm = false;
      }

      /* -------- QUANTITY MATCH -------- */
      if (Number(food.quantity) >= Number(ngo.quantityNeeded)) {
        score += 30;
      }

      /* -------- URGENCY BONUS -------- */
      if (ngo.urgency === "High") {
        score += 20;
      }

      /* -------- SHOW MATCH ONLY IF WITHIN 20KM -------- */
      if (distance <= 20) {
        const card = document.createElement("article");
        card.className = "card match-card";

        card.innerHTML = `
          <div class="match-top">
            <span class="chip ok">Score: ${score}%</span>
          </div>

          <div class="match-body">
            <div class="match-col">
              <div class="match-title">Food</div>
              <div class="match-main">${food.title}</div>
              <div class="match-sub">Qty: ${food.quantity}</div>
              <div class="match-sub">Distance: ${distance.toFixed(2)} km</div>
              <div class="match-sub">ETA: ${estimatedTime.toFixed(0)} mins</div>
            </div>

            <div class="match-arrow">→</div>

            <div class="match-col">
              <div class="match-title">NGO</div>
              <div class="match-main">${ngo.ngoName}</div>
              <div class="match-sub">Needs: ${ngo.quantityNeeded}</div>
              <div class="match-sub">Urgency: ${ngo.urgency}</div>
            </div>
          </div>

          <div class="match-footer">
            ${
              canConfirm
                ? `<button class="confirm-btn">Confirm Match</button>`
                : `<div class="chip danger">Too Far</div>`
            }
          </div>
        `;

        const confirmBtn = card.querySelector(".confirm-btn");

        if (confirmBtn) {
          confirmBtn.addEventListener("click", async () => {
            await updateDoc(doc(db, "FoodSurplus", foodDoc.id), {
              status: "matched"
            });

            await updateDoc(doc(db, "NGORequests", ngoDoc.id), {
              status: "fulfilled"
            });

            generateMatches();
          });
        }

        matchGrid.appendChild(card);
      }
    });
  });

  /* -------- EMPTY STATE -------- */
  if (matchGrid.innerHTML === "") {
    matchGrid.innerHTML = `
      <div class="card">
        <p class="muted">No nearby smart matches available.</p>
      </div>
    `;
  }
}

/* ---------------- REFRESH BUTTON ---------------- */
document.getElementById("refreshBtn")?.addEventListener("click", generateMatches);

/* ---------------- INITIAL LOAD ---------------- */
generateMatches();