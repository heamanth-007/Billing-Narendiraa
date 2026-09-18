import React from 'react';
import { getStoredSettings } from './SettingsPage';
import { numberToIndianWords } from '../utils/printUtils';

export interface BillPrintProduct {
  particular: string;
  quantity: string | number;
  rate: string | number;
  pktUnit: string | number;
  amount: string | number;
}

export interface BillPrintData {
  billNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  companyName: string;
  preparedBy?: string;
  phone?: string;
  email?: string;
  website?: string;
  transport?: string;
  caseCount?: string | number;
  products: BillPrintProduct[];
  amount?: string | number;
  discount?: string | number;
  packing?: string | number;
  tax?: string | number;
  total?: string | number;
  paymentStatus?: string;
  paymentMode?: string;
  paidAmount?: string | number;
  notes?: string;
  pdfData?: string;
  pdfUrl?: string;
  pdfName?: string;
}

interface BillPrintTemplateProps {
  bill: BillPrintData;
}

export const BillPrintTemplate: React.FC<BillPrintTemplateProps> = ({ bill }) => {
  const [storeSettings, setStoreSettings] = React.useState(() => getStoredSettings());

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    window.addEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Calculate Subtotal from Products or bill.amount
  const prodSubtotal = (bill.products || []).reduce((acc, p) => {
    const amt = parseFloat(String(p.amount).replace(/,/g, '')) || 0;
    return acc + amt;
  }, 0);
  const subtotal = prodSubtotal > 0 ? prodSubtotal : (parseFloat(String(bill.amount || bill.total || '0').replace(/,/g, '')) || 0);

  // Discount calculation
  const rawDiscStr = String(bill.discount ?? '').trim();
  const cleanDisc = rawDiscStr.replace(/[^0-9.]/g, '');
  const discNum = parseFloat(cleanDisc) || 0;
  let discountAmt = 0;
  let discountLabel = 'Discount';
  if (discNum > 0) {
    if (rawDiscStr.includes('%') || (discNum <= 100 && !rawDiscStr.startsWith('₹'))) {
      discountAmt = (subtotal * discNum) / 100;
      discountLabel = `Discount (${discNum}%)`;
    } else {
      discountAmt = discNum;
      discountLabel = `Discount (₹${discNum.toFixed(2)})`;
    }
  }

  // Transport calculation
  const rawTransportStr = String(bill.transport ?? '').trim();
  const cleanTrans = rawTransportStr.replace(/[^0-9.]/g, '');
  const transNum = parseFloat(cleanTrans) || 0;
  const transportAmt = (!isNaN(Number(rawTransportStr)) && transNum > 0) ? transNum : 0;
  const transportDisplayName = (!rawTransportStr || rawTransportStr === '0' || rawTransportStr === '-') ? '-' : rawTransportStr;

  // Packing calculation
  const rawPackStr = String(bill.packing ?? '').trim();
  const cleanPack = rawPackStr.replace(/[^0-9.]/g, '');
  const packNum = parseFloat(cleanPack) || 0;
  let packingAmt = 0;
  let packingLabel = 'Packing Charges';
  if (packNum > 0) {
    if (rawPackStr.includes('%')) {
      packingAmt = (subtotal * packNum) / 100;
      packingLabel = `Packing Charges (${packNum}%)`;
    } else {
      packingAmt = packNum;
      packingLabel = `Packing Charges`;
    }
  }

  // Tax calculation
  const rawTaxStr = String(bill.tax ?? '').trim();
  const cleanTax = rawTaxStr.replace(/[^0-9.]/g, '');
  const taxNum = parseFloat(cleanTax) || 0;
  let taxAmt = 0;
  let taxLabel = 'GST / Tax';
  if (taxNum > 0) {
    const baseForTax = Math.max(0, subtotal - discountAmt + transportAmt + packingAmt);
    taxAmt = (baseForTax * taxNum) / 100;
    taxLabel = `GST / Tax (${taxNum}%)`;
  }

  // Final Net Total
  const calculatedTotal = Math.max(0, subtotal - discountAmt + transportAmt + packingAmt + taxAmt);
  const rawTotalNum = parseFloat(String(bill.total ?? bill.amount ?? '0').replace(/,/g, '')) || 0;
  const finalTotalNum = rawTotalNum > 0 ? rawTotalNum : calculatedTotal;
  const formattedTotal = '₹' + finalTotalNum.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const amountInWords = numberToIndianWords(finalTotalNum);

  // Calculate sum of quantities across products for Total No. of Cases
  const computedCases = bill.caseCount !== undefined && bill.caseCount !== ''
    ? bill.caseCount
    : (bill.products || []).reduce((acc, p) => acc + (parseFloat(String(p.quantity)) || 0), 0);

  const displayCompanyName =
    bill.companyName &&
    bill.companyName.trim() !== '' &&
    bill.companyName !== 'General'
      ? bill.companyName
      : storeSettings.companyName || 'NARENDIRAA ENTERPRISES';

  const isTaxActive = Boolean(storeSettings.enableTax) || (parseFloat(String(bill.tax || '0').replace(/[^0-9.]/g, '')) > 0);
  
  // Construct complete address without duplicating city
  const city = storeSettings.city || 'Sivakasi';
  let addr = storeSettings.address || '';
  if (addr && addr.toLowerCase().endsWith(city.toLowerCase())) {
    addr = addr.slice(0, -city.length).replace(/[,\s]+$/, '');
  }
  const fullAddressParts = [
    addr,
    city,
    storeSettings.pincode ? `PIN: ${storeSettings.pincode}` : '',
    storeSettings.state || 'Tamil Nadu',
  ].filter(Boolean);
  const fullAddressLine = fullAddressParts.join(', ');

  // Construct contact details
  const contactParts = [
    storeSettings.phone ? `Phone: ${storeSettings.phone}` : '',
    storeSettings.whatsapp ? `WhatsApp: ${storeSettings.whatsapp}` : '',
    storeSettings.email ? `Email: ${storeSettings.email}` : '',
  ].filter(Boolean);
  const contactLine = contactParts.join(' | ');

  // Construct legal & registration details
  const legalParts = [
    (isTaxActive && storeSettings.gstin) ? `GSTIN: ${storeSettings.gstin}` : '',
    storeSettings.pan ? `PAN: ${storeSettings.pan}` : '',
    storeSettings.ownerName ? `Proprietor: ${storeSettings.ownerName}` : '',
  ].filter(Boolean);
  const legalLine = legalParts.join(' | ');

  const receiptSrc = bill.pdfData || bill.pdfUrl || '';

  return (
    <div
      className="dheeksha-bill-container"
      style={{
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        border: '1.5px solid #000000',
        boxSizing: 'border-box',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Top Header: Centered Company Name, Tagline, Logo & Complete Details */}
      <div
        style={{
          textAlign: 'center',
          padding: '8px 12px 6px 12px',
          borderBottom: '1.5px solid #000000',
        }}
      >
        {storeSettings.tagline && (
          <div
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#334155',
              marginBottom: '2px',
              letterSpacing: '0.02em',
            }}
          >
            {storeSettings.tagline}
          </div>
        )}
        {storeSettings.logoUrl && (
          <div style={{ marginBottom: '3px' }}>
            <img
              src={storeSettings.logoUrl}
              alt="Logo"
              style={{ maxHeight: '44px', maxWidth: '150px', objectFit: 'contain' }}
            />
          </div>
        )}
        <h1
          style={{
            fontSize: '23px',
            fontWeight: 800,
            color: '#000000',
            margin: '0 0 2px 0',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}
        >
          {displayCompanyName}
        </h1>
        {fullAddressLine && (
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>
            {fullAddressLine}
          </div>
        )}
        {contactLine && (
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
            {contactLine}
          </div>
        )}
        {legalLine && (
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
            {legalLine}
          </div>
        )}
      </div>

      {/* Bill Metadata Block: Balanced 2 Columns */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderBottom: '1.5px solid #000000',
          fontSize: '12px',
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: '50%', border: '1px solid #000000', padding: '6px 8px', verticalAlign: 'top' }}>
              <div style={{ display: 'flex', marginBottom: '3px' }}>
                <span style={{ color: '#475569', fontWeight: 600, minWidth: '85px', flexShrink: 0 }}>Customer:</span>
                <strong style={{ color: '#000000', fontSize: '13px' }}>{bill.customerName || '-'}</strong>
              </div>
              <div style={{ display: 'flex', marginBottom: '3px' }}>
                <span style={{ color: '#475569', fontWeight: 600, minWidth: '85px', flexShrink: 0 }}>Address:</span>
                <span style={{ fontSize: '11.5px', color: '#1E293B' }}>{bill.customerAddress && bill.customerAddress !== '-' ? bill.customerAddress : '-'}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: '3px' }}>
                <span style={{ color: '#475569', fontWeight: 600, minWidth: '85px', flexShrink: 0 }}>Phone:</span>
                <strong style={{ color: '#000000' }}>{bill.customerPhone && bill.customerPhone !== '-' ? bill.customerPhone : '-'}</strong>
              </div>
              {bill.customerGst && bill.customerGst !== '-' && bill.customerGst !== 'N/A' && (
                <div style={{ display: 'flex' }}>
                  <span style={{ color: '#475569', fontWeight: 600, minWidth: '85px', flexShrink: 0 }}>GSTIN:</span>
                  <strong style={{ color: '#000000' }}>{bill.customerGst}</strong>
                </div>
              )}
            </td>
            <td style={{ width: '50%', border: '1px solid #000000', padding: '5px 8px', verticalAlign: 'top' }}>
              <div style={{ display: 'flex', marginBottom: '2px' }}>
                <span style={{ color: '#475569', fontWeight: 600, minWidth: '80px', flexShrink: 0 }}>Bill No:</span>
                <strong style={{ color: '#000000' }}>#{bill.billNo || '-'}</strong>
              </div>
              <div style={{ display: 'flex', marginBottom: '2px' }}>
                <span style={{ color: '#475569', fontWeight: 600, minWidth: '80px', flexShrink: 0 }}>Date:</span>
                <strong style={{ color: '#000000' }}>{bill.date || '-'}</strong>
              </div>
              <div style={{ display: 'flex', marginBottom: '2px' }}>
                <span style={{ color: '#475569', fontWeight: 600, minWidth: '80px', flexShrink: 0 }}>Transport:</span>
                <strong style={{ color: '#000000' }}>{transportDisplayName}</strong>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ color: '#475569', fontWeight: 600, minWidth: '80px', flexShrink: 0 }}>Total Cases:</span>
                <strong style={{ color: '#000000' }}>{computedCases}</strong>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Products Table with Boxed Rows */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderBottom: '1.5px solid #000000',
          fontSize: '12px',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#F1F5F9' }}>
            <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', width: '38px', fontWeight: 700, fontSize: '11.5px' }}>
              S.No
            </th>
            <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'left', fontWeight: 700, fontSize: '11.5px' }}>
              Particulars / Description of Goods
            </th>
            <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', width: '65px', fontWeight: 700, fontSize: '11.5px' }}>
              Quantity
            </th>
            <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', width: '75px', fontWeight: 700, fontSize: '11.5px' }}>
              Rate (₹)
            </th>
            <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', width: '65px', fontWeight: 700, fontSize: '11.5px' }}>
              Unit
            </th>
            <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', width: '95px', fontWeight: 700, fontSize: '11.5px' }}>
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {(bill.products || []).length === 0 ? (
            <tr>
              <td colSpan={6} style={{ border: '1px solid #000000', textAlign: 'center', padding: '12px', color: '#64748B' }}>
                No product items in bill
              </td>
            </tr>
          ) : (
            (bill.products || []).map((item, idx) => {
              const numAmt = parseFloat(String(item.amount).replace(/,/g, '')) || 0;
              const numRate = parseFloat(String(item.rate).replace(/,/g, '')) || 0;
              return (
                <tr key={idx} style={{ pageBreakInside: 'avoid' }}>
                  <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', fontWeight: 600 }}>{item.particular || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center' }}>{item.quantity || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right' }}>
                    {numRate > 0 ? numRate.toFixed(2) : (item.rate || '-')}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center' }}>
                    {item.pktUnit && item.pktUnit !== '-' ? item.pktUnit : ''}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                    {numAmt.toFixed(2)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Bottom Split Section */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          pageBreakInside: 'avoid',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Left Column: Amount in Words, Receipt & Terms */}
        <div
          style={{
            flex: '1 1 54%',
            borderRight: '1.5px solid #000000',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11.5px',
                color: '#0F172A',
                lineHeight: '1.35',
                padding: '4px 6px',
                background: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                borderRadius: '4px',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontWeight: 700, color: '#475569' }}>Amount in Words:</span><br />
              <strong>{amountInWords}</strong>
            </div>

            {receiptSrc && (
              <img
                src={receiptSrc}
                alt="Transport Receipt"
                style={{
                  maxWidth: '100%',
                  maxHeight: '130px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '4px auto',
                }}
              />
            )}
          </div>

          <div style={{ fontSize: '10px', color: '#64748B', lineHeight: '1.3', marginTop: '4px' }}>
            • Goods once sold will not be taken back or replaced.<br />
            • All disputes are subject to Sivakasi Jurisdiction only.
          </div>
        </div>

        {/* Right Column: Calculation Summary Table */}
        <div style={{ flex: '1 1 46%', padding: 0, boxSizing: 'border-box' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
            }}
          >
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000000', padding: '4.5px 8px', fontWeight: 600, color: '#334155' }}>
                  Particular Amount
                </td>
                <td style={{ border: '1px solid #000000', padding: '4.5px 8px', textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                  {subtotal.toFixed(2)}
                </td>
              </tr>
              {discountAmt > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '4.5px 8px', fontWeight: 600, color: '#334155' }}>
                    {discountLabel}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '4.5px 8px', textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                    -{discountAmt.toFixed(2)}
                  </td>
                </tr>
              )}
              {transportAmt > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '4.5px 8px', fontWeight: 600, color: '#334155' }}>
                    Transport Charges
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '4.5px 8px', textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                    +{transportAmt.toFixed(2)}
                  </td>
                </tr>
              )}
              {packingAmt > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '4.5px 8px', fontWeight: 600, color: '#334155' }}>
                    {packingLabel}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '4.5px 8px', textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                    +{packingAmt.toFixed(2)}
                  </td>
                </tr>
              )}
              {taxAmt > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '4.5px 8px', fontWeight: 600, color: '#334155' }}>
                    {taxLabel}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '4.5px 8px', textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                    +{taxAmt.toFixed(2)}
                  </td>
                </tr>
              )}
              <tr style={{ backgroundColor: '#F1F5F9' }}>
                <td style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '6px 8px', fontWeight: 800 }}>
                  Grand Total
                </td>
                <td style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontSize: '13px', fontWeight: 800 }}>
                  {formattedTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signatory Bar */}
      <div
        style={{
          borderTop: '1.5px solid #000000',
          padding: '6px 12px 6px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          pageBreakInside: 'avoid',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#000000',
              borderTop: '1px dashed #000000',
              paddingTop: '3px',
              display: 'inline-block',
              minWidth: '120px',
            }}
          >
            Customer's Signature
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '24px' }}>
            For {displayCompanyName}
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#000000',
              borderTop: '1px dashed #000000',
              paddingTop: '3px',
              display: 'inline-block',
              minWidth: '150px',
              textAlign: 'center',
            }}
          >
            Authorized Signatory
          </span>
        </div>
      </div>
    </div>
  );
};
