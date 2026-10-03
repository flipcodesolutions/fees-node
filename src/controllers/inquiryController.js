"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteInquiry = exports.updateInquiry = exports.createInquiry = exports.getAllInquiries = void 0;
const inquiryModel_1 = require("../models/inquiryModel");
// Predefined set of allowed statuses for inquiry validation
const allowedStatuses = new Set([
    'Pending',
    'Completed',
    'Deleted',
    'Not Interested',
]);
/**
 * Helper to validate incoming inquiry payload fields.
 * Returns error string if invalid, or null if validation passes.
 */
const validateInquiryPayload = (body) => {
    if (!body.name || !body.mobile) {
        return 'Name and mobile are required';
    }
    if (body.status && !allowedStatuses.has(String(body.status))) {
        return 'Invalid status value';
    }
    return null;
};
/**
 * Normalizes parameter id string in case array of ids is parsed.
 */
const normalizeId = (id) => (Array.isArray(id) ? id[0] : id);
/**
 * Handles fetching all inquiries.
 */
const getAllInquiries = async (req, res) => {
    try {
        const inquiries = await inquiryModel_1.InquiryModel.findAll();
        res.json(inquiries);
    }
    catch (error) {
        console.error('Fetch inquiries error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.getAllInquiries = getAllInquiries;
/**
 * Handles creating one or more inquiries.
 * Supports both single object payload and array payload for batch creations.
 */
const createInquiry = async (req, res) => {
    try {
        const payload = req.body;
        // Bulk insert flow
        if (Array.isArray(payload)) {
            for (const item of payload) {
                const validationError = validateInquiryPayload(item);
                if (validationError) {
                    return res.status(400).json({ error: validationError });
                }
            }
            const results = [];
            for (const item of payload) {
                const result = await inquiryModel_1.InquiryModel.create(item);
                results.push(result);
            }
            return res.status(201).json({
                message: 'Inquiries added successfully',
                data: results,
            });
        }
        // Single insert flow
        const validationError = validateInquiryPayload(payload);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
        const result = await inquiryModel_1.InquiryModel.create(payload);
        return res.status(201).json({
            id: result.lastID,
            message: 'Inquiry added',
        });
    }
    catch (error) {
        console.error('Create inquiry error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.createInquiry = createInquiry;
/**
 * Handles updating an existing inquiry by ID.
 */
const updateInquiry = async (req, res) => {
    try {
        const validationError = validateInquiryPayload(req.body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
        const cleanId = normalizeId(req.params.id);
        await inquiryModel_1.InquiryModel.update(cleanId, req.body);
        res.json({ message: 'Inquiry updated' });
    }
    catch (error) {
        console.error('Update inquiry error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.updateInquiry = updateInquiry;
/**
 * Handles deleting an inquiry by ID.
 */
const deleteInquiry = async (req, res) => {
    try {
        const cleanId = normalizeId(req.params.id);
        await inquiryModel_1.InquiryModel.delete(cleanId);
        res.json({ message: 'Inquiry deleted' });
    }
    catch (error) {
        console.error('Delete inquiry error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.deleteInquiry = deleteInquiry;
