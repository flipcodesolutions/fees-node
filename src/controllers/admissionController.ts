import { Request, Response } from 'express';
import { AdmissionModel } from '../models/admissionModel';
import { FeeModel } from '../models/feeModel';

/**
 * Helper to normalize string parameter IDs.
 */
const normalizeId = (id: string | string[]) => (Array.isArray(id) ? id[0] : id);

/**
 * Validates request payload for admission creation/updates.
 */
const validateAdmissionPayload = (body: Record<string, unknown>): string | null => {
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
function calculateTotalFees(payloadJson: string): number {
  try {
    const payload = JSON.parse(payloadJson);
    if (payload.courses && Array.isArray(payload.courses)) {
      return payload.courses.reduce((sum: number, c: any) => {
        // Remove non-numeric characters before parsing as a float
        const fees = parseFloat(String(c.finalFees || '0').replace(/[^0-9.]/g, ''));
        return sum + (isNaN(fees) ? 0 : fees);
      }, 0);
    }
  } catch (e) {
    console.error('Failed to parse payload_json to compute fees:', e);
  }
  return 0;
}

/**
 * Handles fetching all admission records.
 */
export const getAllAdmissions = async (req: Request, res: Response) => {
  try {
    const admissions = await AdmissionModel.findAll();
    res.json(admissions);
  } catch (error) {
    console.error('Get all admissions error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

/**
 * Handles creating a new admission.
 * Calculates total fees based on course selection and initializes/upserts fee summary record.
 */
export const createAdmission = async (req: Request, res: Response) => {
  try {
    const validationError = validateAdmissionPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await AdmissionModel.create(req.body);
    const totalFees = calculateTotalFees(req.body.payload_json);

    // Upsert fees summary tracking for this admission
    if (result.lastID !== undefined) {
      await FeeModel.upsertFeeSummary(Number(result.lastID), totalFees);
    }

    res.status(201).json({ id: result.lastID, message: 'Admission added' });
  } catch (error) {
    console.error('Create admission error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

/**
 * Handles updating an existing admission.
 * Recalculates total fees and updates the corresponding fee summary records.
 */
export const updateAdmission = async (req: Request, res: Response) => {
  try {
    const validationError = validateAdmissionPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const cleanId = normalizeId(req.params.id);
    await AdmissionModel.update(cleanId, req.body);

    // Re-calculate and update total fees in the summary tracking
    const totalFees = calculateTotalFees(req.body.payload_json);
    await FeeModel.upsertFeeSummary(Number(cleanId), totalFees);

    res.json({ message: 'Admission updated' });
  } catch (error) {
    console.error('Update admission error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

/**
 * Handles deleting an admission and clearing its associated fee summaries and payments.
 */
export const deleteAdmission = async (req: Request, res: Response) => {
  try {
    const cleanId = normalizeId(req.params.id);
    await AdmissionModel.delete(cleanId);

    // Clear out fee summary and payment history records associated with this admission
    await FeeModel.deleteByAdmissionId(Number(cleanId));

    res.json({ message: 'Admission deleted' });
  } catch (error) {
    console.error('Delete admission error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
