// js/utils.js

// Fungsi untuk menampilkan/menyembunyikan loading overlay
export function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

export function hideLoading() {
    setTimeout(() => {
        document.getElementById('loading-overlay').classList.remove('active');
    }, 1000); // Mengurangi delay menjadi 1 detik untuk loading yang lebih cepat
}

// Inisialisasi Navbar (Sidebar) dan Logout
export function initializePage(auth, signOutCallback) {
    const hamburgerMenu = document.getElementById("hamburger-menu");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const pageWrapper = document.querySelector(".page-wrapper");

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
    if (window.innerWidth > 768) {
        sidebar.classList.add('active'); // Pastikan sidebar aktif di desktop
        pageWrapper.classList.add("sidebar-open"); // Dorong konten utama
    }
}

// Fungsi untuk mendapatkan data guru dan mapel (hardcoded atau dari database)
export function getGuruInfo() {
    return {
        name: "Danu Septiana, S.Pd",
        subject: "Bahasa Inggris"
    };
}

// Fungsi untuk membuat struktur HTML utama (header, sidebar, loading overlay)
export function createPageLayout(currentPage) {
    const guruInfo = getGuruInfo(); // Opsional, bisa dihapus jika info guru selalu dari DB
    const navItems = [
        { name: "Dashboard", href: "home.html", icon: "fas fa-home" },
        { name: "Absensi", href: "presence.html", icon: "fas fa-user-check" },
        { name: "Data Siswa", href: "manage-data.html", icon: "fas fa-users" },
        { name: "Laporan Rekap", href: "recap.html", icon: "fas fa-chart-bar" }
    ];

    let layoutHtml = `
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <img src="https://via.placeholder.com/60x60?text=Logo" alt="Logo" style="border-radius: 50%; margin-bottom: 10px;">
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
                <div class="dummy-space"></div> </div>
            <div class="main-content-container">
                </div>
        </div>

        <div class="overlay" id="overlay"></div>
        <div id="loading-overlay"><div class="spinner"></div></div>
    `;

    // Sisipkan layout setelah body, atau sebelum elemen container utama
    document.body.insertAdjacentHTML('afterbegin', `<div class="page-wrapper">${layoutHtml}</div>`);

    // Pindahkan konten container yang ada di HTML ke dalam main-content-container
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