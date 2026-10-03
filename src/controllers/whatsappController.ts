import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsappService';
import { FeeModel } from '../models/feeModel';
import { AdmissionModel } from '../models/admissionModel';
import { PDFService } from '../services/pdfService';

export const WhatsAppController = {
    // Webhook Verification
    verifyWebhook(req: Request, res: Response) {
        console.log('Incoming Webhook Verification Request:', req.query);
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'fees_crm_verify_token';

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('WEBHOOK_VERIFIED SUCCESS');
                res.status(200).send(challenge);
            } else {
                console.log('WEBHOOK_VERIFIED FAILED: Token Mismatch');
                res.sendStatus(403);
            }
        } else {
            console.log('WEBHOOK_VERIFIED FAILED: Missing Mode or Token');
            res.sendStatus(400);
        }
    },

    // Handling Webhook Events
    async handleWebhook(req: Request, res: Response) {
        const body = req.body;

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from;
                const msgBody = message.text ? message.text.body : 'Media/Other message';

                console.log(`Incoming message from ${from}: ${msgBody}`);
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    },

    // Test sending a template message
    async testTemplate(req: Request, res: Response) {
        try {
            const { to, templateName } = req.body;
            if (!to || !templateName) {
                return res.status(400).json({ error: 'Recipient number (to) and templateName are required' });
            }

            const response = await WhatsAppService.sendTemplateMessage(to, templateName);
            res.json({ message: 'Template message sent successfully', response });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async sendReminder(req: Request, res: Response) {
        try {
            const { to, studentName, remainingAmount, courseName, templateName } = req.body;
            if (!to) {
                return res.status(400).json({ error: 'Recipient phone number (to) is required' });
            }

            console.log(`Sending WhatsApp fee reminder template to ${to} (${studentName || 'Student'})...`);

            // Dispatch template message (e.g. fees_reminder)
            const result = await WhatsAppService.sendTemplateMessage(
                to,
                templateName, // falls back to whatsapp_template_name / 'fees_reminder'
                'en',
                []
            );

            res.json({ message: 'Reminder sent successfully', result });
        } catch (error: any) {
            console.error('WhatsApp sendReminder error:', error.message || error);
            res.status(500).json({ error: error.message || 'Failed to send reminder via WhatsApp' });
        }
    },

    async sendSpecificReceipt(req: Request, res: Response) {
        try {
            const { paymentId } = req.body;
            if (!paymentId) return res.status(400).json({ error: 'Payment ID is required' });

            const payment = await FeeModel.getPaymentById(Number(paymentId));
            if (!payment) return res.status(404).json({ error: 'Payment not found' });

            const student = await AdmissionModel.findById(payment.admission_id);
            const fees = await FeeModel.findAll();
            const feeSummary = fees.find((f: any) => f.admission_id === payment.admission_id);

            if (student && student.mobile && feeSummary) {
                console.log(`Manually sending receipt for payment ${paymentId}...`);
                const pdfBuffer = await PDFService.generateReceiptPDF(payment, feeSummary, student);
                const mediaId = await WhatsAppService.uploadMedia(pdfBuffer, `receipt_${paymentId}.pdf`, 'application/pdf');
                await WhatsAppService.sendDocument(student.mobile, mediaId, `Fee_Receipt_${paymentId}.pdf`);

                const textMsg = `Dear *${student.student_name}*,\n\n*Fee Receipt* 📄\n\nYour payment of *₹${payment.amount}* has been recorded. Your remaining balance is *₹${feeSummary.remaining_amount}*.\n\nThank you!`;
                await WhatsAppService.sendTextMessage(student.mobile, textMsg);

                res.json({ message: 'Receipt sent successfully via WhatsApp' });
            } else {
                res.status(400).json({ error: 'Student or mobile number not found' });
            }
        } catch (error: any) {
            console.error('Manual Receipt Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
};
