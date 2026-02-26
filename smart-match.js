import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

onSnapshot(collection(db, "FoodSurplus"), (snapshot) => {
  console.log("Live match data:", snapshot.docs.map(d => d.data()));
});