console.log("Script is running");

import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const form = document.getElementById("foodForm");
const ngoForm = document.getElementById("ngoForm");
const foodList = document.getElementById("foodList");


// ---------------- FOOD FORM ----------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const quantity = Number(document.getElementById("quantity").value);
  const location = document.getElementById("location").value.trim();

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

  const ngoName = document.getElementById("ngoName").value.trim();
  const quantityNeeded = Number(document.getElementById("quantityNeeded").value);
  const locationNGO = document.getElementById("locationNGO").value.trim();
  const urgency = document.getElementById("urgency").value;

  try {
    // Save NGO Request
    await addDoc(collection(db, "NGORequests"), {
      ngoName,
      quantityNeeded,
      location: locationNGO,
      urgency,
      createdAt: new Date(),
      status: "pending"
    });

    // MATCH CHECK + UPDATE
    const foodSnapshot = await getDocs(collection(db, "FoodSurplus"));

    let matchFound = false;

    for (const foodDoc of foodSnapshot.docs) {
      const foodData = foodDoc.data();

      const foodLocation = String(foodData.location).trim().toLowerCase();
      const ngoLocation = locationNGO.toLowerCase();
      const foodQuantity = Number(foodData.quantity);

      if (
        foodData.status === "available" &&
        foodLocation === ngoLocation &&
        foodQuantity >= quantityNeeded
      ) {
        matchFound = true;

        await updateDoc(doc(db, "FoodSurplus", foodDoc.id), {
          status: "matched"
        });

        break;
      }
    }

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