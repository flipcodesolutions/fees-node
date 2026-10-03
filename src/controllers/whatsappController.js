"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppController = void 0;
const whatsappService_1 = require("../services/whatsappService");
const feeModel_1 = require("../models/feeModel");
const admissionModel_1 = require("../models/admissionModel");
const pdfService_1 = require("../services/pdfService");
exports.WhatsAppController = {
    // Webhook Verification
    verifyWebhook(req, res) {
        console.log('Incoming Webhook Verification Request:', req.query);
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'fees_crm_verify_token';
        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('WEBHOOK_VERIFIED SUCCESS');
                res.status(200).send(challenge);
            }
            else {
                console.log('WEBHOOK_VERIFIED FAILED: Token Mismatch');
                res.sendStatus(403);
            }
        }
        else {
            console.log('WEBHOOK_VERIFIED FAILED: Missing Mode or Token');
            res.sendStatus(400);
        }
    },
    // Handling Webhook Events
    async handleWebhook(req, res) {
        const body = req.body;
        if (body.object) {
            if (body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from;
                const msgBody = message.text ? message.text.body : 'Media/Other message';
                console.log(`Incoming message from ${from}: ${msgBody}`);
            }
            res.sendStatus(200);
        }
        else {
            res.sendStatus(404);
        }
    },
    // Test sending a template message
    async testTemplate(req, res) {
        try {
            const { to, templateName } = req.body;
            if (!to || !templateName) {
                return res.status(400).json({ error: 'Recipient number (to) and templateName are required' });
            }
            const response = await whatsappService_1.WhatsAppService.sendTemplateMessage(to, templateName);
            res.json({ message: 'Template message sent successfully', response });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async sendReminder(req, res) {
        try {
            const { to, studentName, remainingAmount, courseName, templateName } = req.body;
            if (!to) {
                return res.status(400).json({ error: 'Recipient phone number (to) is required' });
            }
            console.log(`Sending WhatsApp fee reminder template to ${to} (${studentName || 'Student'})...`);
            // Dispatch template message (e.g. fees_reminder)
            const result = await whatsappService_1.WhatsAppService.sendTemplateMessage(to, templateName, // falls back to whatsapp_template_name / 'fees_reminder'
            'en', []);
            res.json({ message: 'Reminder sent successfully', result });
        }
        catch (error) {
            console.error('WhatsApp sendReminder error:', error.message || error);
            res.status(500).json({ error: error.message || 'Failed to send reminder via WhatsApp' });
        }
    },
    async sendSpecificReceipt(req, res) {
        try {
            const { paymentId } = req.body;
            if (!paymentId)
                return res.status(400).json({ error: 'Payment ID is required' });
            const payment = await feeModel_1.FeeModel.getPaymentById(Number(paymentId));
            if (!payment)
                return res.status(404).json({ error: 'Payment not found' });
            const student = await admissionModel_1.AdmissionModel.findById(payment.admission_id);
            const fees = await feeModel_1.FeeModel.findAll();
            const feeSummary = fees.find((f) => f.admission_id === payment.admission_id);
            if (student && student.mobile && feeSummary) {
                console.log(`Manually sending receipt for payment ${paymentId}...`);
                const pdfBuffer = await pdfService_1.PDFService.generateReceiptPDF(payment, feeSummary, student);
                const mediaId = await whatsappService_1.WhatsAppService.uploadMedia(pdfBuffer, `receipt_${paymentId}.pdf`, 'application/pdf');
                await whatsappService_1.WhatsAppService.sendDocument(student.mobile, mediaId, `Fee_Receipt_${paymentId}.pdf`);
                const textMsg = `Dear *${student.student_name}*,\n\n*Fee Receipt* 📄\n\nYour payment of *₹${payment.amount}* has been recorded. Your remaining balance is *₹${feeSummary.remaining_amount}*.\n\nThank you!`;
                await whatsappService_1.WhatsAppService.sendTextMessage(student.mobile, textMsg);
                res.json({ message: 'Receipt sent successfully via WhatsApp' });
            }
            else {
                res.status(400).json({ error: 'Student or mobile number not found' });
            }
        }
        catch (error) {
            console.error('Manual Receipt Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
};
