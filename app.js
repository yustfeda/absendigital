// app.js
// Ensure all Firebase SDK imports are done in index.html
// Global Firebase variables (app, db, auth, userId, isAuthReady, etc.) are initialized in index.html

document.addEventListener('DOMContentLoaded', () => {
    const appContent = document.getElementById('app-content');
    const navHomeLink = document.getElementById('nav-home-link');
    const navAttendanceLink = document.getElementById('nav-attendance-link');
    const navManageDataLink = document.getElementById('nav-manage-data-link');
    const navRecapLink = document.getElementById('nav-recap-link');

    // Sidebar and Hamburger Menu elements
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const overlay = document.getElementById('overlay');

    // Sidebar Navigation Links (important for closing sidebar after click)
    const sidebarHomeLink = document.getElementById('sidebar-home-link');
    const sidebarAttendanceLink = document.getElementById('sidebar-attendance-link');
    const sidebarManageDataLink = document.getElementById('sidebar-manage-data-link');
    const sidebarRecapLink = document.getElementById('sidebar-recap-link');

    // Caches for frequently accessed data
    let studentsData = {};
    let teachersData = {};
    let attendanceData = {};

    // --- Navigation and Page Loading Functions ---
    async function loadPage(pageName) {
        window.showLoading(); // Show loading spinner
        closeSidebar(); // Close sidebar if open

        try {
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${response.statusText}`);
            }
            const html = await response.text();
            appContent.innerHTML = html; // Load HTML content into the main area

            // Call specific initialization function for each page after it's loaded
            if (pageName === 'home') {
                initHomePage();
            } else if (pageName === 'attendance') {
                await initAttendancePage();
            } else if (pageName === 'manage_data') {
                await initManageDataPage();
            } else if (pageName === 'recap') {
                await initRecapPage();
            }
        } catch (error) {
            console.error("Error loading page:", error);
            appContent.innerHTML = `<div class="card p-6 text-red-700 text-center">
                                        <h3 class="text-2xl font-bold mb-4">An Error Occurred!</h3>
                                        <p>Failed to load page: ${error.message}. Please try again later.</p>
                                    </div>`;
            window.showModal("An error occurred while loading the page. Please try again.", "alert");
        } finally {
            window.hideLoading(); // Hide loading spinner
        }
    }

    // Event listeners for desktop navigation
    navHomeLink.addEventListener('click', (e) => { e.preventDefault(); loadPage('home'); });
    navAttendanceLink.addEventListener('click', (e) => { e.preventDefault(); loadPage('attendance'); });
    navManageDataLink.addEventListener('click', (e) => { e.preventDefault(); loadPage('manage_data'); });
    navRecapLink.addEventListener('click', (e) => { e.preventDefault(); loadPage('recap'); });

    // Event listeners for sidebar navigation (also closes sidebar)
    sidebarHomeLink.addEventListener('click', (e) => { e.preventDefault(); loadPage('home'); });
    sidebarAttendanceLink.addEventListener('click', (e) => { e.preventDefault(); loadPage('attendance'); });
    sidebarManageDataLink.addEventListener('click', (e) => { e.preventDefault(); loadPage('manage_data'); });
    sidebarRecapLink.addEventListener('click', (e) => { e.preventDefault(); loadPage('recap'); });

    // --- Sidebar / Hamburger Menu Logic ---
    hamburgerBtn.addEventListener('click', openSidebar);
    closeSidebarBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar); // Close sidebar when clicking outside

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent body scroll when sidebar is open
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        document.body.style.overflow = ''; // Restore body scroll
    }

    // Helper function to wait for Firebase to be ready
    async function waitForFirebaseAuth() {
        if (!window.isFirebaseAuthReady()) {
            console.log("Firebase not ready. Waiting for authentication...");
            // Wait for the 'firebaseAuthReady' event dispatched from index.html
            await new Promise(resolve => window.addEventListener('firebaseAuthReady', resolve, { once: true }));
            console.log("Firebase is ready!");
        }
    }

    // --- Home Page Initialization ---
    function initHomePage() {
        console.log("Home page loaded.");
        // No specific JS logic needed for the static home page
        // The loadPage() function is exposed globally in index.html for the buttons on home.html
    }

    // --- Attendance Page Initialization ---
    async function initAttendancePage() {
        console.log("Attendance page loaded.");
        await waitForFirebaseAuth(); // Ensure Firebase is ready

        const attendanceDateInput = document.getElementById('attendance-date');
        const attendanceClassSelect = document.getElementById('attendance-class-select');
        const attendanceTableBody = document.getElementById('attendance-table-body');
        const saveAttendanceBtn = document.getElementById('save-attendance-btn');
        const noStudentsMessage = document.getElementById('no-students-message');
        const attendanceTable = document.getElementById('attendance-table');

        // Set today's date by default
        const today = new Date();
        attendanceDateInput.value = today.toISOString().split('T')[0];

        // Load class list and student data in real-time
        // This function also sets up the onValue listeners for studentsData and attendanceData
        await loadClassesAndStudentsForAttendance();

        // Event listener for class selection change
        attendanceClassSelect.addEventListener('change', () => {
            renderStudentsForAttendance(attendanceClassSelect.value, attendanceDateInput.value);
        });

        // Event listener for date change
        attendanceDateInput.addEventListener('change', () => {
            renderStudentsForAttendance(attendanceClassSelect.value, attendanceDateInput.value);
        });

        // Event listener to save attendance
        saveAttendanceBtn.addEventListener('click', async () => {
            await saveAttendance();
        });

        // Function to load classes and students from Firebase
        async function loadClassesAndStudentsForAttendance() {
            const db = window.firebaseDb;
            const userId = window.getFirebaseUserId();
            const studentsRef = window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/students`);
            const attendanceRootRef = window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/attendance`);

            // Listener for student data
            window.onDatabaseValue(studentsRef, (snapshot) => {
                studentsData = snapshot.val() || {};
                const classes = new Set();
                for (const studentId in studentsData) {
                    if (studentsData[studentId].class) {
                        classes.add(studentsData[studentId].class);
                    }
                }
                renderClassOptions(attendanceClassSelect, Array.from(classes).sort());
                // After classes are loaded, render students for the selected class (if any)
                renderStudentsForAttendance(attendanceClassSelect.value, attendanceDateInput.value);
            }, (error) => {
                console.error("Failed to load student data:", error);
                window.showModal("Failed to load student data. Please try again.", "alert");
            });

            // Listener for attendance data (to pre-fill status)
            window.onDatabaseValue(attendanceRootRef, (snapshot) => {
                attendanceData = snapshot.val() || {};
                renderStudentsForAttendance(attendanceClassSelect.value, attendanceDateInput.value); // Re-render to update status
            }, (error) => {
                console.error("Failed to load attendance data:", error);
            });
        }

        // Function to render class options in the dropdown
        function renderClassOptions(selectElement, classList) {
            const currentSelectedValue = selectElement.value; // Save the currently selected value
            selectElement.innerHTML = '<option value="">-- Pilih Kelas --</option>';
            classList.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls;
                option.textContent = cls;
                selectElement.appendChild(option);
            });
            // Restore the previously selected value if it still exists
            if (classList.includes(currentSelectedValue)) {
                selectElement.value = currentSelectedValue;
            } else {
                selectElement.value = ""; // Reset if class no longer exists
            }
        }

        // Function to render the list of students and their attendance status
        function renderStudentsForAttendance(selectedClass, selectedDate) {
            attendanceTableBody.innerHTML = '';
            const filteredStudents = Object.keys(studentsData).filter(
                (id) => studentsData[id].class === selectedClass
            ).map(id => ({ id, ...studentsData[id] }));

            if (filteredStudents.length === 0 || !selectedClass) {
                noStudentsMessage.classList.remove('hidden');
                attendanceTable.classList.add('hidden');
                saveAttendanceBtn.disabled = true;
            } else {
                noStudentsMessage.classList.add('hidden');
                attendanceTable.classList.remove('hidden');
                saveAttendanceBtn.disabled = false;

                filteredStudents.forEach(student => {
                    const row = document.createElement('tr');
                    // Get existing attendance status for this student on this date
                    const currentStatus = attendanceData[selectedClass]?.[selectedDate]?.[student.id]?.status || 'Hadir'; // Default to 'Hadir'

                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">${student.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                            <select data-student-id="${student.id}" class="attendance-status-select border rounded-lg p-2 w-full">
                                <option value="Hadir" ${currentStatus === 'Hadir' ? 'selected' : ''}>Hadir</option>
                                <option value="Alfa" ${currentStatus === 'Alfa' ? 'selected' : ''}>Alfa</option>
                                <option value="Izin" ${currentStatus === 'Izin' ? 'selected' : ''}>Izin</option>
                                <option value="Sakit" ${currentStatus === 'Sakit' ? 'selected' : ''}>Sakit</option>
                            </select>
                        </td>
                    `;
                    attendanceTableBody.appendChild(row);
                });
            }
        }

        // Function to save attendance to Firebase
        async function saveAttendance() {
            window.showLoading();
            try {
                const db = window.firebaseDb;
                const userId = window.getFirebaseUserId();
                const date = attendanceDateInput.value;
                const selectedClass = attendanceClassSelect.value;

                if (!date || !selectedClass) {
                    window.showModal("Pilih tanggal dan kelas terlebih dahulu.", "alert");
                    return;
                }

                const attendanceEntries = {};
                const statusSelects = document.querySelectorAll('.attendance-status-select');
                if (statusSelects.length === 0) {
                    window.showModal("Tidak ada siswa untuk disimpan absensinya.", "alert");
                    return;
                }

                statusSelects.forEach(select => {
                    const studentId = select.dataset.studentId;
                    const status = select.value;
                    attendanceEntries[studentId] = {
                        status: status,
                        timestamp: new Date().toISOString() // Simpan timestamp saat absen dilakukan
                    };
                });

                const attendanceRef = window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/attendance/${selectedClass}/${date}`);
                await window.setDatabase(attendanceRef, attendanceEntries);
                window.showModal("Absensi berhasil disimpan!", "alert");
                console.log("Absensi berhasil disimpan untuk tanggal", date, "kelas", selectedClass);
            } catch (error) {
                console.error("Gagal menyimpan absensi:", error);
                window.showModal("Gagal menyimpan absensi. Silakan coba lagi.", "alert");
            } finally {
                window.hideLoading();
            }
        }
    }

    // --- Manage Data Page Initialization ---
    async function initManageDataPage() {
        console.log("Manage Data page loaded.");
        await waitForFirebaseAuth(); // Ensure Firebase is ready

        const studentNameInput = document.getElementById('student-name');
        const studentClassSelect = document.getElementById('student-class');
        const addStudentBtn = document.getElementById('add-student-btn');
        const studentTableBody = document.getElementById('student-table-body');
        const saveAllStudentsBtn = document.getElementById('save-all-students-btn');
        const deleteAllStudentsBtn = document.getElementById('delete-all-students-btn');
        const noStudentsManageMessage = document.getElementById('no-students-manage-message');
        const studentTable = document.getElementById('student-table');

        const teacherNameInput = document.getElementById('teacher-name');
        const teacherSubjectInput = document.getElementById('teacher-subject');
        const addTeacherBtn = document.getElementById('add-teacher-btn');
        const teacherTableBody = document.getElementById('teacher-table-body');
        const saveAllTeachersBtn = document.getElementById('save-all-teachers-btn');
        const deleteAllTeachersBtn = document.getElementById('delete-all-teachers-btn');
        const noTeachersManageMessage = document.getElementById('no-teachers-manage-message');
        const teacherTable = document.getElementById('teacher-table');

        // Data will be loaded and updated in real-time by onValue listeners

        await loadStudentsAndTeachers(); // Load initial data and set up listeners

        addStudentBtn.addEventListener('click', addStudent);
        saveAllStudentsBtn.addEventListener('click', saveAllStudents);
        deleteAllStudentsBtn.addEventListener('click', confirmDeleteAllStudents);

        addTeacherBtn.addEventListener('click', addTeacher);
        saveAllTeachersBtn.addEventListener('click', saveAllTeachers);
        deleteAllTeachersBtn.addEventListener('click', confirmDeleteAllTeachers);

        // Function to load student and teacher data from Firebase in real-time
        async function loadStudentsAndTeachers() {
            const db = window.firebaseDb;
            const userId = window.getFirebaseUserId();

            const studentsRef = window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/students`);
            window.onDatabaseValue(studentsRef, (snapshot) => {
                studentsData = snapshot.val() || {}; // Update global cache
                renderStudentTable();
                updateStudentButtonsState();
            }, (error) => {
                console.error("Gagal memuat data siswa:", error);
                window.showModal("Gagal memuat data siswa. Silakan coba lagi.", "alert");
            });

            const teachersRef = window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/teachers`);
            window.onDatabaseValue(teachersRef, (snapshot) => {
                teachersData = snapshot.val() || {}; // Update global cache
                renderTeacherTable();
                updateTeacherButtonsState();
            }, (error) => {
                console.error("Gagal memuat data guru:", error);
                window.showModal("Gagal memuat data guru. Silakan coba lagi.", "alert");
            });
        }

        // Function to render the student table
        function renderStudentTable() {
            studentTableBody.innerHTML = '';
            const studentIds = Object.keys(studentsData);
            if (studentIds.length === 0) {
                noStudentsManageMessage.classList.remove('hidden');
                studentTable.classList.add('hidden');
            } else {
                noStudentsManageMessage.classList.add('hidden');
                studentTable.classList.remove('hidden');
                studentIds.forEach(id => {
                    const student = studentsData[id];
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">${student.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-base text-gray-700">${student.class}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-base font-medium">
                            <button data-id="${id}" class="delete-student-btn text-red-600 hover:text-red-800 transition-colors duration-200">Hapus</button>
                        </td>
                    `;
                    studentTableBody.appendChild(row);
                });
                document.querySelectorAll('.delete-student-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const studentIdToDelete = e.target.dataset.id;
                        confirmDeleteStudent(studentIdToDelete);
                    });
                });
            }
            updateStudentButtonsState();
        }

        // Function to render the teacher table
        function renderTeacherTable() {
            teacherTableBody.innerHTML = '';
            const teacherIds = Object.keys(teachersData);
            if (teacherIds.length === 0) {
                noTeachersManageMessage.classList.remove('hidden');
                teacherTable.classList.add('hidden');
            } else {
                noTeachersManageMessage.classList.add('hidden');
                teacherTable.classList.remove('hidden');
                teacherIds.forEach(id => {
                    const teacher = teachersData[id];
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">${teacher.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-base text-gray-700">${teacher.subject}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-base font-medium">
                            <button data-id="${id}" class="delete-teacher-btn text-red-600 hover:text-red-800 transition-colors duration-200">Hapus</button>
                        </td>
                    `;
                    teacherTableBody.appendChild(row);
                });
                document.querySelectorAll('.delete-teacher-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const teacherIdToDelete = e.target.dataset.id;
                        confirmDeleteTeacher(teacherIdToDelete);
                    });
                });
            }
            updateTeacherButtonsState();
        }

        // Function to update the state of student-related buttons
        function updateStudentButtonsState() {
            const hasStudents = Object.keys(studentsData).length > 0;
            saveAllStudentsBtn.disabled = !hasStudents;
            deleteAllStudentsBtn.disabled = !hasStudents;
        }

        // Function to update the state of teacher-related buttons
        function updateTeacherButtonsState() {
            const hasTeachers = Object.keys(teachersData).length > 0;
            saveAllTeachersBtn.disabled = !hasTeachers;
            deleteAllTeachersBtn.disabled = !hasTeachers;
        }

        // Function to add a student (locally, then synchronized when saved)
        function addStudent() {
            const name = studentNameInput.value.trim();
            const studentClass = studentClassSelect.value;

            if (!name || !studentClass) {
                window.showModal("Nama siswa dan kelas tidak boleh kosong.", "alert");
                return;
            }

            // Generate a new ID locally
            const newId = window.pushToDatabase(window.getDatabaseRef(window.firebaseDb, `artifacts/${window.getAppId()}/users/${window.getFirebaseUserId()}/students`)).key;
            studentsData[newId] = { name, class: studentClass }; // Add to global cache
            renderStudentTable(); // Update table display
            studentNameInput.value = '';
            studentClassSelect.value = '';
            window.showModal("Siswa ditambahkan secara lokal. Klik 'Simpan Semua Siswa' untuk menyimpan ke database.", "alert");
        }

        // Function to add a teacher (locally, then synchronized when saved)
        function addTeacher() {
            const name = teacherNameInput.value.trim();
            const subject = teacherSubjectInput.value.trim();

            if (!name || !subject) {
                window.showModal("Nama guru dan mata pelajaran tidak boleh kosong.", "alert");
                return;
            }

            // Generate a new ID locally
            const newId = window.pushToDatabase(window.getDatabaseRef(window.firebaseDb, `artifacts/${window.getAppId()}/users/${window.getFirebaseUserId()}/teachers`)).key;
            teachersData[newId] = { name, subject }; // Add to global cache
            renderTeacherTable(); // Update table display
            teacherNameInput.value = '';
            teacherSubjectInput.value = '';
            window.showModal("Guru ditambahkan secara lokal. Klik 'Simpan Semua Guru' untuk menyimpan ke database.", "alert");
        }

        // Confirm and delete individual student from Firebase
        function confirmDeleteStudent(studentId) {
            window.showModal("Apakah Anda yakin ingin menghapus siswa ini?", "confirm", async () => {
                window.showLoading();
                try {
                    const db = window.firebaseDb;
                    const userId = window.getFirebaseUserId();
                    await window.removeFromDatabase(window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/students/${studentId}`));
                    // The onValue listener will automatically update studentsData and call renderStudentTable
                    window.showModal("Siswa berhasil dihapus.", "alert");
                } catch (error) {
                    console.error("Gagal menghapus siswa:", error);
                    window.showModal("Gagal menghapus siswa. Silakan coba lagi.", "alert");
                } finally {
                    window.hideLoading();
                }
            });
        }

        // Confirm and delete individual teacher from Firebase
        function confirmDeleteTeacher(teacherId) {
            window.showModal("Apakah Anda yakin ingin menghapus guru ini?", "confirm", async () => {
                window.showLoading();
                try {
                    const db = window.firebaseDb;
                    const userId = window.getFirebaseUserId();
                    await window.removeFromDatabase(window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/teachers/${teacherId}`));
                    // The onValue listener will automatically update teachersData and call renderTeacherTable
                    window.showModal("Guru berhasil dihapus.", "alert");
                } catch (error) {
                    console.error("Gagal menghapus guru:", error);
                    window.showModal("Gagal menghapus guru. Silakan coba lagi.", "alert");
                } finally {
                    window.hideLoading();
                }
            });
        }

        // Save all student data from cache to Firebase
        async function saveAllStudents() {
            window.showLoading();
            try {
                const db = window.firebaseDb;
                const userId = window.getFirebaseUserId();
                await window.setDatabase(window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/students`), studentsData);
                window.showModal("Semua data siswa berhasil disimpan!", "alert");
            } catch (error) {
                console.error("Gagal menyimpan semua siswa:", error);
                window.showModal("Gagal menyimpan semua siswa. Silakan coba lagi.", "alert");
            } finally {
                window.hideLoading();
            }
        }

        // Confirm and delete all student data from Firebase
        function confirmDeleteAllStudents() {
            window.showModal("Apakah Anda yakin ingin menghapus SEMUA data siswa? Tindakan ini tidak dapat dibatalkan.", "confirm", async () => {
                window.showLoading();
                try {
                    const db = window.firebaseDb;
                    const userId = window.getFirebaseUserId();
                    await window.removeFromDatabase(window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/students`));
                    // The onValue listener will automatically clear studentsData and re-render the table
                    window.showModal("Semua data siswa berhasil dihapus.", "alert");
                } catch (error) {
                    console.error("Gagal menghapus semua siswa:", error);
                    window.showModal("Gagal menghapus semua siswa. Silakan coba lagi.", "alert");
                } finally {
                    window.hideLoading();
                }
            });
        }

        // Save all teacher data from cache to Firebase
        async function saveAllTeachers() {
            window.showLoading();
            try {
                const db = window.firebaseDb;
                const userId = window.getFirebaseUserId();
                await window.setDatabase(window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/teachers`), teachersData);
                window.showModal("Semua data guru berhasil disimpan!", "alert");
            } catch (error) {
                console.error("Gagal menyimpan semua guru:", error);
                window.showModal("Gagal menyimpan semua guru. Silakan coba lagi.", "alert");
            } finally {
                window.hideLoading();
            }
        }

        // Confirm and delete all teacher data from Firebase
        function confirmDeleteAllTeachers() {
            window.showModal("Apakah Anda yakin ingin menghapus SEMUA data guru? Tindakan ini tidak dapat dibatalkan.", "confirm", async () => {
                window.showLoading();
                try {
                    const db = window.firebaseDb;
                    const userId = window.getFirebaseUserId();
                    await window.removeFromDatabase(window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/teachers`));
                    // The onValue listener will automatically clear teachersData and re-render the table
                    window.showModal("Semua data guru berhasil dihapus.", "alert");
                } catch (error) {
                    console.error("Gagal menghapus semua guru:", error);
                    window.showModal("Gagal menghapus semua guru. Silakan coba lagi.", "alert");
                } finally {
                    window.hideLoading();
                }
            });
        }
    }

    // --- Recap Page Initialization ---
    async function initRecapPage() {
        console.log("Recap page loaded.");
        await waitForFirebaseAuth(); // Ensure Firebase is ready

        const recapClassSelect = document.getElementById('recap-class-select');
        const recapMonthSelect = document.getElementById('recap-month-select');
        const recapTeacherSelect = document.getElementById('recap-teacher-select');
        const recapTable = document.getElementById('recap-table');
        const recapTableHeader = document.getElementById('recap-table-header');
        const recapTableBody = document.getElementById('recap-table-body');
        const noRecapDataMessage = document.getElementById('no-recap-data-message');
        const downloadRecapBtn = document.getElementById('download-recap-btn');
        const recapSignatureArea = document.getElementById('recap-signature-area');
        const recapTeacherName = document.getElementById('recap-teacher-name');
        const recapTeacherSubject = document.getElementById('recap-teacher-subject');

        // Set today's month by default
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        recapMonthSelect.value = currentMonth;

        await loadRecapDataOptions(); // Load initial data and set up listeners

        // Event listeners for filter changes
        recapClassSelect.addEventListener('change', renderRecapTable);
        recapMonthSelect.addEventListener('change', renderRecapTable);
        recapTeacherSelect.addEventListener('change', updateTeacherSignature);
        downloadRecapBtn.addEventListener('click', downloadRecap);

        // Function to load dropdown options and attendance data in real-time
        async function loadRecapDataOptions() {
            const db = window.firebaseDb;
            const userId = window.getFirebaseUserId();

            // Listener for student data (for class list)
            const studentsRef = window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/students`);
            window.onDatabaseValue(studentsRef, (snapshot) => {
                studentsData = snapshot.val() || {};
                const classes = new Set();
                for (const studentId in studentsData) {
                    if (studentsData[studentId].class) {
                        classes.add(studentsData[studentId].class);
                    }
                }
                renderClassOptions(recapClassSelect, Array.from(classes).sort());
                renderRecapTable(); // Re-render table after student/class data is updated
            }, (error) => {
                console.error("Gagal memuat data siswa untuk rekap:", error);
                window.showModal("Gagal memuat data siswa untuk rekap. Silakan coba lagi.", "alert");
            });

            // Listener for teacher data (for teacher dropdown)
            const teachersRef = window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/teachers`);
            window.onDatabaseValue(teachersRef, (snapshot) => {
                teachersData = snapshot.val() || {};
                renderTeacherOptions(recapTeacherSelect, teachersData);
                updateTeacherSignature(); // Update teacher signature
            }, (error) => {
                console.error("Gagal memuat data guru untuk rekap:", error);
                window.showModal("Gagal memuat data guru untuk rekap. Silakan coba lagi.", "alert");
            });

            // Listener for attendance data
            const attendanceRootRef = window.getDatabaseRef(db, `artifacts/${window.getAppId()}/users/${userId}/attendance`);
            window.onDatabaseValue(attendanceRootRef, (snapshot) => {
                attendanceData = snapshot.val() || {};
                renderRecapTable(); // Re-render table after attendance data is updated
            }, (error) => {
                console.error("Gagal memuat data absensi untuk rekap:", error);
                window.showModal("Gagal memuat data absensi untuk rekap. Silakan coba lagi.", "alert");
            });
        }

        // Function to render teacher options in the dropdown
        function renderTeacherOptions(selectElement, teachers) {
            const currentSelectedValue = selectElement.value;
            selectElement.innerHTML = '<option value="">-- Pilih Guru --</option>';
            for (const id in teachers) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = teachers[id].name;
                selectElement.appendChild(option);
            }
            if (currentSelectedValue && teachers[currentSelectedValue]) {
                selectElement.value = currentSelectedValue;
            } else {
                selectElement.value = "";
            }
        }

        // Function to update the teacher's signature in the recap section
        function updateTeacherSignature() {
            const selectedTeacherId = recapTeacherSelect.value;
            if (selectedTeacherId && teachersData[selectedTeacherId]) {
                recapTeacherName.textContent = teachersData[selectedTeacherId].name;
                recapTeacherSubject.textContent = teachersData[selectedTeacherId].subject;
            } else {
                recapTeacherName.textContent = '(Nama Guru)';
                recapTeacherSubject.textContent = '(Mata Pelajaran)';
            }
            // Show/hide signature area based on whether data is displayed
            if (recapTable.classList.contains('hidden')) {
                recapSignatureArea.classList.add('hidden');
            } else {
                recapSignatureArea.classList.remove('hidden');
            }
        }

        // Main function to render the attendance recap table
        function renderRecapTable() {
            const selectedClass = recapClassSelect.value;
            const selectedMonth = recapMonthSelect.value; // Format YYYY-MM

            recapTableBody.innerHTML = '';
            recapTableHeader.innerHTML = `
                <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider rounded-tl-xl">Nama Siswa</th>
            `;
            noRecapDataMessage.classList.add('hidden');
            recapTable.classList.add('hidden');
            downloadRecapBtn.disabled = true;
            recapSignatureArea.classList.add('hidden');

            if (!selectedClass || !selectedMonth) {
                noRecapDataMessage.classList.remove('hidden');
                noRecapDataMessage.textContent = "Pilih kelas dan bulan untuk melihat rekap.";
                return;
            }

            const [year, month] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate(); // Mendapatkan jumlah hari dalam bulan
            const datesOfMonth = [];
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                datesOfMonth.push(dateStr);
                const dateObj = new Date(dateStr);
                const dayName = dateObj.toLocaleString('id-ID', { weekday: 'short' }); // Nama hari (Sen, Sel, Dll)
                recapTableHeader.innerHTML += `<th class="px-2 py-3 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">${dayName} ${i}</th>`;
            }
            recapTableHeader.innerHTML += `
                <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Hadir</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Alfa</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Izin</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider rounded-tr-xl">Sakit</th>
            `;

            const filteredStudents = Object.keys(studentsData).filter(
                (id) => studentsData[id].class === selectedClass
            ).map(id => ({ id, ...studentsData[id] }));

            if (filteredStudents.length === 0) {
                noRecapDataMessage.classList.remove('hidden');
                noRecapDataMessage.textContent = "Tidak ada siswa di kelas ini.";
                return;
            }

            let hasAnyAttendanceData = false;
            filteredStudents.forEach(student => {
                const row = document.createElement('tr');
                let rowContent = `<td class="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">${student.name}</td>`;
                let hadirCount = 0;
                let alfaCount = 0;
                let izinCount = 0;
                let sakitCount = 0;

                let studentHasAttendanceInMonth = false;

                datesOfMonth.forEach(date => {
                    const status = attendanceData[selectedClass]?.[date]?.[student.id]?.status || '-';
                    rowContent += `<td class="px-2 py-4 whitespace-nowrap text-center text-base text-gray-700">${status.charAt(0)}</td>`; // Hanya huruf pertama
                    if (status === 'Hadir') hadirCount++;
                    else if (status === 'Alfa') alfaCount++;
                    else if (status === 'Izin') izinCount++;
                    else if (status === 'Sakit') sakitCount++;

                    if (status !== '-') {
                        studentHasAttendanceInMonth = true;
                    }
                });

                rowContent += `
                    <td class="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-semibold">${hadirCount}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-semibold">${alfaCount}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-semibold">${izinCount}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-semibold">${sakitCount}</td>
                `;
                row.innerHTML = rowContent;
                recapTableBody.appendChild(row);

                if (studentHasAttendanceInMonth) {
                    hasAnyAttendanceData = true;
                }
            });

            if (hasAnyAttendanceData) {
                recapTable.classList.remove('hidden');
                downloadRecapBtn.disabled = false;
                recapSignatureArea.classList.remove('hidden');
            } else {
                noRecapDataMessage.classList.remove('hidden');
                noRecapDataMessage.textContent = "Tidak ada data absensi untuk kelas dan bulan ini.";
                recapTable.classList.add('hidden');
                downloadRecapBtn.disabled = true;
                recapSignatureArea.classList.add('hidden');
            }
            updateTeacherSignature(); // Pastikan tanda tangan diperbarui setelah render tabel
        }

        // Fungsi untuk mengunduh rekap sebagai file CSV
        function downloadRecap() {
            const selectedClass = recapClassSelect.value;
            const selectedMonth = recapMonthSelect.value;
            const selectedTeacherId = recapTeacherSelect.value;
            const teacherName = selectedTeacherId && teachersData[selectedTeacherId] ? teachersData[selectedTeacherId].name : '(Nama Guru)';
            const teacherSubject = selectedTeacherId && teachersData[selectedTeacherId] ? teachersData[selectedTeacherId].subject : '(Mata Pelajaran)';

            if (!selectedClass || !selectedMonth) {
                window.showModal("Pilih kelas dan bulan terlebih dahulu untuk mengunduh rekap.", "alert");
                return;
            }

            const [year, month] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const datesOfMonth = [];
            for (let i = 1; i <= daysInMonth; i++) {
                datesOfMonth.push(String(i).padStart(2, '0'));
            }

            let csvContent = "data:text/csv;charset=utf-8,";

            // Header information
            csvContent += `ABSENSI SISWA FILIAL SMPN 2 CILELES\n`;
            csvContent += `Kelas: ${selectedClass}\n`;
            csvContent += `Bulan: ${new Date(year, month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}\n`;
            csvContent += `Mata Pelajaran: "${teacherSubject}"\n\n`; // Kutip untuk mapel

            // Table header
            let tableHeader = "Nama Siswa";
            datesOfMonth.forEach(day => {
                const date = new Date(year, month - 1, day);
                const dayName = date.toLocaleString('id-ID', { weekday: 'short' });
                tableHeader += `,"${dayName} ${day}"`; // Tambahkan kutip untuk nama hari dengan spasi
            });
            tableHeader += ",Hadir,Alfa,Izin,Sakit\n";
            csvContent += tableHeader;

            // Student data
            const filteredStudents = Object.keys(studentsData).filter(
                (id) => studentsData[id].class === selectedClass
            ).map(id => ({ id, ...studentsData[id] }));

            filteredStudents.forEach(student => {
                let rowData = `"${student.name}"`;
                let hadirCount = 0;
                let alfaCount = 0;
                let izinCount = 0;
                let sakitCount = 0;

                datesOfMonth.forEach(day => {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${day}`;
                    const status = attendanceData[selectedClass]?.[dateStr]?.[student.id]?.status || '-';
                    rowData += `,${status.charAt(0)}`; // Hanya huruf pertama
                    if (status === 'Hadir') hadirCount++;
                    else if (status === 'Alfa') alfaCount++;
                    else if (status === 'Izin') izinCount++;
                    else if (status === 'Sakit') sakitCount++;
                });
                rowData += `,${hadirCount},${alfaCount},${izinCount},${sakitCount}\n`;
                csvContent += rowData;
            });

            // Signature space
            csvContent += "\n\n";
            csvContent += ",,,,Mengetahui,\n";
            csvContent += ",,,,Kepala Sekolah\n";
            csvContent += "\n\n\n"; // Space for signature line
            csvContent += ",,,,(_________________________)\n";
            csvContent += "\n\n";
            csvContent += ",,,,Guru Mata Pelajaran:\n";
            csvContent += `,,,,"${teacherName}"\n`; // Kutip jika nama guru ada spasi
            csvContent += `,,,,"${teacherSubject}"\n`; // Kutip jika mapel ada spasi
            csvContent += "\n\n\n"; // Space for signature line
            csvContent += ",,,,(_________________________)\n";


            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `ABSENSI_SISWA_FILIAL_SMPN2_CILELES_${selectedClass.replace(/\s/g, '_')}_${selectedMonth}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.showModal("Rekap absensi berhasil diunduh!", "alert");
        }
    }

    // --- Initial Application Setup ---
    // Load the home page when the application first loads
    // Ensure Firebase is ready before loading pages that require data
    window.addEventListener('firebaseAuthReady', () => {
        loadPage('home');
    }, { once: true });

    // If Firebase is already ready before the event listener is attached (e.g., on page refresh)
    if (window.isFirebaseAuthReady()) {
        loadPage('home');
    }
});
