import type { Request, Response, NextFunction } from 'express';
import { AccountLedger } from '../models/AccountLedger';
import { escapeRegex, recalculateCustomerBalance } from '../utils/ledgerUtils';

export const getAccountDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerName } = req.query;
    const filter: any = {};
    if (customerName && typeof customerName === 'string' && customerName.trim() !== '' && customerName.toLowerCase() !== 'all') {
      filter.customerName = { $regex: new RegExp(`^${escapeRegex(customerName.trim())}$`, 'i') };
    }

    const accounts = await AccountLedger.find(filter).sort({ createdAt: 1, _id: 1 });
    res.status(200).json({ success: true, count: accounts.length, data: accounts });
  } catch (error) {
    next(error);
  }
};

export const addCredit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerName, companyName, creditAmount, date } = req.body;

    const addedCredit = parseFloat(String(creditAmount).replace(/,/g, '')) || 0;
    const finalCustName = customerName || 'General';

    const creditEntry = await AccountLedger.create({
      customerName: finalCustName,
      companyName: companyName || 'General',
      date: date || new Date().toISOString().split('T')[0],
      debit: '0.00',
      credit: addedCredit.toFixed(2),
      balance: '0.00',
      type: 'CREDIT',
    });

    await recalculateCustomerBalance(finalCustName);

    res.status(201).json({ success: true, data: creditEntry });
  } catch (error) {
    next(error);
  }
};

export const deleteAccountEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const entry = await AccountLedger.findById(req.params.id);
    if (!entry) {
      res.status(404).json({ success: false, error: 'Account ledger entry not found' });
      return;
    }

    const customerName = entry.customerName;

    // If this entry was created from a particular bill, delete the corresponding particular bill as well
    const { Particular } = await import('../models/Particular');
    const { isCloudinaryConfigured, deleteFromCloudinary } = await import('../config/cloudinary');

    let particularToDelete: any = null;
    if (entry.particularId) {
      particularToDelete = await Particular.findById(entry.particularId);
    } else if (entry.billNo && entry.billNo.trim() !== '') {
      particularToDelete = await Particular.findOne({ billNo: entry.billNo.trim() });
    } else if (entry.type === 'BILL') {
      particularToDelete = await Particular.findOne({
        customerName: { $regex: new RegExp(`^${escapeRegex(entry.customerName.trim())}$`, 'i') },
        companyName: { $regex: new RegExp(`^${escapeRegex(entry.companyName.trim())}$`, 'i') },
        date: entry.date,
      });
    }

    if (particularToDelete) {
      // 1. Delete Cloudinary asset if present
      if (particularToDelete.pdfPublicId && isCloudinaryConfigured()) {
        try {
          await deleteFromCloudinary(particularToDelete.pdfPublicId);
        } catch (cloudErr) {
          console.warn('[Cloudinary Warning] Failed to delete asset during ledger delete:', cloudErr);
        }
      }

      // 2. Delete the Particular document
      await Particular.findByIdAndDelete(particularToDelete._id);

      // 3. Delete all other ledger entries associated with this particular
      await AccountLedger.deleteMany({
        $or: [
          { particularId: String(particularToDelete._id) },
          ...(particularToDelete.billNo ? [{ billNo: particularToDelete.billNo }] : []),
        ],
      });
    }

    // Delete the target entry itself if not already deleted
    await AccountLedger.findByIdAndDelete(req.params.id);

    // Recalculate running balances for this customer
    if (customerName) {
      await recalculateCustomerBalance(customerName);
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

