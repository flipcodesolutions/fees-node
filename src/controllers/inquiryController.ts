import { Request, Response } from 'express';
import { InquiryModel } from '../models/inquiryModel';

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
const validateInquiryPayload = (body: Record<string, unknown>): string | null => {
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
const normalizeId = (id: string | string[]) => (Array.isArray(id) ? id[0] : id);

/**
 * Handles fetching all inquiries.
 */
export const getAllInquiries = async (req: Request, res: Response) => {
    try {
        const inquiries = await InquiryModel.findAll();
        res.json(inquiries);
    } catch (error) {
        console.error('Fetch inquiries error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};

/**
 * Handles creating one or more inquiries.
 * Supports both single object payload and array payload for batch creations.
 */
export const createInquiry = async (req: Request, res: Response) => {
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
                const result = await InquiryModel.create(item);
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

        const result = await InquiryModel.create(payload);
        return res.status(201).json({
            id: result.lastID,
            message: 'Inquiry added',
        });

    } catch (error) {
        console.error('Create inquiry error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};

/**
 * Handles updating an existing inquiry by ID.
 */
export const updateInquiry = async (req: Request, res: Response) => {
    try {
        const validationError = validateInquiryPayload(req.body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const cleanId = normalizeId(req.params.id);
        await InquiryModel.update(cleanId, req.body);
        res.json({ message: 'Inquiry updated' });
    } catch (error) {
        console.error('Update inquiry error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};

/**
 * Handles deleting an inquiry by ID.
 */
export const deleteInquiry = async (req: Request, res: Response) => {
    try {
        const cleanId = normalizeId(req.params.id);
        await InquiryModel.delete(cleanId);
        res.json({ message: 'Inquiry deleted' });
    } catch (error) {
        console.error('Delete inquiry error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
