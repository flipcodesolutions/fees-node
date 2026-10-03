import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { SettingsModel } from '../models/settingsModel';

/**
 * Helper function to dynamically retrieve WhatsApp configurations from settings table,
 * falling back to .env variables if no custom database entry exists.
 */
export async function getWhatsAppConfig() {
    try {
        const settings = await SettingsModel.getAll();
        return {
            token: settings.whatsapp_token || process.env.WHATSAPP_TOKEN,
            phoneNumberId: settings.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID,
            apiUrl: settings.whatsapp_api_url || process.env.WHATSAPP_API_URL || 'https://partnersv1.pinbot.ai/v3',
            templateName: settings.whatsapp_template_name || process.env.WHATSAPP_TEMPLATE_NAME || 'fees_reminder',
            businessAccountId: settings.whatsapp_business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
        };
    } catch (err) {
        console.error('Failed to retrieve WhatsApp configurations from database:', err);
        return {
            token: process.env.WHATSAPP_TOKEN,
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
            apiUrl: process.env.WHATSAPP_API_URL || 'https://partnersv1.pinbot.ai/v3',
            templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'fees_reminder',
            businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
        };
    }
}

/**
 * Common request headers generator for Pinbot & Meta API endpoints.
 */
function getRequestHeaders(token: string, additionalHeaders: Record<string, string> = {}) {
    return {
        'Content-Type': 'application/json',
        'apikey': token,
        'Authorization': `Bearer ${token}`,
        ...additionalHeaders
    };
}

/**
 * WhatsAppService manages communications with WhatsApp Business / Pinbot Partner Cloud API.
 */
export const WhatsAppService = {
    /**
     * Upload receipt PDF buffer to WhatsApp media endpoint.
     */
    async uploadMedia(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
        const { token, phoneNumberId, apiUrl } = await getWhatsAppConfig();
        if (!token || !phoneNumberId) {
            throw new Error('WhatsApp credentials (API Key / Token and Phone Number ID) are not configured');
        }

        const tempPath = path.join(__dirname, `../../temp_${Date.now()}_${filename}`);
        try {
            // Write buffer to a temporary file because FormData expects a stream or file reference
            fs.writeFileSync(tempPath, buffer);

            const formData = new FormData();
            formData.append('file', fs.createReadStream(tempPath));
            formData.append('type', mimeType);
            formData.append('messaging_product', 'whatsapp');

            const baseUrl = (apiUrl || 'https://partnersv1.pinbot.ai/v3').replace(/\/+$/, '');
            const url = `${baseUrl}/${phoneNumberId}/media`;

            const response = await axios.post(
                url,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'apikey': token,
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            // Clean up temporary file
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }

            return response.data.id;
        } catch (error: any) {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            console.error('WhatsApp Media Upload Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'Failed to upload media to WhatsApp');
        }
    },

    /**
     * Send an uploaded document (PDF) to a user.
     */
    async sendDocument(to: string, mediaId: string, filename: string): Promise<any> {
        const { token, phoneNumberId, apiUrl } = await getWhatsAppConfig();
        if (!token || !phoneNumberId) {
            throw new Error('WhatsApp credentials (API Key / Token and Phone Number ID) are not configured');
        }

        try {
            let cleanNumber = to.replace(/\D/g, '');
            if (cleanNumber.length === 10) {
                cleanNumber = '91' + cleanNumber;
            }

            const baseUrl = (apiUrl || 'https://partnersv1.pinbot.ai/v3').replace(/\/+$/, '');
            const url = `${baseUrl}/${phoneNumberId}/messages`;

            const response = await axios.post(
                url,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanNumber,
                    type: 'document',
                    document: {
                        id: mediaId,
                        filename: filename
                    }
                },
                {
                    headers: getRequestHeaders(token)
                }
            );

            return response.data;
        } catch (error: any) {
            console.error('WhatsApp Send Document Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'Failed to send document via WhatsApp');
        }
    },

    /**
     * Send a raw custom text message.
     */
    async sendTextMessage(to: string, message: string): Promise<any> {
        const { token, phoneNumberId, apiUrl } = await getWhatsAppConfig();
        if (!token || !phoneNumberId) {
            throw new Error('WhatsApp credentials (API Key / Token and Phone Number ID) are not configured');
        }

        try {
            let cleanNumber = to.replace(/\D/g, '');
            if (cleanNumber.length === 10) {
                cleanNumber = '91' + cleanNumber;
            }

            const baseUrl = (apiUrl || 'https://partnersv1.pinbot.ai/v3').replace(/\/+$/, '');
            const url = `${baseUrl}/${phoneNumberId}/messages`;

            const response = await axios.post(
                url,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanNumber,
                    type: 'text',
                    text: {
                        body: message
                    }
                },
                {
                    headers: getRequestHeaders(token)
                }
            );

            return response.data;
        } catch (error: any) {
            console.error('WhatsApp Send Text Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'Failed to send text message via WhatsApp');
        }
    },

    /**
     * Send a pre-configured message template (e.g. fees_reminder).
     */
    async sendTemplateMessage(
        to: string,
        templateName?: string,
        languageCode: string = 'en',
        components: any[] = []
    ): Promise<any> {
        const { token, phoneNumberId, apiUrl, templateName: defaultTemplate } = await getWhatsAppConfig();
        if (!token || !phoneNumberId) {
            throw new Error('WhatsApp credentials (API Key / Token and Phone Number ID) are not configured');
        }

        try {
            const chosenTemplate = templateName || defaultTemplate || 'fees_reminder';
            let cleanNumber = to.replace(/\D/g, '');
            if (cleanNumber.length === 10) {
                cleanNumber = '91' + cleanNumber;
            }

            const baseUrl = (apiUrl || 'https://partnersv1.pinbot.ai/v3').replace(/\/+$/, '');
            const url = `${baseUrl}/${phoneNumberId}/messages`;

            const payload: any = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanNumber,
                type: 'template',
                template: {
                    name: chosenTemplate,
                    language: {
                        code: languageCode || 'en'
                    }
                }
            };

            if (components && Array.isArray(components) && components.length > 0) {
                payload.template.components = components;
            }

            const response = await axios.post(
                url,
                payload,
                {
                    headers: getRequestHeaders(token)
                }
            );

            return response.data;
        } catch (error: any) {
            console.error('WhatsApp Send Template Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || error.message || 'Failed to send template message via WhatsApp');
        }
    }
};
