import type { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import PriceList from '../models/PriceList';
import { StockMovement, type StockChangeType } from '../models/StockMovement';
import { applyStockChange } from '../utils/stockUtils';

/**
 * Get unified stock list and overall inventory KPIs
 */
export const getStockList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, status, search } = req.query;

    const [products, priceItems] = await Promise.all([
      Product.find().sort({ slNo: 1, name: 1 }),
      PriceList.find().sort({ slNo: 1, itemName: 1 }),
    ]);

    // Merge into unique inventory map
    const stockMap = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        unit: string;
        rate: number;
        mrp: number;
        stock: number;
        minStock: number;
        status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
        stockValue: number;
        updatedAt?: Date;
      }
    >();

    // 1. Process Products
    products.forEach((p) => {
      const key = (p.name || '').trim().toLowerCase();
      if (!key) return;

      const stockNum = Number(p.stock) || 0;
      const minStockNum = p.minStock !== undefined ? Number(p.minStock) : 5;
      const rateNum = Number(p.rate) || 0;
      const mrpNum = Number(p.mrp) || 0;

      let itemStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
      if (stockNum <= 0) {
        itemStatus = 'OUT_OF_STOCK';
      } else if (stockNum <= minStockNum) {
        itemStatus = 'LOW_STOCK';
      }

      stockMap.set(key, {
        id: String(p._id),
        name: p.name.trim(),
        category: p.category || 'General',
        unit: p.unit || 'Box',
        rate: rateNum,
        mrp: mrpNum,
        stock: stockNum,
        minStock: minStockNum,
        status: itemStatus,
        stockValue: stockNum * rateNum,
        updatedAt: p.updatedAt,
      });
    });

    // 2. Process PriceList items
    priceItems.forEach((p) => {
      const key = (p.itemName || '').trim().toLowerCase();
      if (!key) return;

      const existing = stockMap.get(key);
      const stockNum = p.stock !== undefined && p.stock !== null ? Number(p.stock) : (existing?.stock || 0);
      const minStockNum = existing?.minStock ?? 5;
      const rateNum = Number(p.rate) || existing?.rate || 0;
      const mrpNum = Number(p.mrp) || existing?.mrp || 0;

      let itemStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
      if (stockNum <= 0) {
        itemStatus = 'OUT_OF_STOCK';
      } else if (stockNum <= minStockNum) {
        itemStatus = 'LOW_STOCK';
      }

      stockMap.set(key, {
        id: existing?.id || String(p._id),
        name: p.itemName.trim(),
        category: p.category || existing?.category || 'General',
        unit: p.unit || existing?.unit || 'Box',
        rate: rateNum,
        mrp: mrpNum,
        stock: stockNum,
        minStock: minStockNum,
        status: itemStatus,
        stockValue: stockNum * rateNum,
        updatedAt: p.updatedAt || existing?.updatedAt,
      });
    });

    let items = Array.from(stockMap.values());

    // Calculate Summary KPIs before filters
    let totalStockQty = 0;
    let totalStockValue = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((it) => {
      totalStockQty += it.stock;
      totalStockValue += it.stockValue;
      if (it.status === 'OUT_OF_STOCK') outOfStockCount++;
      else if (it.status === 'LOW_STOCK') lowStockCount++;
      else inStockCount++;
    });

    const summary = {
      totalProducts: items.length,
      totalStockQty,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      inStockCount,
      lowStockCount,
      outOfStockCount,
    };

    // Apply category filter
    if (category && typeof category === 'string' && category !== 'ALL') {
      items = items.filter((it) => it.category.toLowerCase() === category.toLowerCase());
    }

    // Apply status filter
    if (status && typeof status === 'string' && status !== 'ALL') {
      items = items.filter((it) => it.status === status);
    }

    // Apply search filter
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      items = items.filter((it) => it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q));
    }

    res.status(200).json({
      success: true,
      summary,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust stock manually (Stock In / Stock Out / Direct Count Override / Min Stock Level)
 */
export const adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { itemName, deltaQuantity, newStock, changeType, referenceNo, customerOrVendor, notes, date, minStock } = req.body;

    const cleanName = (itemName || '').trim();
    if (!cleanName) {
      res.status(400).json({ success: false, error: 'Item name is required' });
      return;
    }

    // Update minStock if specified
    if (minStock !== undefined && minStock !== null) {
      const minVal = Math.max(0, parseInt(String(minStock), 10) || 0);
      await Product.updateMany(
        { name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { $set: { minStock: minVal } }
      );
    }

    let delta = 0;
    let selectedType: StockChangeType = (changeType as StockChangeType) || 'ADJUSTMENT';

    if (deltaQuantity !== undefined && deltaQuantity !== null && deltaQuantity !== '') {
      delta = parseFloat(String(deltaQuantity)) || 0;
    } else if (newStock !== undefined && newStock !== null && newStock !== '') {
      // Direct count override
      const prod = await Product.findOne({
        name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      const current = prod?.stock || 0;
      const target = parseFloat(String(newStock)) || 0;
      delta = target - current;
      selectedType = 'ADJUSTMENT';
    }

    if (delta !== 0) {
      const result = await applyStockChange(
        cleanName,
        delta,
        selectedType,
        referenceNo || 'MANUAL',
        customerOrVendor || '',
        notes || (delta > 0 ? 'Stock Added Manually' : 'Stock Deducted Manually'),
        date
      );

      res.status(200).json({
        success: true,
        message: 'Stock updated successfully',
        data: result,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Stock threshold updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock movement audit history
 */
export const getStockHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { itemName, changeType, limit = '100' } = req.query;

    const filter: any = {};
    if (itemName && typeof itemName === 'string' && itemName.trim() !== '') {
      filter.itemName = { $regex: new RegExp(`^${itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    }

    if (changeType && typeof changeType === 'string' && changeType !== 'ALL') {
      filter.changeType = changeType;
    }

    const limitNum = Math.min(500, parseInt(String(limit), 10) || 100);

    const history = await StockMovement.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limitNum);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update stock / minStock for multiple items
 */
export const bulkUpdateStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Items array is required' });
      return;
    }

    let updatedCount = 0;
    for (const it of items) {
      const cleanName = (it.itemName || it.name || '').trim();
      if (!cleanName) continue;

      const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`^${escaped}$`, 'i');

      const stockNum = it.stock !== undefined ? Math.max(0, parseFloat(String(it.stock)) || 0) : undefined;
      const minStockNum = it.minStock !== undefined ? Math.max(0, parseInt(String(it.minStock), 10) || 0) : undefined;

      const updatePayload: any = {};
      if (stockNum !== undefined) updatePayload.stock = stockNum;
      if (minStockNum !== undefined) updatePayload.minStock = minStockNum;

      if (Object.keys(updatePayload).length > 0) {
        await Product.updateMany({ name: nameRegex }, { $set: updatePayload });
        if (stockNum !== undefined) {
          await PriceList.updateMany({ itemName: nameRegex }, { $set: { stock: stockNum } });
        }
        updatedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated stock for ${updatedCount} items`,
    });
  } catch (error) {
    next(error);
  }
};
