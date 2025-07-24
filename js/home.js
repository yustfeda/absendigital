// js/home.js

import { auth, signOut, onAuthStateChanged, database, ref, onValue } from "./firebase-config.js";
import { initializePage, createPageLayout, getGuruInfo, addFooter } from "./utils.js";

// Buat layout halaman (termasuk header, sidebar, loading overlay)
createPageLayout("home.html"); // Kirim current page untuk menandai active di sidebar

const guruNameSpan = document.getElementById("guru-name");
const mapelNameSpan = document.getElementById("mapel-name");

// Cek status otentikasi
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Ambil info guru dari database atau pakai hardcode jika belum ada di database
        const guruRef = ref(database, 'guruInfo');
        onValue(guruRef, (snapshot) => {
            if (snapshot.exists()) {
                const guruData = snapshot.val();
                guruNameSpan.textContent = guruData.name || "Danu Septiana, S.Pd";
                mapelNameSpan.textContent = guruData.subject || "Bahasa Inggris";
            } else {
                // Jika belum ada di database, pakai hardcode
                const guruInfo = getGuruInfo();
                guruNameSpan.textContent = guruInfo.name;
                mapelNameSpan.textContent = guruInfo.subject;
            }
        }, {
            onlyOnce: true
        });

        // Inisialisasi tombol logout dan hamburger menu
        initializePage(auth, signOut);
        addFooter(); // Tambahkan footer setelah konten utama dimuat dan data guru dimuat
    } else {
        window.location.href = "index.html";
    }
});
