console.log("Script running with GEO enabled");

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const form = document.getElementById("foodForm");
const ngoForm = document.getElementById("ngoForm");
const foodList = document.getElementById("foodList");
const resultBox = document.getElementById("matchResult");


/* ---------------- FOOD FORM ---------------- */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const quantity = Number(document.getElementById("quantity").value);
    const location = document.getElementById("location").value.trim();

    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      try {
        await addDoc(collection(db, "FoodSurplus"), {
          title,
          quantity,
          location,
          lat,
          lng,
          status: "available",
          createdAt: new Date()
        });

        alert("Food Posted Successfully!");
        form.reset();

      } catch (error) {
        console.error("Error adding food:", error);
      }
    });
  });
}


/* ---------------- NGO FORM ---------------- */
if (ngoForm) {
  ngoForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ngoName = document.getElementById("ngoName").value.trim();
    const quantityNeeded = Number(document.getElementById("quantityNeeded").value);
    const locationNGO = document.getElementById("locationNGO").value.trim();
    const urgency = document.getElementById("urgency").value;

    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      try {
        await addDoc(collection(db, "NGORequests"), {
          ngoName,
          quantityNeeded,
          location: locationNGO,
          urgency,
          lat,
          lng,
          status: "pending",
          createdAt: new Date()
        });

        alert("NGO Requirement Posted!");
        ngoForm.reset();

      } catch (error) {
        console.error("Error adding NGO request:", error);
      }
    });
  });
}


/* ---------------- REAL-TIME FOOD LIST ---------------- */
if (foodList) {
  onSnapshot(collection(db, "FoodSurplus"), (snapshot) => {
    foodList.innerHTML = "";

    snapshot.forEach((foodDoc) => {
      const data = foodDoc.data();

      const foodItem = document.createElement("div");

      foodItem.style.background =
        data.status === "matched" ? "#7f1d1d" : "#3a3a5f";

      foodItem.style.padding = "12px";
      foodItem.style.margin = "10px 0";
      foodItem.style.borderRadius = "8px";

      foodItem.innerHTML = `
        <strong>${data.title}</strong><br>
        Quantity: ${data.quantity}<br>
        Location: ${data.location}<br>
        Status: ${data.status}
      `;

      foodList.appendChild(foodItem);
    });
  });
}