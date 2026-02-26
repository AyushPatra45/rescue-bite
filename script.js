console.log("SAFE VERSION LOADED");

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const form = document.getElementById("foodForm");
const ngoForm = document.getElementById("ngoForm");
const foodList = document.getElementById("foodList");

/* FOOD FORM */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const quantity = Number(document.getElementById("quantity").value);
    const location = document.getElementById("location").value.trim();

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await addDoc(collection(db, "FoodSurplus"), {
          title,
          quantity,
          location,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          status: "available",
          createdAt: new Date()
        });

        alert("Food Posted Successfully!");
        form.reset();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

/* NGO FORM */
if (ngoForm) {
  ngoForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ngoName = document.getElementById("ngoName").value.trim();
    const quantityNeeded = Number(document.getElementById("quantityNeeded").value);
    const locationNGO = document.getElementById("locationNGO").value.trim();
    const urgency = document.getElementById("urgency").value;

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await addDoc(collection(db, "NGORequests"), {
          ngoName,
          quantityNeeded,
          location: locationNGO,
          urgency,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          status: "pending",
          createdAt: new Date()
        });

        alert("NGO Posted Successfully!");
        ngoForm.reset();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

/* REALTIME LIST */
if (foodList) {
  onSnapshot(collection(db, "FoodSurplus"), (snapshot) => {
    foodList.innerHTML = "";

    snapshot.forEach((doc) => {
      const data = doc.data();

      const div = document.createElement("div");
      div.style.background = "#3a3a5f";
      div.style.padding = "10px";
      div.style.margin = "10px 0";
      div.style.borderRadius = "8px";

      div.innerHTML = `
        <strong>${data.title}</strong><br>
        Qty: ${data.quantity}<br>
        Location: ${data.location}<br>
        Status: ${data.status}
      `;

      foodList.appendChild(div);
    });
  });
}