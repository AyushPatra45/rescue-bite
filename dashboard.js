import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const kpiFood  = document.getElementById("kpiFood");
const kpiNgo   = document.getElementById("kpiNgo");
const kpiMatch = document.getElementById("kpiMatch");

const recentFoodList = document.getElementById("recentFoodList");
const recentNgoList  = document.getElementById("recentNgoList");

/* -------- FOOD SURPLUS -------- */
onSnapshot(collection(db, "FoodSurplus"), (snapshot) => {
  let activeCount  = 0;
  let matchedCount = 0;
  const recentItems = [];

  snapshot.forEach((doc) => {
    const d = { id: doc.id, ...doc.data() };
    if (d.status === "available") { activeCount++;  recentItems.push(d); }
    if (d.status === "matched")     matchedCount++;
  });

  if (kpiFood)  kpiFood.textContent  = activeCount;
  if (kpiMatch) kpiMatch.textContent = matchedCount;

  if (recentFoodList) {
    recentFoodList.innerHTML = "";
    const slice = recentItems.slice(0, 6);

    if (slice.length === 0) {
      recentFoodList.innerHTML = `<div class="empty-state" style="margin:0;padding:20px;"><p>No active food posts yet.</p></div>`;
      return;
    }

    slice.forEach((d) => {
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `
        <div>
          <div class="item-title">${d.title}</div>
          <div class="item-sub">${d.quantity} meals &nbsp;•&nbsp; ${d.location}</div>
        </div>
        <span class="chip ok">Available</span>
      `;
      recentFoodList.appendChild(row);
    });
  }
});

/* -------- NGO REQUESTS -------- */
onSnapshot(collection(db, "NGORequests"), (snapshot) => {
  let pendingCount = 0;
  const recentItems = [];

  snapshot.forEach((doc) => {
    const d = { id: doc.id, ...doc.data() };
    if (d.status === "pending") { pendingCount++; recentItems.push(d); }
  });

  if (kpiNgo) kpiNgo.textContent = pendingCount;

  if (recentNgoList) {
    recentNgoList.innerHTML = "";
    const slice = recentItems.slice(0, 6);

    if (slice.length === 0) {
      recentNgoList.innerHTML = `<div class="empty-state" style="margin:0;padding:20px;"><p>No pending NGO requests.</p></div>`;
      return;
    }

    slice.forEach((d) => {
      const chipClass = d.urgency === "High" ? "danger" : d.urgency === "Medium" ? "warn" : "ok";
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `
        <div>
          <div class="item-title">${d.ngoName}</div>
          <div class="item-sub">${d.quantityNeeded} meals &nbsp;•&nbsp; ${d.location}</div>
        </div>
        <span class="chip ${chipClass}">${d.urgency}</span>
      `;
      recentNgoList.appendChild(row);
    });
  }
});