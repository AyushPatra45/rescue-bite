console.log("Script is running");

import { db } from "./firebase-config.js";

import { collection, addDoc, getDocs, onSnapshot } 
from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const form = document.getElementById("foodForm");
const ngoForm = document.getElementById("ngoForm");
const foodList = document.getElementById("foodList");


// ---------------- FOOD FORM ----------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const quantity = document.getElementById("quantity").value;
  const location = document.getElementById("location").value;

  try {
    await addDoc(collection(db, "FoodSurplus"), {
      title,
      quantity,
      location,
      status: "available",
      createdAt: new Date()
    });

    alert("Food Posted Successfully!");
    form.reset();
  } catch (error) {
    console.error("Error adding document: ", error);
  }
});


// ---------------- NGO FORM ----------------
ngoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const ngoName = document.getElementById("ngoName").value;
  const quantityNeeded = document.getElementById("quantityNeeded").value;
  const locationNGO = document.getElementById("locationNGO").value;
  const urgency = document.getElementById("urgency").value;

  try {
    await addDoc(collection(db, "NGORequests"), {
      ngoName,
      quantityNeeded,
      location: locationNGO,
      urgency,
      createdAt: new Date(),
      status: "pending"
    });

    // MATCH CHECK
    const foodSnapshot = await getDocs(collection(db, "FoodSurplus"));

    let matchFound = false;

    foodSnapshot.forEach((doc) => {
      const foodData = doc.data();

      if (
        String(foodData.location).trim().toLowerCase() ===
        String(locationNGO).trim().toLowerCase() &&
        parseInt(foodData.quantity) >= parseInt(quantityNeeded)
      ) {
        matchFound = true;
      }
    });

    const resultBox = document.getElementById("matchResult");
    resultBox.innerText = "";

    if (matchFound) {
      resultBox.innerText =
        "🔥 MATCH FOUND! Food available in " + locationNGO +
        "\n✅ NGO Requirement Posted Successfully!";
    } else {
      resultBox.innerText =
        "❌ No matching food found in " + locationNGO +
        "\n✅ NGO Requirement Posted Successfully!";
    }

    ngoForm.reset();

  } catch (error) {
    console.error("Error adding NGO request: ", error);
  }
});


// ---------------- REAL-TIME FOOD LIST ----------------
onSnapshot(collection(db, "FoodSurplus"), (snapshot) => {
  foodList.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();

    const foodItem = document.createElement("div");
    foodItem.style.background = "#3a3a5f";
    foodItem.style.padding = "10px";
    foodItem.style.margin = "8px 0";
    foodItem.style.borderRadius = "6px";

    foodItem.innerHTML = `
      <strong>${data.title}</strong><br>
      Quantity: ${data.quantity}<br>
      Location: ${data.location}<br>
      Status: ${data.status}
    `;

    foodList.appendChild(foodItem);
  });
});