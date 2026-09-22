import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  InputBase,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Grid,
  Divider,
  Drawer,
  Autocomplete,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { StockApi, CategoriesApi } from '../services/api';
import { getStoredSettings } from './SettingsPage';

export interface StockItem {
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
  updatedAt?: string;
}

export interface StockSummary {
  totalProducts: number;
  totalStockQty: number;
  totalStockValue: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface StockMovementLog {
  _id: string;
  itemName: string;
  category?: string;
  unit?: string;
  changeType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceNo?: string;
  customerOrVendor?: string;
  notes?: string;
  date: string;
  createdAt: string;
}

export const StockPage: FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState<StockSummary>({
    totalProducts: 0,
    totalStockQty: 0,
    totalStockValue: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [categories, setCategories] = useState<{ name: string; color?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Add Inward Stock Modal State
  const [inwardModalOpen, setInwardModalOpen] = useState(false);
  const [inwardItemName, setInwardItemName] = useState('');
  const [inwardQty, setInwardQty] = useState('10');
  const [inwardRefNo, setInwardRefNo] = useState('');
  const [inwardVendor, setInwardVendor] = useState('');
  const [inwardNotes, setInwardNotes] = useState('');
  const [inwardDate, setInwardDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(false);

  // Quick Adjust Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustTargetItem, setAdjustTargetItem] = useState<StockItem | null>(null);
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'DIRECT_COUNT'>('DIRECT_COUNT');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustMinStock, setAdjustMinStock] = useState('5');
  const [adjustReason, setAdjustReason] = useState('');

  // Stock Movement History Drawer
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyItemFilter, setHistoryItemFilter] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');
  const [historyLogs, setHistoryLogs] = useState<StockMovementLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load Data
  const fetchStockData = async () => {
    try {
      setLoading(true);
      const [res, catsRes] = await Promise.all([
        StockApi.getAll({
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchTerm.trim() || undefined,
        }),
        CategoriesApi.getAll().catch(() => []),
      ]);

      let list: StockItem[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray((res as any).data)) {
        list = (res as any).data;
        if ((res as any).summary) {
          setSummary((res as any).summary);
        }
      }

      setStockItems(list);

      // Automatically compute live summary if not provided
      if (list.length > 0 && (!res || !(res as any).summary)) {
        let totalStockQty = 0;
        let totalStockValue = 0;
        let inStockCount = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        list.forEach((it) => {
          const s = it.stock || 0;
          const r = it.rate || 0;
          const m = it.minStock !== undefined ? it.minStock : 5;
          totalStockQty += s;
          totalStockValue += it.stockValue !== undefined ? it.stockValue : s * r;
          if (s <= 0) outOfStockCount++;
          else if (s <= m) lowStockCount++;
          else inStockCount++;
        });

        setSummary({
          totalProducts: list.length,
          totalStockQty,
          totalStockValue: Math.round(totalStockValue * 100) / 100,
          inStockCount,
          lowStockCount,
          outOfStockCount,
        });
      }

      if (Array.isArray(catsRes)) {
        setCategories(catsRes);
      }
    } catch (err) {
      console.error('Failed to fetch stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, [selectedCategory, statusFilter]);

  // Handle Search Input Debouncing / Trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStockData();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load Movement History
  const fetchHistory = async (itemName?: string) => {
    try {
      setHistoryLoading(true);
      const res = await StockApi.getHistory({
        itemName: itemName || (historyItemFilter.trim() || undefined),
        changeType: historyTypeFilter !== 'ALL' ? historyTypeFilter : undefined,
        limit: 150,
      });
      if (Array.isArray(res)) {
        setHistoryLogs(res);
      }
    } catch (err) {
      console.error('Failed to fetch stock history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryFor = (item?: StockItem) => {
    const name = item ? item.name : '';
    setHistoryItemFilter(name);
    setHistoryTypeFilter('ALL');
    setHistoryDrawerOpen(true);
    fetchHistory(name);
  };

  // Open Quick Adjust Modal
  const handleOpenAdjust = (item: StockItem) => {
    setAdjustTargetItem(item);
    setAdjustType('DIRECT_COUNT');
    setAdjustQty(String(item.stock));
    setAdjustMinStock(String(item.minStock || 5));
    setAdjustReason('');
    setAdjustModalOpen(true);
  };

  // Submit Inward Stock (+ Quantity)
  const handleSubmitInward = async () => {
    if (!inwardItemName.trim()) {
      alert('Please select or enter an item name');
      return;
    }
    const qNum = parseFloat(inwardQty);
    if (isNaN(qNum) || qNum <= 0) {
      alert('Please enter a valid positive quantity');
      return;
    }

    try {
      setActionLoading(true);
      await StockApi.adjustStock({
        itemName: inwardItemName.trim(),
        deltaQuantity: qNum,
        changeType: 'STOCK_IN',
        referenceNo: inwardRefNo.trim() || 'PURCHASE',
        customerOrVendor: inwardVendor.trim(),
        notes: inwardNotes.trim() || 'Stock Inward Purchase',
        date: inwardDate,
      });

      setInwardModalOpen(false);
      setInwardItemName('');
      setInwardQty('10');
      setInwardRefNo('');
      setInwardVendor('');
      setInwardNotes('');
      fetchStockData();
    } catch (err: any) {
      alert(err?.message || 'Failed to add stock');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Stock Adjustment / Override
  const handleSubmitAdjust = async () => {
    if (!adjustTargetItem) return;

    try {
      setActionLoading(true);
      const minVal = parseInt(adjustMinStock, 10) || 5;

      if (adjustType === 'DIRECT_COUNT') {
        const countVal = Math.max(0, parseFloat(adjustQty) || 0);
        await StockApi.adjustStock({
          itemName: adjustTargetItem.name,
          newStock: countVal,
          minStock: minVal,
          notes: adjustReason.trim() || 'Physical Count Adjustment',
          date: new Date().toISOString().split('T')[0],
        });
      } else if (adjustType === 'STOCK_IN') {
        const delta = Math.max(0, parseFloat(adjustQty) || 0);
        if (delta > 0) {
          await StockApi.adjustStock({
            itemName: adjustTargetItem.name,
            deltaQuantity: delta,
            changeType: 'STOCK_IN',
            minStock: minVal,
            notes: adjustReason.trim() || 'Manual Stock Addition',
            date: new Date().toISOString().split('T')[0],
          });
        }
      } else if (adjustType === 'STOCK_OUT') {
        const delta = Math.max(0, parseFloat(adjustQty) || 0);
        if (delta > 0) {
          await StockApi.adjustStock({
            itemName: adjustTargetItem.name,
            deltaQuantity: -delta,
            changeType: 'STOCK_OUT',
            minStock: minVal,
            notes: adjustReason.trim() || 'Damage / Scrap Outward',
            date: new Date().toISOString().split('T')[0],
          });
        }
      }

      setAdjustModalOpen(false);
      fetchStockData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update stock');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Single Step +1 / -1
  const handleQuickDelta = async (item: StockItem, delta: number) => {
    try {
      await StockApi.adjustStock({
        itemName: item.name,
        deltaQuantity: delta,
        changeType: delta > 0 ? 'STOCK_IN' : 'STOCK_OUT',
        notes: delta > 0 ? 'Quick +1 Inward' : 'Quick -1 Outward',
      });
      fetchStockData();
    } catch (err) {
      console.error('Quick delta failed:', err);
    }
  };

  // Print Stock Sheet
  const handlePrintStock = () => {
    const settings = getStoredSettings();
    const printWin = window.open('', '_blank', 'width=950,height=750');
    if (!printWin) {
      alert('Popups blocked. Please allow popups for this site to print stock sheets.');
      return;
    }

    const rowsHtml = stockItems
      .map(
        (it, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><strong>${it.name}</strong></td>
          <td><span class="badge badge-cat">${it.category}</span></td>
          <td style="text-align: center;">${it.unit || 'Box'}</td>
          <td style="text-align: right;">₹${it.rate.toFixed(2)}</td>
          <td style="text-align: center; font-weight: bold; font-size: 13px; color: ${
            it.stock <= 0 ? '#DC2626' : it.stock <= it.minStock ? '#D97706' : '#16A34A'
          };">${it.stock}</td>
          <td style="text-align: center;">${it.minStock}</td>
          <td style="text-align: right; font-weight: 600;">₹${it.stockValue.toFixed(2)}</td>
          <td style="text-align: center;">
            <span class="badge ${
              it.stock <= 0 ? 'badge-out' : it.stock <= it.minStock ? 'badge-low' : 'badge-in'
            }">${it.status.replace(/_/g, ' ')}</span>
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock Inventory Report - ${settings.companyName || 'Dheeksha Trade'}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 10mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 15px; }
            .header-box { border-bottom: 2px solid #990000; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
            .brand-name { font-size: 20px; font-weight: 900; color: #990000; letter-spacing: 0.5px; }
            .brand-sub { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; }
            .doc-title { text-align: right; }
            .doc-title h2 { margin: 0; font-size: 16px; color: #1e293b; text-transform: uppercase; }
            .doc-title p { margin: 2px 0 0; font-size: 10px; color: #64748b; }
            .kpi-row { display: flex; gap: 10px; margin-bottom: 15px; }
            .kpi-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; background: #f8fafc; }
            .kpi-card .num { font-size: 16px; font-weight: 800; color: #990000; }
            .kpi-card .lbl { font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background-color: #990000; color: #ffffff; padding: 7px 8px; font-weight: 700; text-transform: uppercase; font-size: 10px; border: 1px solid #7f1d1d; }
            td { padding: 6px 8px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; display: inline-block; }
            .badge-cat { background: #e0e7ff; color: #3730a3; }
            .badge-in { background: #dcfce7; color: #15803d; }
            .badge-low { background: #fef3c7; color: #b45309; }
            .badge-out { background: #fee2e2; color: #b91c1c; }
            .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <div class="brand-name">${settings.companyName || 'NARENDIRAA ENTERPRISES'}</div>
              <div class="brand-sub">${settings.address || 'Sivakasi, Tamil Nadu'} | Ph: ${settings.phone || '-'}</div>
            </div>
            <div class="doc-title">
              <h2>Inventory Stock Valuation</h2>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-card">
              <div class="num">${summary.totalProducts}</div>
              <div class="lbl">Total SKUs</div>
            </div>
            <div class="kpi-card">
              <div class="num">${summary.totalStockQty}</div>
              <div class="lbl">Total Units</div>
            </div>
            <div class="kpi-card">
              <div class="num">₹${summary.totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div class="lbl">Stock Valuation</div>
            </div>
            <div class="kpi-card">
              <div class="num" style="color: #16a34a;">${summary.inStockCount}</div>
              <div class="lbl">In Stock</div>
            </div>
            <div class="kpi-card">
              <div class="num" style="color: #d97706;">${summary.lowStockCount}</div>
              <div class="lbl">Low Stock</div>
            </div>
            <div class="kpi-card">
              <div class="num" style="color: #dc2626;">${summary.outOfStockCount}</div>
              <div class="lbl">Out of Stock</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 35px;">Sl</th>
                <th>Item / Particular Name</th>
                <th>Category</th>
                <th style="width: 50px;">Unit</th>
                <th style="width: 70px;">Rate (₹)</th>
                <th style="width: 60px;">Stock</th>
                <th style="width: 55px;">Min Alert</th>
                <th style="width: 85px;">Value (₹)</th>
                <th style="width: 85px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Printed from Dheeksha Trade Billing & Inventory Management System • Page 1 of 1
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // Distinct options for Inward selection
  const allItemNames = useMemo(() => {
    return Array.from(new Set(stockItems.map((s) => s.name)));
  }, [stockItems]);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, maxWidth: 1440, mx: 'auto', width: '100%' }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, #7F1D1D 0%, #990000 50%, #B91C1C 100%)',
          color: '#FFFFFF',
          mb: 3,
          boxShadow: '0 8px 24px rgba(153, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
            <Inventory2RoundedIcon sx={{ fontSize: { xs: 26, sm: 30 }, color: '#FFD700' }} />
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '0.02em', color: '#FFFFFF', fontSize: { xs: '19px', sm: '24px' } }}>
              Stock & Inventory Maintenance
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '13px', color: '#FEF3C7', opacity: 0.95, fontWeight: 500 }}>
            Real-time stock tracking • Auto-deduction on bill generation • Purchase Inward & Audit History
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
          <Button
            variant="contained"
            onClick={() => setInwardModalOpen(true)}
            startIcon={<AddRoundedIcon />}
            sx={{
              backgroundColor: '#FFD700',
              color: '#7F1D1D',
              fontWeight: 800,
              fontSize: '13.5px',
              borderRadius: 2,
              px: 2,
              py: 1,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              '&:hover': {
                backgroundColor: '#F59E0B',
              },
            }}
          >
            + Add Stock (Inward)
          </Button>

          <Button
            variant="outlined"
            onClick={() => handleOpenHistoryFor()}
            startIcon={<HistoryRoundedIcon />}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.6)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: 2,
              px: 1.8,
              py: 1,
              textTransform: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderColor: '#FFD700',
              },
            }}
          >
            Audit History
          </Button>

          <Button
            variant="outlined"
            onClick={handlePrintStock}
            startIcon={<PrintOutlinedIcon />}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.6)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: 2,
              px: 1.8,
              py: 1,
              textTransform: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderColor: '#FFD700',
              },
            }}
          >
            Print Sheet
          </Button>

          <IconButton
            onClick={fetchStockData}
            sx={{
              color: '#FFD700',
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 2,
              p: 1,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
            }}
          >
            <RefreshRoundedIcon />
          </IconButton>
        </Box>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total SKUs */}
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Paper
            elevation={0}
            onClick={() => setStatusFilter('ALL')}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1.5px solid',
              borderColor: statusFilter === 'ALL' ? '#990000' : '#E2E8F0',
              backgroundColor: statusFilter === 'ALL' ? '#FFFBEB' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: statusFilter === 'ALL' ? '0 4px 12px rgba(153, 0, 0, 0.12)' : 'none',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#990000' },
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Items
            </Typography>
            <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', my: 0.3 }}>
              {summary.totalProducts}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
              All inventory SKUs
            </Typography>
          </Paper>
        </Grid>

        {/* Total Units in Stock */}
        <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Stock Units
              </Typography>
              <TrendingUpRoundedIcon sx={{ fontSize: 18, color: '#059669' }} />
            </Box>
            <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#059669', my: 0.3 }}>
              {summary.totalStockQty}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              Valuation: <strong style={{ color: '#0F172A' }}>₹{summary.totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </Typography>
          </Paper>
        </Grid>

        {/* In Stock */}
        <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
          <Paper
            elevation={0}
            onClick={() => setStatusFilter('IN_STOCK')}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1.5px solid',
              borderColor: statusFilter === 'IN_STOCK' ? '#059669' : '#E2E8F0',
              backgroundColor: statusFilter === 'IN_STOCK' ? '#ECFDF5' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: statusFilter === 'IN_STOCK' ? '0 4px 12px rgba(5, 150, 105, 0.15)' : 'none',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#059669' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                In Stock
              </Typography>
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18, color: '#059669' }} />
            </Box>
            <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#059669', my: 0.3 }}>
              {summary.inStockCount}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
              Healthy inventory
            </Typography>
          </Paper>
        </Grid>

        {/* Low Stock Alerts */}
        <Grid size={{ xs: 6, sm: 6, md: 2.5 }}>
          <Paper
            elevation={0}
            onClick={() => setStatusFilter('LOW_STOCK')}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1.5px solid',
              borderColor: statusFilter === 'LOW_STOCK' ? '#D97706' : '#FCD34D',
              backgroundColor: statusFilter === 'LOW_STOCK' ? '#FEF3C7' : '#FFFBEB',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: statusFilter === 'LOW_STOCK' ? '0 4px 12px rgba(217, 119, 6, 0.15)' : 'none',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#D97706' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                Low Stock Alert
              </Typography>
              <WarningAmberRoundedIcon sx={{ fontSize: 18, color: '#D97706' }} />
            </Box>
            <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#D97706', my: 0.3 }}>
              {summary.lowStockCount}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>
              Below alert threshold
            </Typography>
          </Paper>
        </Grid>

        {/* Out of Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
          <Paper
            elevation={0}
            onClick={() => setStatusFilter('OUT_OF_STOCK')}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1.5px solid',
              borderColor: statusFilter === 'OUT_OF_STOCK' ? '#DC2626' : '#FCA5A5',
              backgroundColor: statusFilter === 'OUT_OF_STOCK' ? '#FEF2F2' : '#FFF5F5',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: statusFilter === 'OUT_OF_STOCK' ? '0 4px 12px rgba(220, 38, 38, 0.15)' : 'none',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#DC2626' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
                Out of Stock
              </Typography>
              <CancelOutlinedIcon sx={{ fontSize: 18, color: '#DC2626' }} />
            </Box>
            <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#DC2626', my: 0.3 }}>
              {summary.outOfStockCount}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#B91C1C', fontWeight: 600 }}>
              Needs immediate reorder
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Search & Filters Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: 2.5,
          border: '1.5px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Search Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            border: '1.5px solid #CBD5E1',
            borderRadius: 2,
            px: 1.5,
            py: 0.6,
            flexGrow: 1,
            maxWidth: { md: 450 },
            '&:focus-within': {
              borderColor: '#990000',
              backgroundColor: '#FFFFFF',
            },
          }}
        >
          <SearchRoundedIcon sx={{ color: '#64748B', mr: 1, fontSize: 20 }} />
          <InputBase
            placeholder="Search items by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, fontSize: '13.5px', fontWeight: 500 }}
          />
          {searchTerm && (
            <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.2 }}>
              <ClearRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>

        {/* Filters Group */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Category Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              sx={{
                borderRadius: 2,
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#F8FAFC',
              }}
            >
              <MenuItem value="ALL">All Categories</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.name} value={c.name}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Filter Pills */}
          <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', py: 0.3 }}>
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'IN_STOCK', label: 'In Stock' },
              { id: 'LOW_STOCK', label: 'Low Stock' },
              { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
            ].map((st) => {
              const active = statusFilter === st.id;
              return (
                <Chip
                  key={st.id}
                  label={st.label}
                  clickable
                  onClick={() => setStatusFilter(st.id as any)}
                  sx={{
                    fontWeight: 700,
                    fontSize: '12px',
                    borderRadius: '16px',
                    backgroundColor: active ? '#990000' : '#F1F5F9',
                    color: active ? '#FFFFFF' : '#475569',
                    border: active ? '1px solid #7F1D1D' : '1px solid #E2E8F0',
                    '&:hover': {
                      backgroundColor: active ? '#7F1D1D' : '#E2E8F0',
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </Paper>

      {/* Stock Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1.5px solid #E2E8F0',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Table sx={{ minWidth: 750 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#990000' }}>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px', width: '50px', textAlign: 'center' }}>
                #
              </TableCell>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px' }}>
                Item / Particular Name
              </TableCell>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px' }}>
                Category
              </TableCell>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px', textAlign: 'center' }}>
                Unit
              </TableCell>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px', textAlign: 'right' }}>
                Rate (₹)
              </TableCell>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px', textAlign: 'center' }}>
                Available Stock
              </TableCell>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px', textAlign: 'center' }}>
                Min Alert Level
              </TableCell>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px', textAlign: 'right' }}>
                Total Value
              </TableCell>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px', textAlign: 'center' }}>
                Status
              </TableCell>
              <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12.5px', textAlign: 'center' }}>
                Quick Action
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6 }}>
                  <CircularProgress size={36} sx={{ color: '#990000', mb: 1 }} />
                  <Typography sx={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                    Loading real-time stock data...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : stockItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6 }}>
                  <Inventory2RoundedIcon sx={{ fontSize: 44, color: '#CBD5E1', mb: 1 }} />
                  <Typography sx={{ fontSize: '15px', color: '#334155', fontWeight: 700 }}>
                    No stock records found
                  </Typography>
                  <Typography sx={{ fontSize: '12.5px', color: '#64748B', mt: 0.5 }}>
                    Click "+ Add Stock (Inward)" above or adjust your search filters
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              stockItems.map((item, idx) => {
                const isOutOfStock = item.stock <= 0;
                const isLowStock = !isOutOfStock && item.stock <= item.minStock;

                return (
                  <TableRow
                    key={item.id || item.name}
                    hover
                    sx={{
                      backgroundColor: isOutOfStock
                        ? 'rgba(254, 242, 242, 0.4)'
                        : isLowStock
                        ? 'rgba(254, 243, 199, 0.3)'
                        : 'inherit',
                      '&:hover': {
                        backgroundColor: '#F8FAFC !important',
                      },
                    }}
                  >
                    <TableCell sx={{ textAlign: 'center', fontWeight: 600, color: '#64748B', fontSize: '12.5px' }}>
                      {idx + 1}
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>
                        {item.name}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={item.category || 'General'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '11px',
                          backgroundColor: '#EEF2F6',
                          color: '#334155',
                          borderRadius: '6px',
                        }}
                      />
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '12px' }}>
                      {item.unit || 'Box'}
                    </TableCell>

                    <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                      ₹{item.rate.toFixed(2)}
                    </TableCell>

                    {/* Stock Count Pill */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8 }}>
                        <IconButton
                          size="small"
                          disabled={item.stock <= 0}
                          onClick={() => handleQuickDelta(item, -1)}
                          sx={{
                            p: 0.3,
                            backgroundColor: '#F1F5F9',
                            '&:hover': { backgroundColor: '#FEE2E2', color: '#DC2626' },
                          }}
                        >
                          <RemoveRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>

                        <Box
                          sx={{
                            minWidth: 42,
                            px: 1.2,
                            py: 0.3,
                            borderRadius: '12px',
                            backgroundColor: isOutOfStock ? '#FEE2E2' : isLowStock ? '#FEF3C7' : '#DCFCE7',
                            color: isOutOfStock ? '#991B1B' : isLowStock ? '#92400E' : '#166534',
                            fontWeight: 800,
                            fontSize: '13.5px',
                            textAlign: 'center',
                          }}
                        >
                          {item.stock}
                        </Box>

                        <IconButton
                          size="small"
                          onClick={() => handleQuickDelta(item, 1)}
                          sx={{
                            p: 0.3,
                            backgroundColor: '#F1F5F9',
                            '&:hover': { backgroundColor: '#DCFCE7', color: '#16A34A' },
                          }}
                        >
                          <AddRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center', fontWeight: 600, color: '#64748B', fontSize: '12.5px' }}>
                      {item.minStock} {item.unit}
                    </TableCell>

                    <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                      ₹{item.stockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      {isOutOfStock ? (
                        <Chip
                          icon={<CancelOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                          label="Out of Stock"
                          size="small"
                          sx={{
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            fontWeight: 700,
                            fontSize: '11px',
                            borderRadius: '8px',
                          }}
                        />
                      ) : isLowStock ? (
                        <Chip
                          icon={<WarningAmberRoundedIcon sx={{ fontSize: '14px !important' }} />}
                          label="Low Stock"
                          size="small"
                          sx={{
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontWeight: 700,
                            fontSize: '11px',
                            borderRadius: '8px',
                          }}
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: '14px !important' }} />}
                          label="In Stock"
                          size="small"
                          sx={{
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            fontWeight: 700,
                            fontSize: '11px',
                            borderRadius: '8px',
                          }}
                        />
                      )}
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Stock Adjustment & Min Threshold">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenAdjust(item)}
                            sx={{
                              color: '#990000',
                              backgroundColor: '#FFF1F2',
                              borderRadius: 1.5,
                              p: 0.7,
                              '&:hover': { backgroundColor: '#FFE4E6' },
                            }}
                          >
                            <TuneRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="View Stock Movement Audit History">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenHistoryFor(item)}
                            sx={{
                              color: '#475569',
                              backgroundColor: '#F1F5F9',
                              borderRadius: 1.5,
                              p: 0.7,
                              '&:hover': { backgroundColor: '#E2E8F0', color: '#0F172A' },
                            }}
                          >
                            <HistoryRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ========================================================================= */}
      {/* 1. Add Stock (Inward / Purchase) Dialog Modal */}
      {/* ========================================================================= */}
      <Dialog
        open={inwardModalOpen}
        onClose={() => setInwardModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, border: '1.5px solid #F59E0B' },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #7F1D1D 0%, #990000 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1.8,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddRoundedIcon sx={{ color: '#FFD700' }} />
            <Typography sx={{ fontWeight: 800, fontSize: '17px' }}>
              Add Inward Stock (Purchase Entry)
            </Typography>
          </Box>
          <IconButton onClick={() => setInwardModalOpen(false)} sx={{ color: '#FFFFFF' }}>
            <CloseRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Item Selection Autocomplete */}
            <Autocomplete
              freeSolo
              options={allItemNames}
              value={inwardItemName}
              onInputChange={(_, newValue) => setInwardItemName(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select or Enter Product Name"
                  required
                  placeholder="e.g. 5 Pcs Deluxe Box"
                  fullWidth
                />
              )}
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Quantity Received (+)"
                  type="number"
                  required
                  value={inwardQty}
                  onChange={(e) => setInwardQty(e.target.value)}
                  fullWidth
                  slotProps={{
                    htmlInput: { min: 1 },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Entry Date"
                  type="date"
                  value={inwardDate}
                  onChange={(e) => setInwardDate(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Invoice / Ref No (Optional)"
                  placeholder="e.g. PO-8492"
                  value={inwardRefNo}
                  onChange={(e) => setInwardRefNo(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Supplier / Vendor (Optional)"
                  placeholder="e.g. Sivakasi Fireworks Factory"
                  value={inwardVendor}
                  onChange={(e) => setInwardVendor(e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>

            <TextField
              label="Notes / Comments"
              placeholder="e.g. New fresh stock batch received in good condition"
              value={inwardNotes}
              onChange={(e) => setInwardNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setInwardModalOpen(false)} sx={{ color: '#64748B', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitInward}
            disabled={actionLoading}
            sx={{
              backgroundColor: '#990000',
              fontWeight: 800,
              borderRadius: 2,
              px: 3,
              '&:hover': { backgroundColor: '#7F1D1D' },
            }}
          >
            {actionLoading ? <CircularProgress size={22} sx={{ color: '#FFFFFF' }} /> : 'Add to Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* 2. Stock Adjustment / Override Dialog Modal */}
      {/* ========================================================================= */}
      <Dialog
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, border: '1.5px solid #990000' },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #7F1D1D 0%, #990000 100%)',
            color: '#FFFFFF',
            py: 1.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: '16px' }}>
            Stock Adjustment & Settings
          </Typography>
          <IconButton onClick={() => setAdjustModalOpen(false)} sx={{ color: '#FFFFFF' }}>
            <CloseRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, pb: 2 }}>
          {adjustTargetItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ p: 1.5, backgroundColor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                <Typography sx={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                  {adjustTargetItem.name}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.3 }}>
                  Category: {adjustTargetItem.category} • Current Stock: <strong style={{ color: '#990000' }}>{adjustTargetItem.stock} {adjustTargetItem.unit}</strong>
                </Typography>
              </Box>

              <FormControl fullWidth size="small">
                <Typography sx={{ fontSize: '12px', fontWeight: 700, mb: 0.5, color: '#334155' }}>
                  Action Type
                </Typography>
                <Select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="DIRECT_COUNT">Set Exact Physical Stock Count</MenuItem>
                  <MenuItem value="STOCK_IN">Add Extra Stock (+ Inward)</MenuItem>
                  <MenuItem value="STOCK_OUT">Deduct Stock (- Damage / Loss)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label={
                  adjustType === 'DIRECT_COUNT'
                    ? 'New Exact Stock Count'
                    : adjustType === 'STOCK_IN'
                    ? 'Quantity to Add (+)'
                    : 'Quantity to Deduct (-)'
                }
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                fullWidth
              />

              <TextField
                label="Low Stock Alert Threshold (Min Stock)"
                type="number"
                value={adjustMinStock}
                onChange={(e) => setAdjustMinStock(e.target.value)}
                helperText="System alerts when stock is equal to or below this level"
                fullWidth
              />

              <TextField
                label="Adjustment Reason / Note"
                placeholder="e.g. Physical inventory check correction"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                multiline
                rows={2}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setAdjustModalOpen(false)} sx={{ color: '#64748B', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitAdjust}
            disabled={actionLoading}
            sx={{
              backgroundColor: '#990000',
              fontWeight: 800,
              borderRadius: 2,
              px: 2.5,
              '&:hover': { backgroundColor: '#7F1D1D' },
            }}
          >
            {actionLoading ? <CircularProgress size={20} sx={{ color: '#FFFFFF' }} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* 3. Stock Movement Audit History Drawer */}
      {/* ========================================================================= */}
      <Drawer
        anchor="right"
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 550, md: 650 },
              p: 0,
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            p: 2.5,
            background: 'linear-gradient(135deg, #7F1D1D 0%, #990000 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryRoundedIcon sx={{ color: '#FFD700', fontSize: 24 }} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '17px' }}>
                Stock Movement Audit Trail
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#FEF3C7' }}>
                Full record of bill deductions, inward purchases & manual adjustments
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setHistoryDrawerOpen(false)} sx={{ color: '#FFFFFF' }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        {/* Drawer Filters */}
        <Box sx={{ p: 2, backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Filter by Item Name..."
            value={historyItemFilter}
            onChange={(e) => setHistoryItemFilter(e.target.value)}
            sx={{ flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 2 }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={historyTypeFilter}
              onChange={(e) => {
                setHistoryTypeFilter(e.target.value);
                fetchHistory();
              }}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: 2, fontSize: '12px' }}
            >
              <MenuItem value="ALL">All Types</MenuItem>
              <MenuItem value="BILL_OUT">Bill Deductions</MenuItem>
              <MenuItem value="STOCK_IN">Inward Purchases</MenuItem>
              <MenuItem value="BILL_EDIT">Bill Edits</MenuItem>
              <MenuItem value="BILL_DELETE_RESTORE">Cancelled Restores</MenuItem>
              <MenuItem value="ADJUSTMENT">Adjustments</MenuItem>
            </Select>
          </FormControl>

          <IconButton
            onClick={() => fetchHistory()}
            sx={{ backgroundColor: '#990000', color: '#FFFFFF', borderRadius: 2, '&:hover': { backgroundColor: '#7F1D1D' } }}
          >
            <RefreshRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Drawer Content */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          {historyLoading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress size={32} sx={{ color: '#990000', mb: 1 }} />
              <Typography sx={{ fontSize: '13px', color: '#64748B' }}>Loading audit log...</Typography>
            </Box>
          ) : historyLogs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <HistoryRoundedIcon sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                No stock movement logs found
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {historyLogs.map((log) => {
                const isDeduct = log.quantity < 0;
                const isBill = log.changeType === 'BILL_OUT';
                const isRestore = log.changeType === 'BILL_DELETE_RESTORE';

                return (
                  <Paper
                    key={log._id}
                    elevation={0}
                    sx={{
                      p: 1.8,
                      borderRadius: 2.5,
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      borderLeft: `4px solid ${
                        isBill ? '#DC2626' : isRestore ? '#2563EB' : isDeduct ? '#D97706' : '#16A34A'
                      }`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                          {log.itemName}
                        </Typography>
                        <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                          {log.date} • {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: '15px',
                            color: isDeduct ? '#DC2626' : '#16A34A',
                          }}
                        >
                          {log.quantity > 0 ? `+${log.quantity}` : log.quantity} {log.unit || 'Box'}
                        </Typography>
                        <Typography sx={{ fontSize: '10.5px', color: '#64748B' }}>
                          {log.previousStock} ➔ <strong>{log.newStock}</strong>
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 0.8, borderColor: '#F1F5F9' }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        label={
                          log.changeType === 'BILL_OUT'
                            ? `Bill Deduct ${log.referenceNo}`
                            : log.changeType === 'BILL_DELETE_RESTORE'
                            ? `Bill Cancelled ${log.referenceNo}`
                            : log.changeType === 'BILL_EDIT'
                            ? `Bill Edit ${log.referenceNo}`
                            : log.changeType === 'STOCK_IN'
                            ? 'Inward Purchase'
                            : 'Stock Adjustment'
                        }
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '10.5px',
                          backgroundColor: isBill ? '#FEE2E2' : isRestore ? '#EFF6FF' : isDeduct ? '#FEF3C7' : '#DCFCE7',
                          color: isBill ? '#991B1B' : isRestore ? '#1D4ED8' : isDeduct ? '#92400E' : '#166534',
                        }}
                      />

                      {log.customerOrVendor && (
                        <Typography sx={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                          {log.customerOrVendor}
                        </Typography>
                      )}
                    </Box>

                    {log.notes && (
                      <Typography sx={{ fontSize: '11px', color: '#64748B', mt: 0.6, fontStyle: 'italic' }}>
                        "{log.notes}"
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};
