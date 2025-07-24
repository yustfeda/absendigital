// js/manage-data.js

import { auth, database, onAuthStateChanged, signOut, ref, push, set, onValue, remove, update } from "./firebase-config.js";
import { showLoading, hideLoading, initializePage, createPageLayout, getGuruInfo, addFooter } from "./utils.js";

// Buat layout halaman (termasuk header, sidebar, loading overlay)
createPageLayout("manage-data.html");

const guruNameInput = document.getElementById("guru-name-input");
const mapelNameInput = document.getElementById("mapel-name-input");
const saveGuruMapelButton = document.getElementById("save-guru-mapel-button");

const studentNameInput = document.getElementById("student-name");
const studentNisnInput = document.getElementById("student-nisn"); // New NISN input
const studentClassInput = document.getElementById("student-class");
const addStudentButton = document.getElementById("add-student-button");
const studentListBody = document.getElementById("student-list-body");
const successMessageDiv = document.getElementById("success-message");
const errorMessageDiv = document.getElementById("error-message");

let editingStudentId = null; // Untuk menyimpan ID siswa yang sedang diedit

// Cek status otentikasi
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        initializePage(auth, signOut); // Inisialisasi tombol logout dan hamburger menu
        loadGuruMapel();
        loadStudents();
        addFooter(); // Tambahkan footer
    }
});

// --- Fungsi untuk Guru & Mata Pelajaran ---
function loadGuruMapel() {
    const guruRef = ref(database, 'guruInfo');
    onValue(guruRef, (snapshot) => {
        if (snapshot.exists()) {
            const guruData = snapshot.val();
            guruNameInput.value = guruData.name || '';
            mapelNameInput.value = guruData.subject || '';
        } else {
            // Jika belum ada di database, gunakan nilai default dari utils
            const defaultGuruInfo = getGuruInfo();
            guruNameInput.value = defaultGuruInfo.name;
            mapelNameInput.value = defaultGuruInfo.subject;
        }
    }, {
        onlyOnce: true // Hanya ambil sekali saat dimuat
    });
}

saveGuruMapelButton.addEventListener("click", () => {
    const guruName = guruNameInput.value.trim();
    const mapelName = mapelNameInput.value.trim();

    successMessageDiv.textContent = "";
    errorMessageDiv.textContent = "";

    if (guruName && mapelName) {
        showLoading();
        const guruRef = ref(database, 'guruInfo');
        set(guruRef, {
            name: guruName,
            subject: mapelName
        })
        .then(() => {
            successMessageDiv.textContent = "Data Guru & Mata Pelajaran berhasil disimpan!";
            hideLoading();
        })
        .catch((error) => {
            console.error("Error saving guru/mapel:", error);
            errorMessageDiv.textContent = "Gagal menyimpan data Guru & Mata Pelajaran: " + error.message;
            hideLoading();
        });
    } else {
        errorMessageDiv.textContent = "Nama Guru dan Mata Pelajaran tidak boleh kosong.";
    }
});

// --- Fungsi untuk Siswa ---
addStudentButton.addEventListener("click", () => {
    const studentName = studentNameInput.value.trim();
    const studentNisn = studentNisnInput.value.trim(); // Get NISN
    const studentClass = studentClassInput.value.trim();

    successMessageDiv.textContent = "";
    errorMessageDiv.textContent = "";

    if (studentName && studentClass) { // NISN is optional, so only name and class are required
        showLoading();
        const studentsRef = ref(database, 'students');

        if (editingStudentId) { // Mode Edit
            const studentToUpdateRef = ref(database, `students/${editingStudentId}`);
            update(studentToUpdateRef, {
                name: studentName,
                nisn: studentNisn, // Save NISN
                class: studentClass
            })
            .then(() => {
                successMessageDiv.textContent = "Data siswa berhasil diperbarui!";
                resetStudentForm();
                hideLoading();
            })
            .catch((error) => {
                console.error("Error updating student:", error);
                errorMessageDiv.textContent = "Gagal memperbarui siswa: " + error.message;
                hideLoading();
            });
        } else { // Mode Tambah Baru
            const newStudentRef = push(studentsRef);
            set(newStudentRef, {
                name: studentName,
                nisn: studentNisn, // Save NISN
                class: studentClass
            })
            .then(() => {
                successMessageDiv.textContent = "Siswa berhasil ditambahkan!";
                studentNameInput.value = "";
                studentNisnInput.value = ""; // Clear NISN
                studentClassInput.value = "";
                hideLoading();
            })
            .catch((error) => {
                console.error("Error adding student:", error);
                errorMessageDiv.textContent = "Gagal menambahkan siswa: " + error.message;
                hideLoading();
            });
        }
    } else {
        errorMessageDiv.textContent = "Nama siswa dan kelas tidak boleh kosong.";
    }
});

function loadStudents() {
    const studentsRef = ref(database, 'students');

    onValue(studentsRef, (snapshot) => {
        studentListBody.innerHTML = "";
        let i = 1;
        snapshot.forEach((childSnapshot) => {
            const studentId = childSnapshot.key;
            const studentData = childSnapshot.val();

            const row = studentListBody.insertRow();
            row.insertCell(0).textContent = i++;
            row.cells[0].setAttribute('data-label', 'No'); // Untuk responsif
            row.insertCell(1).textContent = studentData.name;
            row.cells[1].setAttribute('data-label', 'Nama Siswa');
            row.insertCell(2).textContent = studentData.nisn || '-'; // Display NISN, or '-' if not available
            row.cells[2].setAttribute('data-label', 'NISN');
            row.insertCell(3).textContent = studentData.class;
            row.cells[3].setAttribute('data-label', 'Kelas');

            const actionCell = row.insertCell(4); // Adjusted index for new NISN column
            actionCell.setAttribute('data-label', 'Aksi');
            actionCell.classList.add('action-buttons');

            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.classList.add('btn-secondary');
            editButton.addEventListener("click", () => editStudent(studentId, studentData));
            actionCell.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Hapus";
            deleteButton.classList.add('btn-danger');
            deleteButton.addEventListener("click", () => deleteStudent(studentId));
            actionCell.appendChild(deleteButton);
        });
    });
}

function editStudent(studentId, studentData) {
    studentNameInput.value = studentData.name;
    studentNisnInput.value = studentData.nisn || ''; // Populate NISN
    studentClassInput.value = studentData.class;
    addStudentButton.textContent = "Update Siswa";
    editingStudentId = studentId; // Set ID siswa yang sedang diedit
    successMessageDiv.textContent = ""; // Clear messages
    errorMessageDiv.textContent = "";
}

function deleteStudent(studentId) {
    if (confirm("Apakah Anda yakin ingin menghapus siswa ini? Menghapus siswa akan menghapus data absensi terkait.")) {
        showLoading();
        const studentRef = ref(database, `students/${studentId}`);
        // Untuk penghapusan absensi terkait, ini bisa jadi kompleks jika data sangat besar
        // Pertimbangkan Firebase Cloud Functions untuk menghapus data terkait secara otomatis
        // Untuk saat ini, hanya hapus data siswa.

        remove(studentRef)
            .then(() => {
                successMessageDiv.textContent = "Siswa berhasil dihapus!";
                errorMessageDiv.textContent = "";
                resetStudentForm(); // Reset form setelah hapus
                hideLoading();
            })
            .catch((error) => {
                console.error("Error deleting student:", error);
                errorMessageDiv.textContent = "Gagal menghapus siswa: " + error.message;
                hideLoading();
            });
    }
}

function resetStudentForm() {
    studentNameInput.value = "";
    studentNisnInput.value = ""; // Reset NISN
    studentClassInput.value = "";
    addStudentButton.textContent = "Simpan Siswa";
    editingStudentId = null; // Reset editing ID
}
