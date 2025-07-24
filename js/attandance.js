// js/attandance.js
import { database } from './ap.js'; // Impor instance database dari ap.js
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { showLoading, hideLoading } from './dashboard.js'; // Impor fungsi loading

// --- DOM Elements for Attendance Management ---
const attendanceListTableBody = document.getElementById('attendance-list');
const filterDateInput = document.getElementById('filter-date');
const filterClassSelect = document.getElementById('filter-class');
const filterSubjectAttendanceInput = document.getElementById('filter-subject-attendance'); // New input for subject

// --- DEBUGGING: Periksa apakah elemen ditemukan ---
console.log('DEBUG: attandance.js - Checking DOM elements...');
console.log('  attendanceListTableBody:', attendanceListTableBody);
console.log('  filterDateInput:', filterDateInput);
console.log('  filterClassSelect:', filterClassSelect);
console.log('  filterSubjectAttendanceInput:', filterSubjectAttendanceInput);
console.log('--- End Debugging attandance.js: DOM Elements Check ---');

// Fungsi untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Set tanggal default pada filter saat halaman dimuat
if (filterDateInput) {
    filterDateInput.value = getTodayDate();
}

/**
 * Memuat dan menampilkan data absensi berdasarkan filter.
 * Asumsi struktur data absensi: /attendance/{dateKey}/{classKey}/{studentId}: { status: "Hadir", name: "Nama Siswa", class: "Kelas", subject: "Mata Pelajaran" }
 */
const loadAttendance = () => {
    if (!attendanceListTableBody) {
        console.warn('WARNING: Attendance list table body not found. Cannot load attendance.');
        return;
    }
    
    const selectedDate = filterDateInput ? filterDateInput.value : getTodayDate();
    const selectedClass = filterClassSelect ? filterClassSelect.value : '';
    const selectedSubject = filterSubjectAttendanceInput ? filterSubjectAttendanceInput.value.trim() : 'Bahasa Inggris'; // Default to Bahasa Inggris
    
    console.log(`DEBUG: Loading attendance for Date: ${selectedDate}, Class: ${selectedClass}, Subject: ${selectedSubject}...`);
    showLoading(); // Tampilkan loading
    
    // Dapatkan semua siswa terlebih dahulu untuk mengisi tabel
    const studentsRef = ref(database, 'students');
    onValue(studentsRef, async (studentSnapshot) => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulasi loading 2 detik
        
        const students = [];
        if (studentSnapshot.exists()) {
            studentSnapshot.forEach(childSnapshot => {
                const studentId = childSnapshot.key;
                const studentData = childSnapshot.val();
                students.push({ id: studentId, ...studentData });
            });
            console.log('DEBUG: Students data loaded for attendance matching:', students);
        } else {
            console.log('DEBUG: No students data found. Cannot display attendance.');
            attendanceListTableBody.innerHTML = '<tr><td colspan="5">Tidak ada data siswa. Silakan tambahkan siswa terlebih dahulu.</td></tr>';
            hideLoading(); // Sembunyikan loading
            return;
        }
        
        // Ambil data absensi untuk tanggal dan kelas yang dipilih
        // Path absensi: `attendance/{dateKey}/{classKey}`
        const attendanceClassRef = ref(database, `attendance/${selectedDate}/${selectedClass}`);
        onValue(attendanceClassRef, (attendanceSnapshot) => {
            attendanceListTableBody.innerHTML = ''; // Kosongkan tabel absensi
            let index = 1;
            
            // Filter siswa berdasarkan kelas yang dipilih (jika ada filter)
            const filteredStudents = students.filter(student =>
                selectedClass === '' || student.class === selectedClass
            );
            filteredStudents.sort((a, b) => a.name.localeCompare(b.name)); // Urutkan berdasarkan nama
            
            if (filteredStudents.length === 0) {
                attendanceListTableBody.innerHTML = '<tr><td colspan="5">Tidak ada siswa untuk filter yang dipilih.</td></tr>';
                console.log('DEBUG: No filtered students to display attendance for.');
                hideLoading(); // Sembunyikan loading
                return;
            }
            
            filteredStudents.forEach(student => {
                const studentId = student.id;
                // Ambil status absensi spesifik siswa ini untuk subject yang dipilih
                let status = 'Alpha'; // Default status
                const attendanceRecordsForStudent = attendanceSnapshot.child(studentId); // Ambil semua record absensi untuk siswa di tanggal & kelas ini
                
                let foundSpecificSubject = false;
                if (attendanceRecordsForStudent.exists()) {
                    attendanceRecordsForStudent.forEach(recordSnap => {
                        const record = recordSnap.val();
                        if (record.subject === selectedSubject) {
                            status = record.status;
                            foundSpecificSubject = true;
                            return true; // break loop
                        }
                    });
                }
                
                const row = attendanceListTableBody.insertRow();
                row.innerHTML = `
                    <td>${index++}</td>
                    <td>${student.name}</td>
                    <td>${student.class}</td>
                    <td>
                        <select class="attendance-status-select" data-student-id="${studentId}" data-student-class="${student.class}" data-student-subject="${selectedSubject}">
                            <option value="Hadir" ${status === 'Hadir' ? 'selected' : ''}>Hadir</option>
                            <option value="Izin" ${status === 'Izin' ? 'selected' : ''}>Izin</option>
                            <option value="Sakit" ${status === 'Sakit' ? 'selected' : ''}>Sakit</option>
                            <option value="Alpha" ${status === 'Alpha' ? 'selected' : ''}>Alpha</option>
                        </select>
                    </td>
                    <td><button class="btn-primary btn-save-attendance" data-student-id="${studentId}" data-student-class="${student.class}" data-student-subject="${selectedSubject}">Simpan</button></td>
                `;
            });
            attachAttendanceActionListeners(selectedDate); // Attach listeners setelah tabel diperbarui
            hideLoading(); // Sembunyikan loading
        }, (error) => {
            console.error('ERROR: Failed to load attendance data for selected date/class:', error);
            alert('Gagal memuat data absensi. Silakan coba lagi.');
            hideLoading(); // Sembunyikan loading jika ada error
        });
    }, (error) => {
        console.error('ERROR: Failed to load students for attendance:', error);
        alert('Gagal memuat data siswa untuk absensi.');
        hideLoading(); // Sembunyikan loading jika ada error
    });
};

// Fungsi untuk melampirkan event listener ke tombol Simpan Absensi
const attachAttendanceActionListeners = (selectedDate) => {
    document.querySelectorAll('#attendance-list .btn-save-attendance').forEach(button => {
        button.onclick = async (e) => {
            showLoading(); // Tampilkan loading
            const studentId = e.target.dataset.studentId;
            const studentClass = e.target.dataset.studentClass;
            const studentSubject = e.target.dataset.studentSubject; // Get subject from button
            const selectElement = e.target.closest('tr').querySelector('.attendance-status-select');
            const newStatus = selectElement ? selectElement.value : null;
            
            if (!studentId || !newStatus || !studentClass || !studentSubject) {
                console.error('ERROR: Missing student ID, class, subject, or new status for saving attendance.');
                alert('Gagal menyimpan absensi: Data tidak lengkap.');
                hideLoading(); // Sembunyikan loading
                return;
            }
            
            // Dapatkan nama siswa dari baris tabel (untuk disimpan bersama status)
            const studentName = e.target.closest('tr').children[1].textContent;
            
            // Path absensi: `attendance/{date}/{class}/{studentId}/{uniqueAttendanceKey}`
            // Karena kita menyimpan per subjek, kita perlu key unik per subjek per siswa per hari.
            // Atau, lebih baik: `attendance/{date}/{class}/{studentId}/{subjectKey}`
            // Untuk menyederhanakan, kita akan menimpa (update) record untuk subject tersebut jika sudah ada
            // atau membuatnya jika belum. Kita asumsikan hanya ada 1 record per subject per siswa per hari.
            const attendanceRecordRef = ref(database, `attendance/${selectedDate}/${studentClass}/${studentId}`);
            
            try {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simulasi loading 2 detik
                
                // Fetch current records for this student on this date and class
                const currentRecordsSnapshot = await new Promise(resolve => {
                    onValue(attendanceRecordRef, resolve, { onlyOnce: true });
                });
                
                let foundRecordKey = null;
                currentRecordsSnapshot.forEach(childSnap => {
                    if (childSnap.val().subject === studentSubject) {
                        foundRecordKey = childSnap.key;
                    }
                });
                
                if (foundRecordKey) {
                    // Update existing record for this subject
                    await update(ref(database, `${attendanceRecordRef.toString().split(database.app.options.databaseURL)[1]}/${foundRecordKey}`), {
                        status: newStatus,
                        timestamp: Date.now()
                    });
                } else {
                    // Push new record for this subject (if it's the first time for this subject)
                    // Note: This approach might create multiple entries if not handled carefully
                    // A better structure might be: `attendance/{date}/{class}/{studentId}/{subject}`
                    // For now, we'll just push directly under studentId, leading to unique key per subject per day.
                    // If you only expect one subject per day per student, then we update it directly at studentId level
                    // For this solution, the attendance is specific to one subject at a time.
                    // Let's modify the path structure in firebase for clarity and better filtering:
                    // `attendance/{date}/{class}/{studentId}/{subjectKey}`
                    // The path should be consistent with how rekap.js reads it.
                    // So, let's update this:
                    const specificSubjectAttendanceRef = ref(database, `attendance/${selectedDate}/${studentClass}/${studentId}/${studentSubject.replace(/\./g, '_')}`); // Use cleaned subject as key
                    
                    await update(specificSubjectAttendanceRef, {
                        status: newStatus,
                        name: studentName,
                        class: studentClass,
                        subject: studentSubject,
                        timestamp: Date.now()
                    });
                }
                
                console.log(`DEBUG: Attendance for student ID ${studentId} in class ${studentClass} for subject ${studentSubject} updated to ${newStatus}.`);
                alert('Status absensi berhasil diperbarui!');
            } catch (error) {
                console.error('ERROR: Failed to update attendance status:', error);
                alert('Gagal memperbarui status absensi. Silakan coba lagi.');
            } finally {
                hideLoading(); // Sembunyikan loading
            }
        };
    });
};

// Event listeners untuk filter (akan memicu loadAttendance saat berubah)
if (filterDateInput) {
    filterDateInput.addEventListener('change', loadAttendance);
    console.log('DEBUG: Filter date input listener attached.');
}
if (filterClassSelect) {
    filterClassSelect.addEventListener('change', loadAttendance);
    console.log('DEBUG: Filter class select listener attached.');
}
if (filterSubjectAttendanceInput) {
    filterSubjectAttendanceInput.addEventListener('change', loadAttendance);
    console.log('DEBUG: Filter subject attendance input listener attached.');
}

// Panggil fungsi loadAttendance saat halaman 'attendance' diaktifkan
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        const attendancePageSection = document.getElementById('attendance');
        if (attendancePageSection) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class' && mutation.target.classList.contains('active')) {
                        console.log('DEBUG: "attendance" page became active. Loading attendance.');
                        loadAttendance();
                    }
                });
            });
            observer.observe(attendancePageSection, { attributes: true, attributeFilter: ['class'] });
            
            // Panggil juga jika halaman absensi sudah aktif saat dimuat (misal dari URL #attendance)
            if (attendancePageSection.classList.contains('active')) {
                console.log('DEBUG: "attendance" page already active on load. Loading attendance.');
                loadAttendance();
            }
        } else {
            console.warn('WARNING: "attendance" page section not found in dashboard.html. Attendance management functionality might not load.');
        }
    }
});