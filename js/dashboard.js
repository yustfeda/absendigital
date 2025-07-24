// js/dashboard.js
import { auth } from './ap.js'; // Impor instance auth dari ap.js
import { signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// --- DOM Elements ---
const logoutBtn = document.getElementById('logout-btn');
const sidebar = document.getElementById('sidebar');
const hamburgerMenu = document.getElementById('hamburger-menu');
const content = document.querySelector('.content'); // Area konten utama
const loadingOverlay = document.getElementById('loading-overlay'); // Elemen loading

const sidebarLinks = document.querySelectorAll('.sidebar-link');
const pageContents = document.querySelectorAll('.page-content');

// --- DEBUGGING: Periksa apakah elemen dashboard ditemukan ---
console.log('DEBUG: dashboard.js - Checking DOM elements...');
console.log('  logoutBtn:', logoutBtn);
console.log('  sidebar:', sidebar);
console.log('  hamburgerMenu:', hamburgerMenu);
console.log('  loadingOverlay:', loadingOverlay);
console.log('--- End Debugging dashboard.js: DOM Elements Check ---');

// Fungsi untuk menampilkan loading overlay
export function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        console.log('DEBUG: Loading overlay shown.');
    }
}

// Fungsi untuk menyembunyikan loading overlay
export function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
        console.log('DEBUG: Loading overlay hidden.');
    }
}


// --- Sidebar and Page Navigation Logic ---
if (hamburgerMenu && sidebar && content) {
    hamburgerMenu.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        content.classList.toggle('sidebar-open');
        document.body.classList.toggle('sidebar-open'); // Untuk body agar content bergeser
        console.log('DEBUG: Hamburger menu clicked. Sidebar toggled.');
    });
} else {
    console.warn('WARNING: Missing elements for sidebar functionality (hamburgerMenu, sidebar, or content).');
}

if (sidebarLinks.length > 0 && pageContents.length > 0) {
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showLoading(); // Tampilkan loading
            const targetPageId = e.target.closest('a').dataset.page;
            console.log(`DEBUG: Sidebar link clicked. Navigating to page: #${targetPageId}`);
            
            setTimeout(() => { // Simulasi loading 2 detik
                // Remove active class from all links and content
                sidebarLinks.forEach(item => item.classList.remove('active'));
                pageContents.forEach(page => page.classList.remove('active'));
                
                // Add active class to clicked link and target content
                e.target.closest('a').classList.add('active');
                const targetPage = document.getElementById(targetPageId);
                if (targetPage) {
                    targetPage.classList.add('active');
                    console.log(`DEBUG: Page #${targetPageId} activated.`);
                } else {
                    console.error(`ERROR: Target page #${targetPageId} not found.`);
                }
                
                // Close sidebar on mobile after clicking a link
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    content.classList.remove('sidebar-open');
                    document.body.classList.remove('sidebar-open');
                    console.log('DEBUG: Sidebar closed on mobile after navigation.');
                }
                hideLoading(); // Sembunyikan loading
            }, 1000); // 2 detik
        });
    });
    
    // Handle initial page load from hash in URL
    const initialHash = window.location.hash.substring(1) || 'dashboard'; // Default to dashboard
    const initialLink = document.querySelector(`.sidebar-link[data-page="${initialHash}"]`);
    if (initialLink) {
        initialLink.click(); // Simulate click to activate correct page
    } else {
        // Fallback for an invalid hash, ensure dashboard is always shown
        document.querySelector('.sidebar-link[data-page="dashboard"]').click();
    }
    
} else {
    console.warn('WARNING: Missing sidebar links or page contents for navigation.');
}


// --- Firebase Authentication: Logout ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        showLoading(); // Tampilkan loading
        console.log('DEBUG: Logout button clicked.');
        if (confirm('Apakah Anda yakin ingin logout?')) {
            try {
                await signOut(auth); // Panggil fungsi signOut dari Firebase Auth
                console.log('DEBUG: User signed out successfully. Redirecting to login.html');
                setTimeout(() => { // Tunggu 2 detik sebelum redirect
                    window.location.href = 'login.html'; // Redirect ke halaman login
                    hideLoading(); // Sembunyikan loading (sebelum redirect)
                }, 2000);
            } catch (error) {
                console.error('ERROR: Error signing out:', error);
                alert('Gagal logout. Silakan coba lagi.');
                hideLoading(); // Sembunyikan loading jika ada error
            }
        } else {
            hideLoading(); // Sembunyikan loading jika dibatalkan
        }
    });
}