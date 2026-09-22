import { Product } from '../models/Product';
import PriceList from '../models/PriceList';
import { StockMovement, type StockChangeType } from '../models/StockMovement';

/**
 * Escapes regex special characters
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Safely changes stock for a product in both Product and PriceList collections
 * and logs a StockMovement audit record.
 */
export const applyStockChange = async (
  itemName: string,
  deltaQuantity: number,
  changeType: StockChangeType,
  referenceNo: string = '',
  customerOrVendor: string = '',
  notes: string = '',
  dateStr: string = ''
): Promise<{ previousStock: number; newStock: number } | null> => {
  const cleanName = (itemName || '').trim();
  if (!cleanName || deltaQuantity === 0) {
    return null;
  }

  const nameRegex = new RegExp(`^${escapeRegex(cleanName)}$`, 'i');
  const nowStr = dateStr || new Date().toISOString().split('T')[0];

  // 1. Fetch current product or price list item to find previous stock
  let currentStock = 0;
  let unit = 'Box';
  let category = 'General';

  const productDoc = await Product.findOne({ name: nameRegex });
  const priceDoc = await PriceList.findOne({ itemName: nameRegex });

  if (productDoc) {
    currentStock = productDoc.stock || 0;
    unit = productDoc.unit || 'Box';
    category = productDoc.category || 'General';
  } else if (priceDoc) {
    currentStock = priceDoc.stock || 0;
    unit = priceDoc.unit || 'Box';
    category = priceDoc.category || 'General';
  }

  const previousStock = currentStock;
  const newStock = Math.max(0, previousStock + deltaQuantity);

  // 2. Update Product collection
  if (productDoc) {
    productDoc.stock = newStock;
    await productDoc.save();
  } else {
    const totalCount = await Product.countDocuments();
    await Product.create({
      slNo: totalCount + 1,
      name: cleanName,
      category,
      unit,
      stock: newStock,
      minStock: 5,
    });
  }

  // 3. Update PriceList collection
  if (priceDoc) {
    priceDoc.stock = newStock;
    await priceDoc.save();
  } else {
    const totalCount = await PriceList.countDocuments();
    await PriceList.create({
      slNo: totalCount + 1,
      itemName: cleanName,
      category,
      unit,
      stock: newStock,
      effectiveDate: nowStr,
      batchName: 'Stock Inward',
    });
  }

  // 4. Create StockMovement Log
  await StockMovement.create({
    itemName: productDoc?.name || priceDoc?.itemName || cleanName,
    category,
    unit,
    changeType,
    quantity: deltaQuantity,
    previousStock,
    newStock,
    referenceNo,
    customerOrVendor,
    notes,
    date: nowStr,
  });

  return { previousStock, newStock };
};

/**
 * Deducts stock when a bill is created.
 */
export const deductStockForBill = async (
  products: Array<{ particular: string; quantity: string | number }>,
  billNo: string,
  customerName: string,
  dateStr: string
): Promise<void> => {
  if (!Array.isArray(products) || products.length === 0) return;

  for (const item of products) {
    const itemName = item.particular;
    const qty = parseFloat(String(item.quantity || 0));
    if (itemName && qty > 0) {
      try {
        await applyStockChange(
          itemName,
          -qty, // negative for bill deduction
          'BILL_OUT',
          billNo ? `#${billNo}` : 'BILL',
          customerName,
          `Bill Generated - ${customerName}`,
          dateStr
        );
      } catch (err) {
        console.error(`[Stock Deduction Error for ${itemName}]:`, err);
      }
    }
  }
};

/**
 * Adjusts stock when a bill is updated by comparing old products against new products.
 */
export const adjustStockForBillUpdate = async (
  oldProducts: Array<{ particular: string; quantity: string | number }>,
  newProducts: Array<{ particular: string; quantity: string | number }>,
  billNo: string,
  customerName: string,
  dateStr: string
): Promise<void> => {
  const oldMap = new Map<string, number>();
  (oldProducts || []).forEach((p) => {
    const key = (p.particular || '').trim().toLowerCase();
    if (key) {
      const q = parseFloat(String(p.quantity || 0)) || 0;
      oldMap.set(key, (oldMap.get(key) || 0) + q);
    }
  });

  const newMap = new Map<string, { originalName: string; qty: number }>();
  (newProducts || []).forEach((p) => {
    const orig = (p.particular || '').trim();
    const key = orig.toLowerCase();
    if (key) {
      const q = parseFloat(String(p.quantity || 0)) || 0;
      const current = newMap.get(key);
      if (current) {
        current.qty += q;
      } else {
        newMap.set(key, { originalName: orig, qty: q });
      }
    }
  });

  // Check all items in new bill
  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

  for (const key of allKeys) {
    const oldQty = oldMap.get(key) || 0;
    const newEntry = newMap.get(key);
    const newQty = newEntry?.qty || 0;
    const itemName = newEntry?.originalName || key;

    const diff = newQty - oldQty; // e.g. was 5, now 7 => diff +2 (need to deduct 2 more, delta = -2)

    if (diff !== 0) {
      const stockDelta = -diff; // if diff is +2, stockDelta is -2
      try {
        await applyStockChange(
          itemName,
          stockDelta,
          'BILL_EDIT',
          billNo ? `#${billNo}` : 'BILL',
          customerName,
          `Bill Modified - Qty changed from ${oldQty} to ${newQty}`,
          dateStr
        );
      } catch (err) {
        console.error(`[Stock Bill Edit Sync Error for ${itemName}]:`, err);
      }
    }
  }
};

/**
 * Restores deducted stock back when a bill is deleted or cancelled.
 */
export const restoreStockForBill = async (
  products: Array<{ particular: string; quantity: string | number }>,
  billNo: string,
  customerName: string,
  dateStr: string
): Promise<void> => {
  if (!Array.isArray(products) || products.length === 0) return;

  for (const item of products) {
    const itemName = item.particular;
    const qty = parseFloat(String(item.quantity || 0));
    if (itemName && qty > 0) {
      try {
        await applyStockChange(
          itemName,
          qty, // positive to restore
          'BILL_DELETE_RESTORE',
          billNo ? `#${billNo}` : 'BILL',
          customerName,
          `Bill Deleted - Stock Restored`,
          dateStr
        );
      } catch (err) {
        console.error(`[Stock Restore Error for ${itemName}]:`, err);
      }
    }
  }
};
