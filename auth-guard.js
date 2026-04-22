// auth-guard.js — Import shared Firebase auth, no re-initialisation
import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// Redirect unauthenticated users to login page
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

// Global logout handler — works for any element with class="logout-btn"
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("logout-btn")) {
    e.preventDefault();
    signOut(auth)
      .then(() => { window.location.href = "index.html"; })
      .catch((err) => console.error("Logout error:", err));
  }
});