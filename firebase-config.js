import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKOtJ9bPWH91-stp-iow8v9f_yNRKUi3c",
  authDomain: "rescue-bite-d5058.firebaseapp.com",
  projectId: "rescue-bite-d5058",
  storageBucket: "rescue-bite-d5058.firebasestorage.app",
  messagingSenderId: "1025906539351",
  appId: "1:1025906539351:web:e3bfbea5e18748c5531c12",
  measurementId: "G-MYJE5S51T2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };