"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdmission = exports.updateAdmission = exports.createAdmission = exports.getAllAdmissions = void 0;
const admissionModel_1 = require("../models/admissionModel");
const feeModel_1 = require("../models/feeModel");
/**
 * Helper to normalize string parameter IDs.
 */
const normalizeId = (id) => (Array.isArray(id) ? id[0] : id);
/**
 * Validates request payload for admission creation/updates.
 */
const validateAdmissionPayload = (body) => {
    if (!body.student_name || !body.mobile) {
        return 'student_name and mobile are required';
    }
    if (!body.payload_json) {
        return 'payload_json is required';
    }
    return null;
};
/**
 * Calculates the total fees for an admission by parsing its payload_json field.
 * Extracts the `finalFees` from courses array inside JSON structure.
 * @param payloadJson JSON string containing courses information.
 */
function calculateTotalFees(payloadJson) {
    try {
        const payload = JSON.parse(payloadJson);
        if (payload.courses && Array.isArray(payload.courses)) {
            return payload.courses.reduce((sum, c) => {
                // Remove non-numeric characters before parsing as a float
                const fees = parseFloat(String(c.finalFees || '0').replace(/[^0-9.]/g, ''));
                return sum + (isNaN(fees) ? 0 : fees);
            }, 0);
        }
    }
    catch (e) {
        console.error('Failed to parse payload_json to compute fees:', e);
    }
    return 0;
}
/**
 * Handles fetching all admission records.
 */
const getAllAdmissions = async (req, res) => {
    try {
        const admissions = await admissionModel_1.AdmissionModel.findAll();
        res.json(admissions);
    }
    catch (error) {
        console.error('Get all admissions error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.getAllAdmissions = getAllAdmissions;
/**
 * Handles creating a new admission.
 * Calculates total fees based on course selection and initializes/upserts fee summary record.
 */
const createAdmission = async (req, res) => {
    try {
        const validationError = validateAdmissionPayload(req.body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
        const result = await admissionModel_1.AdmissionModel.create(req.body);
        const totalFees = calculateTotalFees(req.body.payload_json);
        // Upsert fees summary tracking for this admission
        if (result.lastID !== undefined) {
            await feeModel_1.FeeModel.upsertFeeSummary(Number(result.lastID), totalFees);
        }
        res.status(201).json({ id: result.lastID, message: 'Admission added' });
    }
    catch (error) {
        console.error('Create admission error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.createAdmission = createAdmission;
/**
 * Handles updating an existing admission.
 * Recalculates total fees and updates the corresponding fee summary records.
 */
const updateAdmission = async (req, res) => {
    try {
        const validationError = validateAdmissionPayload(req.body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
        const cleanId = normalizeId(req.params.id);
        await admissionModel_1.AdmissionModel.update(cleanId, req.body);
        // Re-calculate and update total fees in the summary tracking
        const totalFees = calculateTotalFees(req.body.payload_json);
        await feeModel_1.FeeModel.upsertFeeSummary(Number(cleanId), totalFees);
        res.json({ message: 'Admission updated' });
    }
    catch (error) {
        console.error('Update admission error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.updateAdmission = updateAdmission;
/**
 * Handles deleting an admission and clearing its associated fee summaries and payments.
 */
const deleteAdmission = async (req, res) => {
    try {
        const cleanId = normalizeId(req.params.id);
        await admissionModel_1.AdmissionModel.delete(cleanId);
        // Clear out fee summary and payment history records associated with this admission
        await feeModel_1.FeeModel.deleteByAdmissionId(Number(cleanId));
        res.json({ message: 'Admission deleted' });
    }
    catch (error) {
        console.error('Delete admission error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.deleteAdmission = deleteAdmission;
