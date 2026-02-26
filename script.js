console.log("Script is running");
import { db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const form = document.getElementById("foodForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const quantity = document.getElementById("quantity").value;
  const location = document.getElementById("location").value;

  try {
    await addDoc(collection(db, "FoodSurplus"), {
      title: title,
      quantity: quantity,
      location: location,
      status: "available",
      createdAt: new Date()
    });

    alert("Food Posted Successfully!");
    form.reset();
  } catch (error) {
    console.error("Error adding document: ", error);
  }
});