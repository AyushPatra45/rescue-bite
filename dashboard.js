import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const foodCountEl = document.querySelectorAll(".kpi-value")[0];
const ngoCountEl = document.querySelectorAll(".kpi-value")[1];
const matchCountEl = document.querySelectorAll(".kpi-value")[2];

// -------- ACTIVE FOOD POSTS --------
onSnapshot(collection(db, "FoodSurplus"), (snapshot) => {
  let activeCount = 0;
  let matchedCount = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.status === "available") activeCount++;
    if (data.status === "matched") matchedCount++;
  });

  foodCountEl.innerText = activeCount;
  matchCountEl.innerText = matchedCount;
});

// -------- NGO REQUEST COUNT --------
onSnapshot(collection(db, "NGORequests"), (snapshot) => {
  let pendingCount = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.status === "pending") pendingCount++;
  });

  ngoCountEl.innerText = pendingCount;
});