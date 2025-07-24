// js/manageData.js
import { database } from './ap.js'; // Impor instance database dari ap.js
import { ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// --- Realtime Database Elements for Student Management ---
const addStudentForm = document.getElementById('add-student-form');
const studentNameInput = document.getElementById('student-name');
const studentNisnInput = document.getElementById('student-nisn');
const studentClassSelect = document.getElementById('student-class');
const studentListTableBody = document.getElementById('student-list');

// --- DEBUGGING: Periksa apakah elemen ditemukan ---
console.log('DEBUG: manageData.js - Checking DOM elements...');
console.log('  addStudentForm:', addStudentForm);
console.log('  studentListTableBody:', studentListTableBody);
console.log('--- End Debugging manageData.js: DOM Elements Check ---');

// Fungsi untuk menambahkan siswa baru
if (addStudentForm) {
    addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('DEBUG: Add student form submitted.');

        const name = studentNameInput.value.trim();
        const nisn = studentNisnInput.value.trim();
        const studentClass = studentClassSelect.value;

        if (!name || !nisn || !studentClass) {
            alert('Semua kolom harus diisi!');
            console.warn('WARNING: Add student form validation failed (empty fields).');
            return;
        }

        const editingId = addStudentForm.dataset.editingId; // Cek apakah dalam mode edit

        try {
            if (editingId) { // Jika dalam mode edit
                console.log(`DEBUG: Updating student with ID: ${editingId}`);
                const studentRefToUpdate = ref(database, `students/${editingId}`);
                await update(studentRefToUpdate, {
                    name: name,
                    nisn: nisn,
                    class: studentClass,
                    updatedAt: Date.now()
                });
                console.log(`DEBUG: Student ID ${editingId} successfully updated.`);
                alert('Data siswa berhasil diperbarui!');
                addStudentForm.querySelector('button[type="submit"]').textContent = 'Tambah Siswa'; // Kembalikan teks tombol
                delete addStudentForm.dataset.editingId; // Hapus ID editing
            } else { // Jika dalam mode tambah baru
                // Referensi ke node 'students' di Realtime Database
                const studentsRef = ref(database, 'students');
                // Menambahkan data siswa baru dengan ID unik otomatis
                await push(studentsRef, {
                    name: name,
                    nisn: nisn,
                    class: studentClass,
                    createdAt: Date.now()
                });
                console.log('DEBUG: Student added successfully to Realtime Database.');
                alert('Siswa berhasil ditambahkan!');
            }
            // Kosongkan form setelah berhasil (baik tambah atau edit)
            addStudentForm.reset();
        } catch (error) {
            console.error('ERROR: Failed to save student to Realtime Database:', error);
            alert('Gagal menyimpan siswa. Silakan coba lagi.');
        }
    });
} else {
    console.warn('WARNING: Add student form not found. Student addition functionality not active.');
}

// Fungsi untuk membaca dan menampilkan daftar siswa
const loadStudents = () => {
    if (!studentListTableBody) {
        console.warn('WARNING: Student list table body not found. Cannot load students.');
        return;
    }
    console.log('DEBUG: Loading students from Realtime Database...');
    const studentsRef = ref(database, 'students');

    // onValue akan mendengarkan perubahan data secara real-time
    onValue(studentsRef, (snapshot) => {
        studentListTableBody.innerHTML = ''; // Kosongkan tabel sebelum mengisi ulang
        let index = 1;
        if (snapshot.exists()) {
            console.log('DEBUG: Students data received from Realtime Database.');
            snapshot.forEach((childSnapshot) => {
                const studentId = childSnapshot.key; // ID unik siswa
                const student = childSnapshot.val(); // Data siswa
                
                const row = studentListTableBody.insertRow();
                row.innerHTML = `
                    <td>${index++}</td>
                    <td>${student.name}</td>
                    <td>${student.nisn}</td>
                    <td>${student.class}</td>
                    <td>
                        <button class="btn-edit" data-id="${studentId}">Edit</button>
                        <button class="btn-danger" data-id="${studentId}">Hapus</button>
                    </td>
                `;
            });
            attachStudentActionListeners(); // Attach listeners setelah tabel diperbarui
        } else {
            console.log('DEBUG: No students data found in Realtime Database.');
            studentListTableBody.innerHTML = '<tr><td colspan="5">Tidak ada data siswa.</td></tr>';
        }
    }, (error) => {
        console.error('ERROR: Failed to load students from Realtime Database:', error);
        alert('Gagal memuat data siswa. Silakan coba lagi.');
    });
};

// Fungsi untuk melampirkan event listener ke tombol Edit/Delete
const attachStudentActionListeners = () => {
    document.querySelectorAll('#student-list .btn-edit').forEach(button => {
        button.onclick = (e) => {
            const studentId = e.target.dataset.id;
            console.log(`DEBUG: Edit button clicked for student ID: ${studentId}`);
            
            // Ambil data dari baris tabel
            const row = e.target.closest('tr');
            studentNameInput.value = row.children[1].textContent;
            studentNisnInput.value = row.children[2].textContent;
            studentClassSelect.value = row.children[3].textContent;

            // Ubah tombol "Tambah Siswa" menjadi "Simpan Perubahan"
            addStudentForm.querySelector('button[type="submit"]').textContent = 'Simpan Perubahan';
            addStudentForm.dataset.editingId = studentId; // Simpan ID yang sedang diedit
            alert('Data siswa dimuat untuk diedit. Ubah lalu klik "Simpan Perubahan".');
            console.log(`DEBUG: Data for student ID ${studentId} loaded into form for editing.`);
        };
    });

    document.querySelectorAll('#student-list .btn-danger').forEach(button => {
        button.onclick = async (e) => {
            const studentId = e.target.dataset.id;
            console.log(`DEBUG: Delete button clicked for student ID: ${studentId}`);
            if (confirm(`Apakah Anda yakin ingin menghapus siswa ini (ID: ${studentId})?`)) {
                try {
                    const studentRef = ref(database, `students/${studentId}`);
                    await remove(studentRef); // Hapus data siswa dari database
                    console.log(`DEBUG: Student with ID ${studentId} successfully deleted.`);
                    alert('Siswa berhasil dihapus!');
                    // Jika sedang dalam mode edit siswa yang dihapus, reset form
                    if (addStudentForm.dataset.editingId === studentId) {
                        addStudentForm.reset();
                        addStudentForm.querySelector('button[type="submit"]').textContent = 'Tambah Siswa';
                        delete addStudentForm.dataset.editingId;
                    }
                } catch (error) {
                    console.error('ERROR: Failed to delete student:', error);
                    alert('Gagal menghapus siswa. Silakan coba lagi.');
                }
            }
        };
    });
};

// Panggil fungsi loadStudents saat halaman 'students' diaktifkan
document.addEventListener('DOMContentLoaded', () => {
    // Memastikan manageData.js hanya relevan di dashboard.html
    if (window.location.pathname.includes('dashboard.html')) {
        const studentPageSection = document.getElementById('students');
        if (studentPageSection) {
            // Gunakan MutationObserver untuk mendeteksi ketika kelas 'active' berubah
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class' && mutation.target.classList.contains('active')) {
                        console.log('DEBUG: "students" page became active. Loading students.');
                        loadStudents(); // Panggil fungsi loadStudents
                    }
                });
            });
            observer.observe(studentPageSection, { attributes: true, attributeFilter: ['class'] });

            // Panggil juga jika halaman siswa sudah aktif saat dimuat (misal dari URL #students)
            if (studentPageSection.classList.contains('active')) {
                console.log('DEBUG: "students" page already active on load. Loading students.');
                loadStudents();
            }
        } else {
            console.warn('WARNING: "students" page section not found in dashboard.html. Student management functionality might not load.');
        }
    }
});