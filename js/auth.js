// js/auth.js

// Import modul Firebase Auth dan Database dari firebase-config.js
import { auth, signInWithEmailAndPassword, onAuthStateChanged } from "./firebase-config.js";

// Import fungsi utilitas untuk loading overlay
import { showLoading, hideLoading } from "./utils.js";

// Ambil referensi elemen-elemen DOM
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const errorMessageDiv = document.getElementById("error-message");

// --- Bagian Utama Logika Otentikasi ---

// Periksa status otentikasi saat halaman dimuat
// Ini penting untuk:
// 1. Mengarahkan user yang sudah login langsung ke home.html
// 2. Memastikan user yang logout tidak bisa akses halaman lain tanpa login
onAuthStateChanged(auth, (user) => {
// Sembunyikan loading jika ada (untuk kasus refresh halaman setelah berhasil login
// atau jika ada masalah lain sebelum event listener aktif)
hideLoading();

if (user) {  
    // Pengguna sudah login, arahkan ke halaman beranda  
    console.log("User already logged in:", user.email);  
    window.location.href = "home.html";  
} else {  
    // Pengguna belum login, pastikan halaman login siap  
    console.log("No user logged in. Displaying login page.");  
    // Pastikan form login terlihat dan siap digunakan  
    if (emailInput) emailInput.value = ""; // Bersihkan field email  
    if (passwordInput) passwordInput.value = ""; // Bersihkan field password  
}

});

// Tambahkan event listener untuk tombol login, hanya jika elemennya ada
if (loginButton) {
loginButton.addEventListener("click", async (e) => {
e.preventDefault(); // Mencegah form submit default yang bisa me-refresh halaman

const email = emailInput.value.trim();  
    const password = passwordInput.value.trim();  

    // Bersihkan pesan error sebelumnya  
    if (errorMessageDiv) {  
        errorMessageDiv.textContent = "";  
    }  

    // Validasi input sederhana  
    if (!email || !password) {  
        if (errorMessageDiv) {  
            errorMessageDiv.textContent = "Email dan password tidak boleh kosong.";  
        }  
        return; // Hentikan eksekusi jika input kosong  
    }  

    showLoading(); // Tampilkan loading overlay  

    try {  
        // Coba login dengan email dan password menggunakan Firebase Auth  
        const userCredential = await signInWithEmailAndPassword(auth, email, password);  
        const user = userCredential.user;  

        console.log("Login successful! User:", user.email);  

        // Redirect ke halaman beranda setelah berhasil login  
        // Hide loading akan dilakukan segera setelah redirect  
        window.location.href = "home.html";  

    } catch (error) {  
        // Tangani error saat login  
        const errorCode = error.code;  
        const errorMessage = error.message;  

        console.error("Login Error:", errorCode, errorMessage); // Log error lengkap ke konsol  

        // Sembunyikan loading overlay jika login gagal  
        hideLoading();  

        // Tampilkan pesan error yang lebih mudah dipahami pengguna  
        if (errorMessageDiv) {  
            switch (errorCode) {  
                case "auth/invalid-email":  
                    errorMessageDiv.textContent = "Format email tidak valid.";  
                    break;  
                case "auth/user-disabled":  
                    errorMessageDiv.textContent = "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.";  
                    break;  
                case "auth/user-not-found":  
                case "auth/wrong-password":  
                    errorMessageDiv.textContent = "Email atau password salah. Silakan coba lagi.";  
                    break;  
                case "auth/too-many-requests":  
                    errorMessageDiv.textContent = "Terlalu banyak percobaan login yang gagal. Silakan coba lagi nanti.";  
                    break;  
                case "auth/network-request-failed":  
                    errorMessageDiv.textContent = "Tidak ada koneksi internet atau masalah jaringan. Silakan coba lagi.";  
                    break;  
                default:  
                    errorMessageDiv.textContent = `Terjadi kesalahan: ${errorMessage}.`;  
                    break;  
            }  
        }  
    }  
});

} else {
console.error("Login button element not found. Please check your index.html.");
}

