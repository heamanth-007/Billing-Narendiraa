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
    companyName: { type: String, default: 'NARENDIRAA ENTERPRISES', trim: true },
    tagline: { type: String, default: 'ஸ்ரீ கருப்பசாமி துணை', trim: true },
    ownerName: { type: String, default: '', trim: true },
    phone: { type: String, default: '99438 83839', trim: true },
    whatsapp: { type: String, default: '95859 75756, 96269 97374', trim: true },
    email: { type: String, default: 'narendiraapyrotech@gmail.com', trim: true },
    address: { type: String, default: 'Sattur Road, Paraipatti', trim: true },
    city: { type: String, default: 'Sivakasi', trim: true },
    pincode: { type: String, default: '626189', trim: true },
    state: { type: String, default: 'Tamil Nadu', trim: true },
    gstin: { type: String, default: '', trim: true },
    pan: { type: String, default: '', trim: true },
    logoUrl: { type: String, default: '' },
    enableTax: { type: Boolean, default: false },
    defaultTaxRate: { type: String, default: '18' },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
