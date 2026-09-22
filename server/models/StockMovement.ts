import mongoose, { Schema, Document } from 'mongoose';

export type StockChangeType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'BILL_OUT'
  | 'BILL_EDIT'
  | 'BILL_DELETE_RESTORE'
  | 'ADJUSTMENT'
  | 'INITIAL';

export interface IStockMovement extends Document {
  itemName: string;
  category?: string;
  unit?: string;
  changeType: StockChangeType;
  quantity: number; // positive for addition, negative for reduction
  previousStock: number;
  newStock: number;
  referenceNo?: string; // Bill No or Inward Ref
  customerOrVendor?: string;
  notes?: string;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema: Schema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    unit: { type: String, default: 'Box' },
    changeType: {
      type: String,
      enum: ['STOCK_IN', 'STOCK_OUT', 'BILL_OUT', 'BILL_EDIT', 'BILL_DELETE_RESTORE', 'ADJUSTMENT', 'INITIAL'],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceNo: { type: String, default: '' },
    customerOrVendor: { type: String, default: '' },
    notes: { type: String, default: '' },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  },
  { timestamps: true }
);

StockMovementSchema.index({ itemName: 1, createdAt: -1 });
StockMovementSchema.index({ referenceNo: 1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
