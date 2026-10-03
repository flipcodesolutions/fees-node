"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function numberToWords(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (num === 0)
        return 'Zero';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n)
        return '';
    let str = '';
    str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
    str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
    str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
    str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
    str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Only' : 'Only';
    return str.trim();
}
exports.PDFService = {
    async generateReceiptPDF(payment, feeSummary, student) {
        return new Promise((resolve, reject) => {
            // Setup document as A4, we'll draw the receipt in the top half.
            const doc = new pdfkit_1.default({ margin: 30, size: 'A4' });
            const buffers = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            const receiptNo = `${payment.id?.toString().padStart(3, '0')}`;
            const dateObj = payment.created_at ? new Date(payment.created_at) : new Date();
            const date = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
            const studentName = student.student_name || '';
            const paidAmount = payment.amount || 0;
            const amountWords = numberToWords(paidAmount);
            const mode = payment.remark || 'Cash';
            let courseName = student.inquiry_for || '';
            try {
                if (student.payload_json) {
                    const payload = JSON.parse(student.payload_json);
                    if (payload.courses && Array.isArray(payload.courses) && payload.courses.length > 0) {
                        courseName = payload.courses.map((c) => c.courseName).filter(Boolean).join(', ');
                    }
                }
            }
            catch (e) { }
            const fullOrPart = (feeSummary.status === 'Complete') ? 'Full' : 'Part';
            // Coordinates for the receipt box
            const startX = 30;
            const startY = 30;
            const width = 535;
            const height = 280;
            // Outer Border
            doc.rect(startX, startY, width, height).strokeColor('#000000').lineWidth(1).stroke();
            // Header Separator Lines
            doc.moveTo(startX, startY + 60).lineTo(startX + width, startY + 60).stroke(); // Header bottom
            doc.moveTo(startX + 140, startY).lineTo(startX + 140, startY + 60).stroke(); // Logo separator
            doc.moveTo(startX + width - 130, startY).lineTo(startX + width - 130, startY + 60).stroke(); // No/Date separator
            doc.moveTo(startX + width - 130, startY + 30).lineTo(startX + width, startY + 30).stroke(); // No and Date middle separator
            // Logo Text / Image
            const logoPath = path_1.default.join(__dirname, '../../assets/logo.png');
            if (fs_1.default.existsSync(logoPath)) {
                doc.image(logoPath, startX + 10, startY + 5, { width: 120, height: 50, fit: [120, 50], align: 'center', valign: 'center' });
            }
            else {
                doc.fontSize(22).font('Helvetica-Bold').fillColor('#000').text('Shiv', startX + 15, startY + 15);
                doc.fontSize(10).font('Helvetica').text('Computers', startX + 45, startY + 35);
            }
            // Header Center
            doc.fontSize(24).font('Helvetica-Bold').text('Shiv Computers', startX + 140, startY + 10, { width: 265, align: 'center' });
            doc.fontSize(10).font('Helvetica').text('209, Ajay Arcade, Jawahar Road,\nSurendranagar, Mo. 94269 75796', startX + 140, startY + 35, { width: 265, align: 'center' });
            // Header Right
            doc.fontSize(10).text(`No. : ${receiptNo}`, startX + width - 120, startY + 10);
            doc.text(`Date : ${date}`, startX + width - 120, startY + 40);
            // Receipt Title
            doc.fontSize(14).font('Helvetica-Bold').text('RECEIPT', startX, startY + 65, { width: width, align: 'center' });
            // Add underline to RECEIPT
            doc.moveTo(startX + 235, startY + 80).lineTo(startX + 300, startY + 80).lineWidth(1).stroke();
            // Body Fields (Handwritten style emulation using lines)
            const lineYStart = startY + 105;
            const lineSpacing = 30;
            doc.fontSize(11).font('Helvetica');
            // Line 1: Received From
            doc.text('Received From', startX + 15, lineYStart);
            doc.moveTo(startX + 95, lineYStart + 12).lineTo(startX + width - 15, lineYStart + 12).lineWidth(1).stroke();
            doc.font('Helvetica-Oblique').fontSize(14).text(studentName, startX + 105, lineYStart - 3);
            // Line 2: by Cash / Chq. / Online
            const line2Y = lineYStart + lineSpacing;
            doc.font('Helvetica').fontSize(11).text('by Cash / Chq. / Online', startX + 15, line2Y);
            doc.moveTo(startX + 140, line2Y + 12).lineTo(startX + width - 15, line2Y + 12).stroke();
            doc.font('Helvetica-Oblique').fontSize(14).text(mode, startX + 150, line2Y - 3);
            // Line 3: Full / Part & Course Name
            const line3Y = line2Y + lineSpacing;
            doc.font('Helvetica').fontSize(11).text('Full / Part', startX + 15, line3Y);
            doc.moveTo(startX + 75, line3Y + 12).lineTo(startX + 140, line3Y + 12).stroke();
            doc.font('Helvetica-Oblique').fontSize(14).text(fullOrPart, startX + 85, line3Y - 3);
            doc.font('Helvetica').fontSize(11).text('Payment of Course Name :', startX + 150, line3Y);
            const courseNameWidth = width - 315;
            doc.font('Helvetica-Oblique').fontSize(14);
            const courseNameHeight = doc.heightOfString(courseName, { width: courseNameWidth });
            const numberOfLines = Math.max(1, Math.ceil(courseNameHeight / 14));
            doc.text(courseName, startX + 300, line3Y - 3, { width: courseNameWidth });
            for (let i = 0; i < numberOfLines; i++) {
                doc.moveTo(startX + 290, line3Y + 12 + (i * 16.5)).lineTo(startX + width - 15, line3Y + 12 + (i * 16.5)).stroke();
            }
            const extraHeight = Math.max(0, (numberOfLines - 1) * 16.5);
            // Line 4: Rs. in words
            const line4Y = line3Y + lineSpacing + extraHeight;
            doc.font('Helvetica').fontSize(11).text('Rs. in words :', startX + 15, line4Y);
            doc.moveTo(startX + 90, line4Y + 12).lineTo(startX + width - 15, line4Y + 12).stroke();
            doc.font('Helvetica-Oblique').fontSize(14).text(amountWords, startX + 100, line4Y - 3);
            // Bottom Section (push down if needed)
            const bottomY = Math.max(startY + 225, line4Y + 45);
            // Amount Box
            doc.roundedRect(startX + 15, bottomY, 150, 35, 15).stroke();
            // Indian Rupee Symbol styling
            doc.circle(startX + 35, bottomY + 17.5, 12).fillAndStroke('#334155', '#334155');
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14).text('₹', startX + 30, bottomY + 10);
            // Amount text inside box
            doc.fillColor('#000000').font('Helvetica-Bold').fontSize(18).text(`${paidAmount}/-`, startX + 55, bottomY + 10);
            // Additional amount display to the right of box
            doc.font('Helvetica-Oblique').fontSize(14).text(`${paidAmount}/-`, startX + 175, bottomY + 18);
            // Bottom small text
            doc.font('Helvetica').fontSize(8).text('Receipt Subject to realization of the cheque', startX + 15, bottomY + 45);
            // Signature area
            doc.fontSize(11).font('Helvetica-Bold').text('For, Shiv Computers', startX + 380, bottomY - 10);
            doc.rect(startX + 400, bottomY + 5, 80, 35).lineWidth(1).stroke();
            doc.text('Sign.', startX + 425, bottomY + 45);
            doc.end();
        });
    },
};
