// js/presence.js

import { auth, database, onAuthStateChanged, signOut, ref, onValue, set } from "./firebase-config.js";
import { showLoading, hideLoading, initializePage, getGuruInfo, createPageLayout, addFooter } from "./utils.js";

// Buat layout halaman (termasuk header, sidebar, loading overlay)
createPageLayout("presence.html");

const currentDateSpan = document.getElementById("current-date");
const guruNameSpan = document.getElementById("guru-name");
const mapelNameSpan = document.getElementById("mapel-name");
const presenceListBody = document.getElementById("presence-list-body");
const savePresenceButton = document.getElementById("save-presence-button");
const successMessageDiv = document.getElementById("success-message");
const errorMessageDiv = document.getElementById("error-message");

// Elemen untuk filter kelas
const filterClassDropdown = document.getElementById("filter-class-presence");
const applyFilterButton = document.getElementById("apply-filter-presence");


let studentsData = {}; // Untuk menyimpan data siswa yang dimuat dari Firebase
let currentGuruInfo = {};

// Cek status otentikasi
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        initializePage(auth, signOut); // Inisialisasi tombol logout dan hamburger menu
        displayCurrentDate();
        await loadGuruInfo(); // Pastikan info guru dimuat sebelum memuat siswa
        populateClassFilterOptions(); // NEW: Memuat daftar kelas statis untuk dropdown filter
        loadStudentsAndAttendance(); // Initial load without filter
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
            guruNameSpan.textContent = currentGuruInfo.name;
            mapelNameSpan.textContent = currentGuruInfo.subject;
            resolve();
        }, {
            onlyOnce: true
        });
    });
}

function displayCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateSpan.textContent = today.toLocaleDateString('id-ID', options);
}

function getFormattedDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// NEW: Fungsi untuk mengisi dropdown filter dengan opsi kelas yang spesifik
function populateClassFilterOptions() {
    filterClassDropdown.innerHTML = '<option value="">Semua Kelas</option>'; // Opsi "Semua"
    const classes = ['7', '8', '9']; // Kelas yang diinginkan
    classes.forEach(className => {
        const option = document.createElement("option");
        option.value = className;
        option.textContent = `Kelas ${className}`;
        filterClassDropdown.appendChild(option);
    });
}


// Modifikasi fungsi untuk menerima parameter filter kelas
async function loadStudentsAndAttendance(filterClass = "") {
    const studentsRef = ref(database, 'students');
    const todayDate = getFormattedDate(new Date());

    showLoading(); // Tampilkan loading saat memuat data

    onValue(studentsRef, async (snapshot) => {
        presenceListBody.innerHTML = "";
        studentsData = {}; // Reset studentsData

        if (!snapshot.exists()) {
            presenceListBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Belum ada data siswa. Silakan tambahkan di "Manage Data".</td></tr>';
            hideLoading();
            return;
        }

        const studentPromises = [];
        snapshot.forEach((childSnapshot) => {
            const studentId = childSnapshot.key;
            const studentData = childSnapshot.val();

            // Filter siswa berdasarkan kelas yang dipilih
            // Perhatikan bahwa nilai `studentData.class` mungkin "XII IPA 1"
            // sedangkan `filterClass` adalah "7", "8", atau "9".
            // Kita perlu membandingkan hanya angka kelasnya.
            const studentClassNumber = studentData.class ? studentData.class.match(/\d+/)?.[0] : null;

            if (filterClass === "" || (studentClassNumber && studentClassNumber === filterClass)) {
                studentsData[studentId] = studentData;

                const classNodeName = studentData.class.replace(/\s/g, ''); // Hapus spasi
                const attendanceRef = ref(database, `attendance/${todayDate.substring(0, 7)}/${classNodeName}/${studentId}/${todayDate}`);
                studentPromises.push(
                    new Promise((resolve) => {
                        onValue(attendanceRef, (attSnapshot) => {
                            studentData.attendanceToday = attSnapshot.val();
                            resolve();
                        }, { onlyOnce: true });
                    })
                );
            }
        });

        await Promise.all(studentPromises); // Tunggu semua data kehadiran diambil untuk siswa yang difilter

        let i = 1;
        const sortedStudents = Object.keys(studentsData).map(key => ({ id: key, ...studentsData[key] }))
            .sort((a, b) => {
                // Sort by class first, then by name
                const classA = a.class ? a.class.match(/\d+/)?.[0] : null;
                const classB = b.class ? b.class.match(/\d+/)?.[0] : null;

                if (classA && classB && classA !== classB) {
                    return parseInt(classA) - parseInt(classB);
                }
                return a.name.localeCompare(b.name);
            });

        if (sortedStudents.length === 0 && filterClass !== "") {
             presenceListBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Tidak ada siswa di Kelas ${filterClass}.</td></tr>`;
        } else if (sortedStudents.length === 0) {
             presenceListBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Belum ada data siswa. Silakan tambahkan di "Manage Data".</td></tr>';
        }

        sortedStudents.forEach(student => {
            const row = presenceListBody.insertRow();
            row.setAttribute('data-student-id', student.id);
            row.setAttribute('data-student-class', student.class);

            row.insertCell(0).textContent = i++;
            row.cells[0].setAttribute('data-label', 'No');
            row.insertCell(1).textContent = student.name;
            row.cells[1].setAttribute('data-label', 'Nama Siswa');
            row.insertCell(2).textContent = student.class;
            row.cells[2].setAttribute('data-label', 'Kelas');

            const presenceCell = row.insertCell(3);
            presenceCell.setAttribute('data-label', 'Kehadiran');
            presenceCell.classList.add('presence-options');

            const statusOptions = ['Hadir', 'Alfa', 'Izin', 'Sakit'];
            statusOptions.forEach(status => {
                const radioInput = document.createElement("input");
                radioInput.type = "radio";
                radioInput.name = `presence-${student.id}`;
                radioInput.value = status;
                radioInput.id = `presence-${student.id}-${status.toLowerCase()}`;
                if (student.attendanceToday === status) {
                    radioInput.checked = true;
                }

                const label = document.createElement("label");
                label.htmlFor = `presence-${student.id}-${status.toLowerCase()}`;
                label.textContent = status;

                presenceCell.appendChild(radioInput);
                presenceCell.appendChild(label);
            });
        });
        hideLoading();
    }, {
        onlyOnce: true
    });
}

// Event listener untuk tombol "Terapkan Filter"
if (applyFilterButton) {
    applyFilterButton.addEventListener("click", () => {
        const selectedClass = filterClassDropdown.value;
        loadStudentsAndAttendance(selectedClass); // Panggil ulang dengan filter
    });
}

savePresenceButton.addEventListener("click", () => {
    successMessageDiv.textContent = "";
    errorMessageDiv.textContent = "";

    const todayDate = getFormattedDate(new Date());
    const currentMonthYear = todayDate.substring(0, 7);

    const allRows = presenceListBody.querySelectorAll("tr");
    let allSavedSuccessfully = true;
    let anyUnselected = false;

    if (allRows.length === 0 || allRows[0].querySelector('td').textContent.includes('Belum ada data siswa') || allRows[0].querySelector('td').textContent.includes('Tidak ada siswa di kelas')) {
        errorMessageDiv.textContent = "Tidak ada siswa untuk disimpan.";
        return;
    }

    showLoading(); // Tampilkan loading saat menyimpan

    const savePromises = [];
    allRows.forEach(row => {
        const studentId = row.getAttribute('data-student-id');
        const studentClass = row.getAttribute('data-student-class').replace(/\s/g, '');
        const selectedRadio = row.querySelector(`input[name="presence-${studentId}"]:checked`);

        if (selectedRadio) {
            const status = selectedRadio.value;
            const attendancePath = `attendance/${currentMonthYear}/${studentClass}/${studentId}/${todayDate}`;
            const attendanceRef = ref(database, attendancePath);
            savePromises.push(set(attendanceRef, status));
        } else {
            anyUnselected = true;
            allSavedSuccessfully = false;
        }
    });

    Promise.all(savePromises)
        .then(() => {
            if (anyUnselected) {
                errorMessageDiv.textContent = "Beberapa siswa belum dipilih status kehadirannya.";
            } else {
                successMessageDiv.textContent = "Absensi berhasil disimpan!";
            }
            hideLoading();
        })
        .catch((error) => {
            console.error("Error saving some attendance records:", error);
            errorMessageDiv.textContent = "Terjadi kesalahan saat menyimpan absensi. Cek konsol.";
            hideLoading();
        });
});
