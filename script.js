console.log("Script is running");

import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const form = document.getElementById("foodForm");
const ngoForm = document.getElementById("ngoForm");

// FOOD FORM
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

// NGO FORM
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

    if (matchFound) {
      alert("🔥 MATCH FOUND!");
    }

    alert("NGO Requirement Posted Successfully!");
    ngoForm.reset();

  } catch (error) {
    console.error("Error adding NGO request: ", error);
  }
});