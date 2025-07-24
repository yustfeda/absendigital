// js/rekap.js
import { database, ref, onValue } from './firebase-config.js';
import { allStudents } from './manageData.js'; // Import allStudents from manageData.js

// Import jsPDF dan autoTable
import { jsPDF } from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
// This ensures the autoTable plugin is loaded and attached to jsPDF.
// Make sure this URL is correct and accessible.
// If you encounter 'doc.autoTable is not a function', check this import or load method.
import "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js";


export const setupRekapAbsenSelectors = (rekapYearSelectElement) => {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        rekapYearSelectElement.appendChild(option);
    }
    rekapYearSelectElement.value = currentYear;

    // Set default month to current month
    const rekapMonthSelect = document.getElementById('rekapMonth');
    if (rekapMonthSelect) {
        rekapMonthSelect.value = (new Date().getMonth() + 1).toString().padStart(2, '0');
    }
};

export const generateMonthlyAbsenPdf = async (selectedMonth, selectedYear) => {
    if (!selectedMonth || !selectedYear) {
        alert('Mohon pilih bulan dan tahun untuk rekap absensi.');
        return;
    }

    const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('id-ID', { month: 'long' });
    const title = `Rekap Absensi Siswa Bulan ${monthName} Tahun ${selectedYear}`;

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    doc.setFontSize(16);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

    const absensiRef = ref(database, 'absensi');
    const snapshot = await new Promise(resolve => onValue(absensiRef, resolve, { onlyOnce: true }));
    const allAbsensiData = snapshot.val() || {};

    const tableRows = [];
    const tableHeaders = ['Nama Siswa', 'NIS'];

    const uniqueAbsenDates = new Set();
    Object.values(allStudents).forEach(student => {
        if (allAbsensiData[student.nis]) {
            Object.keys(allAbsensiData[student.nis]).forEach(date => {
                if (date.startsWith(`${selectedYear}-${selectedMonth}`)) {
                    uniqueAbsenDates.add(date);
                }
            });
        }
    });

    const sortedDates = Array.from(uniqueAbsenDates).sort();

    sortedDates.forEach(date => {
        tableHeaders.push(new Date(date).getDate().toString());
    });

    Object.keys(allStudents).forEach(studentKey => {
        const student = allStudents[studentKey];
        const rowData = [student.name, student.nis];
        
        sortedDates.forEach(date => {
            const status = allAbsensiData[student.nis] && allAbsensiData[student.nis][date] 
                           ? allAbsensiData[student.nis][date].status.charAt(0)
                           : '';
            rowData.push(status);
        });
        tableRows.push(rowData);
    });

    if (tableRows.length === 0) {
        doc.setFontSize(12);
        doc.text('Tidak ada data absensi untuk bulan ini.', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
    } else {
        doc.autoTable({
            head: [tableHeaders],
            body: tableRows,
            startY: 25,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 1,
                overflow: 'linebreak',
                halign: 'center'
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'left' }
            },
            didDrawPage: function(data) {
                doc.setFontSize(10);
                const pageCount = doc.internal.getNumberOfPages();
                doc.text(`Halaman ${data.pageNumber} dari ${pageCount}`, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            }
        });
    }

    doc.save(`Rekap_Absensi_${monthName}_${selectedYear}.pdf`);
};