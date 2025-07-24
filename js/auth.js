// js/auth.js
import { auth } from './ap.js'; // Impor instance auth dari ap.js
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Dapatkan referensi ke elemen HTML yang relevan dengan login
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');

// Elemen untuk Pop-up Notifikasi
const notificationPopup = document.getElementById('notification-popup');
const popupIcon = document.getElementById('popup-icon');
const popupMessage = document.getElementById('popup-message');

// --- DEBUGGING: Periksa apakah elemen HTML ditemukan di auth.js ---
console.log('DEBUG: auth.js - Checking DOM elements...');
console.log('  loginForm:', loginForm);
console.log('  emailInput:', emailInput);
console.log('  passwordInput:', passwordInput);
console.log('  loginButton:', loginButton);
console.log('  notificationPopup:', notificationPopup);
console.log('  popupIcon:', popupIcon);
console.log('  popupMessage:', popupMessage);
console.log('--- End Debugging auth.js: DOM Elements Check ---');


/**
 * Menampilkan pop-up notifikasi.
 * @param {string} type - Tipe notifikasi ('success' atau 'error').
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {boolean} [autoClose=false] - Apakah pop-up akan otomatis tertutup.
 * @param {string|null} [redirectUrl=null] - URL untuk redirect setelah pop-up tertutup (jika autoClose true).
 */
function showPopup(type, message, autoClose = false, redirectUrl = null) {
    console.log(`DEBUG: showPopup called. Type: ${type}, Message: "${message}", AutoClose: ${autoClose}, Redirect: ${redirectUrl}`);

    if (!notificationPopup || !popupIcon || !popupMessage) {
        console.error('ERROR: One or more popup elements are missing. Falling back to alert().');
        alert(message); // Fallback jika elemen pop-up tidak ditemukan
        return;
    }

    // Reset ikon sebelumnya dan set ikon baru
    popupIcon.classList.remove('fa-check-circle', 'fa-times-circle');
    if (type === 'success') {
        popupIcon.classList.add('fa-check-circle');
    } else if (type === 'error') {
        popupIcon.classList.add('fa-times-circle');
    }

    popupMessage.textContent = message;
    notificationPopup.classList.add('show'); // Tampilkan pop-up

    if (autoClose) {
        setTimeout(() => {
            notificationPopup.classList.remove('show'); // Sembunyikan pop-up
            if (redirectUrl) {
                console.log(`DEBUG: Redirecting to ${redirectUrl} after popup.`);
                window.location.href = redirectUrl;
            }
        }, 1800); // Tutup setelah 1.8 detik
    }
}


// Event listener untuk form login, hanya jika elemen loginForm ditemukan
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Mencegah reload halaman

        console.log('DEBUG: Login form submitted.');

        // Nonaktifkan tombol login dan berikan feedback visual
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = 'Memproses...';
            console.log('DEBUG: Login button disabled and text changed.');
        }

        // Ambil nilai email dan password, trim whitespace
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Validasi input dasar
        if (!email || !password) {
            console.warn('WARNING: Email or password input is empty.');
            showPopup('error', 'Email dan password tidak boleh kosong.');
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
            }
            return; // Hentikan eksekusi
        }

        try {
            console.log(`DEBUG: Attempting signInWithEmailAndPassword for email: "${email}"...`);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('DEBUG: Login successful! User:', userCredential.user.uid);

            showPopup('success', 'Login berhasil! Mengarahkan ke dashboard...', true, 'dashboard.html');

        } catch (error) {
            console.error('ERROR: Firebase Authentication Failed!', error); // Log objek error lengkap
            console.error('Firebase Error Code:', error.code);
            console.error('Firebase Error Message:', error.message);

            let userFriendlyMessage = 'Login gagal. Terjadi kesalahan yang tidak diketahui.';

            // Sesuaikan pesan user-friendly berdasarkan kode error Firebase
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    userFriendlyMessage = 'Email atau password salah. Silakan coba lagi.';
                    break;
                case 'auth/invalid-email':
                    userFriendlyMessage = 'Format email tidak valid. Periksa kembali email Anda.';
                    break;
                case 'auth/too-many-requests':
                    userFriendlyMessage = 'Terlalu banyak percobaan login yang gagal. Akun Anda mungkin terkunci sementara. Coba lagi nanti.';
                    break;
                case 'auth/network-request-failed':
                    userFriendlyMessage = 'Kesalahan jaringan. Pastikan Anda terhubung ke internet.';
                    break;
                default:
                    // Untuk error lain, tampilkan pesan generik atau error.message jika aman
                    userFriendlyMessage = `Login gagal: ${error.message}`;
                    break;
            }

            console.log(`DEBUG: Displaying user-friendly error: "${userFriendlyMessage}"`);
            showPopup('error', userFriendlyMessage); // Tampilkan pop-up error

            // Aktifkan kembali tombol login
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
            }
        }
    });
} else {
    console.error('ERROR: login-form element not found in login.html. Login functionality will not be active.');
}