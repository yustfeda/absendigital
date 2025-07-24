// js/recap.js

import { auth, database, onAuthStateChanged, signOut, ref, onValue, remove } from "./firebase-config.js";
import { showLoading, hideLoading, initializePage, getGuruInfo, createPageLayout, addFooter } from "./utils.js";

// Buat layout halaman (termasuk header, sidebar, loading overlay)
createPageLayout("recap.html");

const selectMonthInput = document.getElementById("select-month");
const selectClassDropdown = document.getElementById("select-class");
const showRecapButton = document.getElementById("show-recap-button");
const downloadRecapButton = document.getElementById("download-recap-button");
const deleteRecapButton = document.getElementById("delete-recap-button");
const recapListBody = document.getElementById("recap-list-body");
const tableHeaderRow = document.getElementById("table-header-row");
const errorMessageDiv = document.getElementById("error-message");
const successMessageDiv = document.getElementById("success-message");

let allStudents = {};
let currentRecapData = []; // Data rekap yang sedang ditampilkan (untuk unduh)
let currentGuruInfo = {};

// Cek status otentikasi
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        initializePage(auth, signOut);
        // Set nilai default bulan ke bulan saat ini
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        selectMonthInput.value = currentMonth;

        await loadGuruInfo(); // Pastikan info guru dimuat
        loadClasses();
        addFooter(); // Tambahkan footer
    }
});

async function loadGuruInfo() {
    return new Promise((resolve) => {
        const guruRef = ref(database, 'guruInfo');
        onValue(guruRef, (snapshot) => {
            if (snapshot.exists()) {
                currentGuruInfo = snapshot.val();
            } else {
                currentGuruInfo = getGuruInfo(); // Ambil dari utils jika tidak ada di DB
            }
            resolve();
        }, {
            onlyOnce: true
        });
    });
}

function loadClasses() {
    const studentsRef = ref(database, 'students');
    onValue(studentsRef, (snapshot) => {
        allStudents = {};
        const classes = new Set();
        snapshot.forEach((childSnapshot) => {
            const studentId = childSnapshot.key;
            const studentData = childSnapshot.val();
            allStudents[studentId] = studentData;
            classes.add(studentData.class);
        });

        selectClassDropdown.innerHTML = '<option value="">Semua Kelas</option>';
        Array.from(classes).sort().forEach(className => {
            const option = document.createElement("option");
            option.value = className;
            option.textContent = className;
            selectClassDropdown.appendChild(option);
        });
    }, { onlyOnce: true });
}

showRecapButton.addEventListener("click", () => {
    displayRecap();
});

async function displayRecap() {
    errorMessageDiv.textContent = "";
    successMessageDiv.textContent = "";
    recapListBody.innerHTML = "";
    tableHeaderRow.innerHTML = "";
    currentRecapData = [];

    const selectedMonthYear = selectMonthInput.value; // Format: YYYY-MM
    const selectedClass = selectClassDropdown.value;

    if (!selectedMonthYear) {
        errorMessageDiv.textContent = "Silakan pilih bulan dan tahun.";
        return;
    }

    showLoading(); // Tampilkan loading

    const [year, month] = selectedMonthYear.split('-');
    const daysInMonth = new Date(year, month, 0).getDate(); // Mendapatkan jumlah hari dalam bulan

    // Buat header tabel dinamis
    let headerCells = ['No', 'Nama Siswa', 'Kelas'];
    for (let i = 1; i <= daysInMonth; i++) {
        headerCells.push(`${i.toString().padStart(2, '0')}/${month}`);
    }
    headerCells.push('Total Hadir', 'Total Alfa', 'Total Izin', 'Total Sakit');

    tableHeaderRow.innerHTML = headerCells.map(text => `<th data-label="${text}">${text}</th>`).join('');


    // Filter siswa berdasarkan kelas yang dipilih
    const filteredStudents = Object.keys(allStudents)
        .filter(studentId => {
            return selectedClass === "" || allStudents[studentId].class === selectedClass;
        })
        .map(studentId => ({ id: studentId, ...allStudents[studentId] }))
        .sort((a, b) => {
            if (a.class === b.class) return a.name.localeCompare(b.name);
            return a.class.localeCompare(b.class);
        });

    if (filteredStudents.length === 0) {
        recapListBody.innerHTML = `<tr><td colspan="${headerCells.length}" style="text-align: center;">Tidak ada siswa untuk kelas yang dipilih atau belum ada data siswa.</td></tr>`;
        hideLoading();
        return;
    }

    let rowIndex = 1;
    for (const student of filteredStudents) {
        const attendanceData = {};
        let totalHadir = 0;
        let totalAlfa = 0;
        let totalIzin = 0;
        let totalSakit = 0;

        const classNodeName = student.class.replace(/\s/g, ''); // Hapus spasi
        const studentAttendanceRef = ref(database, `attendance/${selectedMonthYear}/${classNodeName}/${student.id}`);

        await new Promise(resolve => {
            onValue(studentAttendanceRef, (snapshot) => {
                snapshot.forEach(dateSnapshot => {
                    attendanceData[dateSnapshot.key] = dateSnapshot.val();
                });
                resolve();
            }, { onlyOnce: true });
        });

        const rowData = [rowIndex++, student.name, student.class];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${month}-${i.toString().padStart(2, '0')}`;
            const status = attendanceData[dateStr] || '-'; // '-' jika tidak ada data
            rowData.push(status);

            switch (status) {
                case 'Hadir': totalHadir++; break;
                case 'Alfa': totalAlfa++; break;
                case 'Izin': totalIzin++; break;
                case 'Sakit': totalSakit++; break;
            }
        }
        rowData.push(totalHadir, totalAlfa, totalIzin, totalSakit);
        currentRecapData.push(rowData); // Simpan untuk ekspor

        const row = recapListBody.insertRow();
        rowData.forEach((item, index) => {
            const cell = row.insertCell();
            cell.textContent = item;
            cell.setAttribute('data-label', headerCells[index]); // Untuk responsif
        });
    }

    if (currentRecapData.length === 0) {
        recapListBody.innerHTML = `<tr><td colspan="${headerCells.length}" style="text-align: center;">Tidak ada data absensi untuk bulan dan kelas yang dipilih.</td></tr>`;
    }
    hideLoading();
}


downloadRecapButton.addEventListener("click", () => {
    if (currentRecapData.length === 0) {
        errorMessageDiv.textContent = "Tidak ada data rekap untuk diunduh. Silakan tampilkan rekap terlebih dahulu.";
        return;
    }

    errorMessageDiv.textContent = "";
    successMessageDiv.textContent = "";
    showLoading(); // Tampilkan loading saat unduh

    const selectedMonthYear = selectMonthInput.value;
    const selectedClass = selectClassDropdown.value;
    const fileName = `Rekap_Absensi_${selectedClass ? selectedClass.replace(/\s/g, '_') + '_' : ''}${selectedMonthYear}.xlsx`;

    const headerRowHtml = tableHeaderRow.querySelectorAll('th');
    const header = Array.from(headerRowHtml).map(th => th.textContent);

    const worksheetData = [header, ...currentRecapData];

    // Tambahkan informasi guru dan tanda tangan di bagian bawah
    const numCols = header.length; // Jumlah kolom dalam tabel rekap
    const ttdOffset = Math.max(0, numCols - 4); // Misal ingin TTD mulai 4 kolom dari kanan

    const guruInfo = currentGuruInfo || getGuruInfo(); // Ambil info guru yang sedang aktif
    let guruLine = Array(ttdOffset).fill('');
    guruLine[ttdOffset] = `Guru Pengampu: ${guruInfo.name}`;
    let mapelLine = Array(ttdOffset).fill('');
    mapelLine[ttdOffset] = `Mata Pelajaran: ${guruInfo.subject}`;
    let ttdLine = Array(ttdOffset).fill('');
    ttdLine[ttdOffset] = `(____________________________)`;

    worksheetData.push([]); // Baris kosong
    worksheetData.push(guruLine);
    worksheetData.push(mapelLine);
    worksheetData.push([]); // Baris kosong untuk TTD
    worksheetData.push(ttdLine);


    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Atur lebar kolom (opsional, bisa disesuaikan)
    const wscols = [
        { wch: 5 }, // No
        { wch: 25 }, // Nama Siswa
        { wch: 15 } // Kelas
    ];
    // Lebar untuk tanggal (misalnya 5 karakter per tanggal)
    for (let i = 0; i < (header.length - 7); i++) { // -7 karena 3 kolom awal dan 4 kolom total
        wscols.push({ wch: 5 });
    }
    wscols.push({ wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }); // Total Hadir, Alfa, Izin, Sakit

    // Jika ada baris TTD, pastikan kolomnya cukup lebar
    if (ttdOffset < numCols) { // Pastikan offset tidak melebihi jumlah kolom
        if (!wscols[ttdOffset]) wscols[ttdOffset] = {}; // Buat jika belum ada
        wscols[ttdOffset].wch = Math.max(wscols[ttdOffset]?.wch || 0, 30); // Beri lebar cukup untuk teks TTD
    }
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    XLSX.writeFile(wb, fileName);

    successMessageDiv.textContent = "Rekap berhasil diunduh!";
    hideLoading(); // Sembunyikan loading setelah selesai
});

deleteRecapButton.addEventListener("click", () => {
    const selectedMonthYear = selectMonthInput.value;
    const selectedClass = selectClassDropdown.value;

    if (!selectedMonthYear) {
        errorMessageDiv.textContent = "Silakan pilih bulan dan tahun rekap yang ingin dihapus.";
        return;
    }

    let confirmationMessage = `Apakah Anda yakin ingin menghapus semua data rekap untuk bulan ${selectedMonthYear}`;
    if (selectedClass) {
        confirmationMessage += ` kelas ${selectedClass}`;
    }
    confirmationMessage += "? Aksi ini tidak dapat dibatalkan.";

    if (confirm(confirmationMessage)) {
        showLoading(); // Tampilkan loading saat menghapus
        let pathToDelete = `attendance/${selectedMonthYear}`;

        if (selectedClass) {
            const classNodeName = selectedClass.replace(/\s/g, '');
            pathToDelete += `/${classNodeName}`;
        }

        const recapToDeleteRef = ref(database, pathToDelete);

        remove(recapToDeleteRef)
            .then(() => {
                successMessageDiv.textContent = `Data rekap untuk ${selectedClass ? 'kelas ' + selectedClass : ''} bulan ${selectedMonthYear} berhasil dihapus!`;
                errorMessageDiv.textContent = "";
                displayRecap(); // Muat ulang rekap setelah penghapusan
                hideLoading();
            })
            .catch((error) => {
                console.error("Error deleting recap:", error);
                errorMessageDiv.textContent = "Gagal menghapus rekap: " + error.message;
                hideLoading();
            });
    }
});