// js/ap.js
// Import fungsi initializeApp dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

// Import fungsi getAuth untuk Authentication
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Import fungsi untuk Realtime Database
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";


// =========================================================
// !!! PENTING: GANTI DENGAN KONFIGURASI FIREBASE ANDA SENDIRI !!!
// Anda bisa mendapatkan ini dari Firebase Console -> Project settings -> Your apps
// =========================================================
const firebaseConfig = {
    apiKey: "AIzaSyAx25sJzuEudu6hcXbawiV7m88KsqYhaA0",                 // Ganti dengan API Key Anda
    authDomain: "new-absen-fb291.firebaseapp.com",         // Ganti dengan Auth Domain Anda
    projectId: "new-absen-fb291",           // Ganti dengan Project ID Anda
    storageBucket: "new-absen-fb291.firebasestorage.app",
    messagingSenderId: "1025282572296",
    appId: "1:1025282572296:web:2ac4208033616923d411bd",
    databaseURL: "https://new-absen-fb291-default-rtdb.firebaseio.com" // *** PENTING: TAMBAHKAN URL REALTIME DATABASE ANDA DI SINI ***
};

console.log("DEBUG: ap.js - Firebase Config loaded:", firebaseConfig);

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);
console.log("DEBUG: ap.js - Firebase app initialized.");

// Dapatkan instance autentikasi Firebase
export const auth = getAuth(app);
console.log("DEBUG: ap.js - Firebase Auth instance created and exported.");

// Dapatkan instance Realtime Database
export const database = getDatabase(app);
console.log("DEBUG: ap.js - Firebase Realtime Database instance created and exported.");

// --- Global Listener for Authentication State (Untuk perlindungan rute) ---
// Ini akan memantau status login di seluruh aplikasi
onAuthStateChanged(auth, (user) => {
    console.log("DEBUG: ap.js - onAuthStateChanged triggered. User:", user ? user.uid : 'No user');

    const currentPath = window.location.pathname;

    // Jika pengguna di halaman login dan sudah login, arahkan ke dashboard
    if (currentPath.includes('login.html')) {
        if (user) {
            console.log('DEBUG: ap.js - User already logged in on login page. Redirecting to dashboard.');
            window.location.href = 'dashboard.html';
        }
    }
    // Jika pengguna di halaman dashboard/halaman terproteksi lainnya dan TIDAK login, arahkan ke login
    else if (currentPath.includes('dashboard.html')) {
        if (!user) {
            console.log('DEBUG: ap.js - User not logged in on dashboard page. Redirecting to login.');
            window.location.href = 'login.html';
        }
    }
    // Untuk halaman 'index.html', arahkan ke dashboard jika sudah login, atau ke login jika belum
    else if (currentPath.includes('index.html')) {
        if (user) {
            console.log('DEBUG: ap.js - User logged in on index page. Redirecting to dashboard.');
            window.location.href = 'dashboard.html';
        } else {
            console.log('DEBUG: ap.js - User not logged in on index page. Redirecting to login.');
            window.location.href = 'login.html';
        }
    }
    // Tambahkan kondisi untuk halaman terproteksi lainnya jika ada
});