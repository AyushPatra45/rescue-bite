import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const matchGrid = document.querySelector(".match-grid");

async function generateMatches() {
  if (!matchGrid) return;

  const foodSnap = await getDocs(collection(db, "FoodSurplus"));
  const ngoSnap = await getDocs(collection(db, "NGORequests"));

  matchGrid.innerHTML = "";

  ngoSnap.forEach((ngoDoc) => {
    const ngo = ngoDoc.data();

    // Only match pending requests
    if (ngo.status !== "pending") return;

    foodSnap.forEach((foodDoc) => {
      const food = foodDoc.data();

      if (food.status !== "available") return;

      let score = 0;

      // LOCATION MATCH
      if (
        String(food.location).toLowerCase().trim() ===
        String(ngo.location).toLowerCase().trim()
      ) {
        score += 50;
      }

      // QUANTITY MATCH
      if (Number(food.quantity) >= Number(ngo.quantityNeeded)) {
        score += 30;
      }

      // URGENCY BONUS
      if (ngo.urgency === "High") score += 20;

      if (score > 0) {
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
              <div class="match-sub">Location: ${food.location}</div>
            </div>

            <div class="match-arrow">→</div>

            <div class="match-col">
              <div class="match-title">NGO</div>
              <div class="match-main">${ngo.ngoName}</div>
              <div class="match-sub">Needs: ${ngo.quantityNeeded}</div>
              <div class="match-sub">Location: ${ngo.location}</div>
            </div>
          </div>

          <div class="match-footer">
            <button class="confirm-btn">Confirm Match</button>
          </div>
        `;

        card.querySelector(".confirm-btn").addEventListener("click", async () => {
          await updateDoc(doc(db, "FoodSurplus", foodDoc.id), {
            status: "matched"
          });

          await updateDoc(doc(db, "NGORequests", ngoDoc.id), {
            status: "fulfilled"
          });

          generateMatches();
        });

        matchGrid.appendChild(card);
      }
    });
  });
}

generateMatches();

onSnapshot(collection(db, "FoodSurplus"), generateMatches);
onSnapshot(collection(db, "NGORequests"), generateMatches);