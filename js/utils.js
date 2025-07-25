// js/utils.js

// Fungsi untuk menampilkan/menyembunyikan loading overlay
export function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

export function hideLoading() {
    // Delay 2 detik untuk efek loading
    setTimeout(() => {
        document.getElementById('loading-overlay').classList.remove('active');
    }, 2000); // Durasi loading 2 detik
}

// Inisialisasi Navbar (Sidebar) dan Logout
export function initializePage(auth, signOutCallback) {
    const hamburgerMenu = document.getElementById("hamburger-menu");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const pageWrapper = document.querySelector(".page-wrapper"); // Elemen pembungkus utama

    // Tangani hamburger menu click
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            overlay.classList.toggle("active");
            // Menggeser konten utama hanya di desktop jika sidebar dibuka/ditutup
            if (window.innerWidth > 768) {
                 pageWrapper.classList.toggle("sidebar-open");
            }
        });
    }

    // Tangani klik di overlay untuk menutup sidebar
    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
            if (window.innerWidth > 768) {
                 pageWrapper.classList.remove("sidebar-open");
            }
        });
    }

    // Tangani tombol logout di sidebar
    const logoutButton = document.getElementById("logout-button-sidebar");
    if (logoutButton) {
        logoutButton.addEventListener("click", (e) => {
            e.preventDefault();
            showLoading(); // Tampilkan loading sebelum logout
            signOutCallback(auth).then(() => {
                // hideLoading() akan dipanggil setelah delay di utils.js
                window.location.href = "index.html";
            }).catch((error) => {
                console.error("Error logging out:", error);
                alert("Terjadi kesalahan saat logout.");
                hideLoading();
            });
        });
    }

    // Fungsi untuk menutup sidebar saat tautan navigasi diklik (opsional, tapi baik untuk UX)
    const sidebarLinks = sidebar ? sidebar.querySelectorAll('.sidebar-nav a') : [];
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) { // Hanya tutup di mobile
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });

    // Handle initial state for desktop (sidebar always visible)
    // Ini akan dipanggil saat halaman dimuat
    if (window.innerWidth > 768) {
        sidebar.classList.add('active'); // Pastikan sidebar aktif di desktop
        // Tidak perlu menggeser page-wrapper karena sidebar sudah fixed/relative di desktop
    }

    // Tambahkan event listener untuk resize window
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.add('active');
            overlay.classList.remove('active'); // Pastikan overlay tersembunyi di desktop
            pageWrapper.classList.remove("sidebar-open"); // Pastikan tidak ada margin di desktop
        } else {
            sidebar.classList.remove('active'); // Sembunyikan sidebar di mobile secara default
            overlay.classList.remove('active');
        }
    });
}

// Fungsi untuk mendapatkan data guru dan mapel (hardcoded atau dari database)
// Ini adalah fallback jika data belum ada di database
export function getGuruInfo() {
    return {
        name: "Danu Septiana, S.Pd",
        subject: "Bahasa Inggris"
    };
}

// Fungsi untuk membuat struktur HTML utama (header, sidebar, loading overlay)
export function createPageLayout(currentPage) {
    // Ikon Font Awesome sudah disertakan di HTML, jadi kita bisa langsung menggunakannya.
    const navItems = [
        { name: "Dashboard", href: "home.html", icon: "fas fa-home" },
        { name: "Absensi", href: "presence.html", icon: "fas fa-user-check" },
        { name: "Data Siswa", href: "manage-data.html", icon: "fas fa-users" },
        { name: "Laporan Rekap", href: "recap.html", icon: "fas fa-chart-bar" }
    ];

    let layoutHtml = `
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <img src="assets/lebak.png" alt="Logo Absensi"> <!-- Logo placeholder -->
                <h2>Absensi Siswa</h2>
            </div>
            <nav class="sidebar-nav">
                <ul>
    `;

    navItems.forEach(item => {
        layoutHtml += `
                    <li>
                        <a href="${item.href}" ${currentPage === item.href ? 'class="active"' : ''}>
                            <i class="${item.icon}"></i> ${item.name}
                        </a>
                    </li>
        `;
    });

    layoutHtml += `
                    <li>
                        <a href="#" id="logout-button-sidebar">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    </li>
                </ul>
            </nav>
        </div>

        <div class="main-content-area">
            <div class="top-header">
                <div class="hamburger-menu" id="hamburger-menu">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                </div>
                <div class="app-title">Dashboard - Absensi Siswa</div>
                <div class="dummy-space"></div> <!-- Untuk menyeimbangkan layout -->
            </div>
            <div class="main-content-container">
                <!-- Konten spesifik halaman akan di sini -->
            </div>
        </div>

        <div class="overlay" id="overlay"></div>
        <div id="loading-overlay"><div class="spinner"></div></div>
    `;

    // Sisipkan layout ke dalam body
    document.body.insertAdjacentHTML('afterbegin', `<div class="page-wrapper">${layoutHtml}</div>`);

    // Pindahkan konten container yang ada di HTML ke dalam main-content-container
    // Ini harus dilakukan setelah page-wrapper dan main-content-container dibuat
    const existingContainer = document.querySelector('body > .container'); // Asumsi container utama
    const mainContentContainer = document.querySelector('.main-content-container');
    if (existingContainer && mainContentContainer) {
        mainContentContainer.appendChild(existingContainer);
    }
}

// Tambahkan footer
export function addFooter() {
    const footerHtml = `
        <footer class="footer">
            <p>&copy; 2025 Absensi Siswa Filial SMPN 2 Cileles. All rights reserved.</p>
            <div class="footer-social">
                <a href="#"><i class="fab fa-facebook-f"></i></a>
                <a href="#"><i class="fab fa-twitter"></i></a>
                <a href="#"><i class="fab fa-instagram"></i></a>
            </div>
        </footer>
    `;
    document.body.insertAdjacentHTML('beforeend', footerHtml);
}

// Fungsi untuk menambahkan loading overlay di halaman login juga (karena tidak ada layout penuh)
export function addLoadingOverlayToLogin() {
    const loginContainer = document.querySelector('.container');
    if (loginContainer) {
        loginContainer.insertAdjacentHTML('afterend', '<div id="loading-overlay"><div class="spinner"></div></div>');
    }
}
