// js/firebase-config.js

// Firebase SDK (Pastikan versi yang Anda gunakan adalah yang terbaru)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDzPHLfOB9CGCuoM6LXsdW9rlcW6rwd2RU",
  authDomain: "databaseabsennew.firebaseapp.com",
  projectId: "databaseabsennew",
  storageBucket: "databaseabsennew.firebasestorage.app",
  messagingSenderId: "843425248640",
  appId: "1:843425248640:web:1c278365afae717778bd65",
  databaseURL: "https://databaseabsennew-default-rtdb.firebaseio.com" // Penting untuk Realtime Database
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, ref, push, set, onValue, remove, update };