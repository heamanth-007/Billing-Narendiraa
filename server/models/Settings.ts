import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  companyName: string;
  tagline?: string;
  ownerName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  state?: string;
  gstin?: string;
  pan?: string;
  logoUrl?: string;
  enableTax?: boolean;
  defaultTaxRate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema: Schema = new Schema(
  {
    companyName: { type: String, default: 'Dheeksha Trade Link', trim: true },
    tagline: { type: String, default: 'Direct Sivakasi Fireworks Manufacturer & Wholesale Supplier', trim: true },
    ownerName: { type: String, default: 'Siva', trim: true },
    phone: { type: String, default: '+91 98765 43210', trim: true },
    whatsapp: { type: String, default: '+91 98765 43210', trim: true },
    email: { type: String, default: 'dheekshatradelink@gmail.com', trim: true },
    address: { type: String, default: '124, Sivakasi Main Road, Near Bus Stand', trim: true },
    city: { type: String, default: 'Sivakasi', trim: true },
    pincode: { type: String, default: '626123', trim: true },
    state: { type: String, default: 'Tamil Nadu', trim: true },
    gstin: { type: String, default: '33AAAAA0000A1Z5', trim: true },
    pan: { type: String, default: 'AAAAA0000A', trim: true },
    logoUrl: { type: String, default: '' },
    enableTax: { type: Boolean, default: false },
    defaultTaxRate: { type: String, default: '18' },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
