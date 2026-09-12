import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Grid,
  Divider,
  InputBase,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
  CustomersApi,
  CompaniesApi,
  ProductsApi,
  PriceListsApi,
  ParticularsApi,
} from '../services/api';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';

interface ProductRowItem {
  id: string;
  particular: string;
  quantity: string;
  rate: string;
  pktUnit: string;
  amount: string;
}

interface ProductCatalogOption {
  id: string;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  unit?: string;
}

interface ParticularsPageProps {
  initialCustomerName?: string;
}

export const ParticularsPage: FC<ParticularsPageProps> = ({ initialCustomerName }) => {
  // Dropdown options
  const [customerOptions, setCustomerOptions] = useState<{ id: string; name: string }[]>([]);
  const [companyOptions, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [productOptions, setProductOptions] = useState<ProductCatalogOption[]>([]);

  // Bill Form State
  const [customerName, setCustomerName] = useState<string>(() => {
    return initialCustomerName || localStorage.getItem('dheeksha_active_customer') || '';
  });
  const [company, setCompany] = useState<string>('Dheeksha Trade');
  const [billNo, setBillNo] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(() => {
    const today = new Date();
    return today.toLocaleDateString('en-GB').replace(/\//g, '-');
  });
  const [discount, setDiscount] = useState<string>('0');
  const [transport, setTransport] = useState<string>('0');
  const [packing, setPacking] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');

  // Product Entry Form State
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [rate, setRate] = useState<string>('0');
  const [unit, setUnit] = useState<string>('Box');
  const [productRows, setProductRows] = useState<ProductRowItem[]>([]);
  const [savingBill, setSavingBill] = useState<boolean>(false);

  // Recent Bills State
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(true);
  const [billSearchTerm, setBillSearchTerm] = useState<string>('');

  // Print Preview Modal State
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

  // Load Dropdown Options (Customers, Companies, Unified Products & Price List)
  const loadOptions = async () => {
    try {
      const [custRes, compRes, prodRes, priceRes] = await Promise.all([
        CustomersApi.getAll().catch(() => []),
        CompaniesApi.getAll().catch(() => []),
        ProductsApi.getAll().catch(() => []),
        PriceListsApi.getAll().catch(() => []),
      ]);

      if (Array.isArray(custRes) && custRes.length > 0) {
        const mapped = custRes.map((c: any) => ({ id: c._id || c.id, name: c.name }));
        setCustomerOptions(mapped);
        if (!customerName && mapped.length > 0) {
          setCustomerName(mapped[0].name);
        }
      }

      if (Array.isArray(compRes) && compRes.length > 0) {
        const mapped = compRes.map((c: any) => ({ id: c._id || c.id, name: c.name }));
        setCompanyOptions(mapped);
        if (mapped.length > 0 && !company) {
          setCompany(mapped[0].name);
        }
      }

      // Merge Products & Price List
      const prodMap = new Map<string, ProductCatalogOption>();

      if (Array.isArray(prodRes)) {
        prodRes.forEach((p: any) => {
          const key = (p.name || '').trim();
          if (key) {
            prodMap.set(key.toLowerCase(), {
              id: p._id || p.id,
              name: key,
              category: p.category || 'General',
              rate: p.rate || 0,
              mrp: p.mrp || 0,
              unit: p.unit || 'Box',
            });
          }
        });
      }

      if (Array.isArray(priceRes)) {
        priceRes.forEach((item: any) => {
          const key = (item.itemName || '').trim();
          if (key) {
            const existing = prodMap.get(key.toLowerCase());
            prodMap.set(key.toLowerCase(), {
              id: item._id || item.id || existing?.id || key,
              name: key,
              category: item.category || existing?.category || 'General',
              rate: item.rate !== undefined && item.rate > 0 ? item.rate : (existing?.rate || 0),
              mrp: item.mrp !== undefined && item.mrp > 0 ? item.mrp : (existing?.mrp || 0),
              unit: item.unit || existing?.unit || 'Box',
            });
          }
        });
      }

      const mergedList = Array.from(prodMap.values());
      setProductOptions(mergedList);
      if (mergedList.length > 0 && !selectedProduct) {
        setSelectedProduct(mergedList[0].name);
        setRate(String(mergedList[0].rate || 0));
        setUnit(mergedList[0].unit || 'Box');
      }
    } catch (err) {
      console.error('Failed to load billing options:', err);
    }
  };

  // Fetch Next Bill Number
  const fetchNextBillNo = async () => {
    try {
      const res = await ParticularsApi.getNextBillNo();
      if (res?.nextBillNo) {
        setBillNo(res.nextBillNo);
      } else {
        setBillNo(`INV-${Date.now().toString().slice(-4)}`);
      }
    } catch {
      setBillNo(`INV-${Date.now().toString().slice(-4)}`);
    }
  };

  // Fetch Recent Bills
  const fetchRecentBills = async () => {
    try {
      setLoadingRecent(true);
      const bills = await ParticularsApi.getAll();
      setRecentBills(Array.isArray(bills) ? bills : []);
    } catch (err) {
      console.error('Failed to fetch recent bills:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    loadOptions();
    fetchNextBillNo();
    fetchRecentBills();
  }, []);

  // Update customer name if prop changes
  useEffect(() => {
    if (initialCustomerName) {
      setCustomerName(initialCustomerName);
    }
  }, [initialCustomerName]);

  // Add Product Item to Bill Row
  const handleAddProductItem = () => {
    if (!selectedProduct.trim()) {
      alert('Please select or enter a product name');
      return;
    }
    const qNum = parseFloat(quantity) || 1;
    const rNum = parseFloat(rate) || 0;
    const amt = (qNum * rNum).toFixed(2);

    const newRow: ProductRowItem = {
      id: `row-${Date.now()}-${Math.random()}`,
      particular: selectedProduct.trim(),
      quantity: String(qNum),
      rate: String(rNum),
      pktUnit: unit || 'Box',
      amount: amt,
    };

    setProductRows((prev) => [...prev, newRow]);
    setQuantity('1');
  };

  // Delete product row from current bill
  const handleDeleteRow = (id: string) => {
    setProductRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Bill Financial Totals Calculation
  const subtotal = useMemo(() => {
    return productRows.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);
  }, [productRows]);

  const discountAmount = useMemo(() => {
    const rawDisc = parseFloat(discount) || 0;
    if (rawDisc <= 0) return 0;
    if (rawDisc <= 100) {
      return (subtotal * rawDisc) / 100;
    }
    return rawDisc;
  }, [subtotal, discount]);

  const totalCases = useMemo(() => {
    return productRows.reduce((acc, row) => acc + (parseFloat(row.quantity) || 0), 0);
  }, [productRows]);

  const grandTotal = useMemo(() => {
    const transportAmt = parseFloat(transport) || 0;
    const packingAmt = parseFloat(packing) || 0;
    const taxPercent = parseFloat(tax) || 0;

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const withAdditions = afterDiscount + transportAmt + packingAmt;
    const taxAmt = taxPercent > 0 ? (withAdditions * taxPercent) / 100 : 0;
    return withAdditions + taxAmt;
  }, [subtotal, discountAmount, transport, packing, tax]);

  // Save Bill to DB
  const handleSaveBill = async (andPrint: boolean = false) => {
    if (!customerName.trim()) {
      alert('Please select or enter Customer Name');
      return;
    }
    if (productRows.length === 0) {
      alert('Please add at least one product item to the bill');
      return;
    }

    try {
      setSavingBill(true);
      const payload = {
        billNo: billNo.trim() || `INV-${Date.now().toString().slice(-4)}`,
        date: billDate,
        customerName: customerName.trim(),
        companyName: company || 'Dheeksha Trade',
        transport: transport || '0',
        caseCount: String(totalCases),
        discount: discount || '0',
        packing: packing || '0',
        tax: tax || '0',
        amount: String(subtotal.toFixed(2)),
        total: String(grandTotal.toFixed(2)),
        products: productRows.map((r) => ({
          particular: r.particular,
          quantity: r.quantity,
          rate: r.rate,
          pktUnit: r.pktUnit,
          amount: r.amount,
        })),
      };

      await ParticularsApi.create(payload);
      localStorage.setItem('dheeksha_active_customer', customerName.trim());

      if (andPrint) {
        const printData: BillPrintData = {
          billNo: payload.billNo,
          date: payload.date,
          customerName: payload.customerName,
          companyName: payload.companyName,
          transport: payload.transport,
          caseCount: payload.caseCount,
          discount: payload.discount,
          packing: payload.packing,
          tax: payload.tax,
          amount: payload.amount,
          total: payload.total,
          products: payload.products,
        };
        setSelectedBillForPrint(printData);
        setPrintModalOpen(true);
      }

      // Reset Bill Form & Reload Recent Bills
      setProductRows([]);
      setDiscount('0');
      setTransport('0');
      setPacking('0');
      setTax('0');
      fetchNextBillNo();
      fetchRecentBills();

      if (!andPrint) {
        alert(`Bill #${payload.billNo} saved successfully!`);
      }
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      alert(err.message || 'Error saving bill');
    } finally {
      setSavingBill(false);
    }
  };

  // Delete Recent Bill
  const handleDeleteRecentBill = async (bill: any) => {
    const id = bill._id || bill.id;
    if (!id) return;
    if (!window.confirm(`Delete Bill #${bill.billNo || ''} for ${bill.customerName}?`)) return;

    try {
      await ParticularsApi.delete(id);
      setRecentBills((prev) => prev.filter((b) => (b._id || b.id) !== id));
    } catch (err: any) {
      console.error('Failed to delete bill:', err);
      alert(err.message || 'Error deleting bill');
    }
  };

  // Open Print for Recent Bill
  const handlePrintRecentBill = (bill: any) => {
    const printData: BillPrintData = {
      billNo: bill.billNo || '',
      date: bill.date || '',
      customerName: bill.customerName || '',
      companyName: bill.companyName || 'Dheeksha Trade',
      transport: String(bill.transport || '0'),
      caseCount: String(bill.caseCount || '0'),
      discount: String(bill.discount || '0'),
      packing: String(bill.packing || '0'),
      tax: String(bill.tax || '0'),
      amount: String(bill.amount || bill.total || '0'),
      total: String(bill.total || '0'),
      products: (bill.products || []).map((p: any) => ({
        particular: p.particular || p.name || '',
        quantity: p.quantity || '0',
        rate: p.rate || '0',
        pktUnit: p.pktUnit || 'Box',
        amount: p.amount || '0',
      })),
    };
    setSelectedBillForPrint(printData);
    setPrintModalOpen(true);
  };

  // Filtered recent bills
  const filteredRecentBills = useMemo(() => {
    if (!billSearchTerm.trim()) return recentBills;
    const term = billSearchTerm.toLowerCase().trim();
    return recentBills.filter(
      (b) =>
        (b.billNo && b.billNo.toLowerCase().includes(term)) ||
        (b.customerName && b.customerName.toLowerCase().includes(term)) ||
        (b.companyName && b.companyName.toLowerCase().includes(term)) ||
        (b.date && b.date.toLowerCase().includes(term))
    );
  }, [recentBills, billSearchTerm]);

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        boxSizing: 'border-box',
      }}
    >
      {/* Top Banner Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#B91C1C', letterSpacing: '-0.02em' }}>
            New Invoice & Billing
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#786C58', fontWeight: 500 }}>
            Create and print customer bills instantly with auto-populated price list rates.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={<ReceiptLongRoundedIcon sx={{ color: '#92400E !important' }} />}
            label={`Total Bills: ${recentBills.length}`}
            sx={{ backgroundColor: '#FFFBEB', color: '#92400E', fontWeight: 700, border: '1px solid #FDE68A' }}
          />
        </Box>
      </Box>

      {/* Main Two-Column Grid: Create Bill Form + Items Table */}
      <Grid container spacing={2.5}>
        {/* Left Column: Customer & Invoice Details */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: '14px',
              border: '1.5px solid #FDE68A',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 20px -2px rgba(217, 119, 6, 0.08)',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#B91C1C', mb: 2 }}>
              1. Invoice Information
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Customer Selector */}
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                  Customer Name *
                </Typography>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={customerOptions.map((c) => c.name)}
                  value={customerName}
                  onInputChange={(_, val) => setCustomerName(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select or enter customer name..."
                      slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
                    />
                  )}
                />
              </Box>

              {/* Company / Supplier */}
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                  Billed By (Company)
                </Typography>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={companyOptions.map((c) => c.name)}
                  value={company}
                  onInputChange={(_, val) => setCompany(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="e.g. Dheeksha Trade..."
                      slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
                    />
                  )}
                />
              </Box>

              {/* Bill No & Date in single row */}
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                    Bill / Inv No
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 700, color: '#B91C1C' } } }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                    Bill Date
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '13px', fontWeight: 600 } } }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 0.5, borderColor: '#FEF3C7' }} />

              {/* Additional Adjustments: Discount, Transport, Packing, Tax */}
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#78350F' }}>
                Adjustments & Charges
              </Typography>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.4 }}>
                    Discount (% or ₹)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '13px', fontWeight: 600 } } }}
                  />
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.4 }}>
                    Transport (₹)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '13px', fontWeight: 600 } } }}
                  />
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.4 }}>
                    Packing (₹)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={packing}
                    onChange={(e) => setPacking(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '13px', fontWeight: 600 } } }}
                  />
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.4 }}>
                    Tax / GST (%)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '13px', fontWeight: 600 } } }}
                  />
                </Grid>
              </Grid>

              {/* Summary Total Card */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  backgroundColor: '#FFFBEB',
                  border: '1.5px solid #FDE68A',
                  mt: 1,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '13px', color: '#786C58', fontWeight: 600 }}>Subtotal:</Typography>
                  <Typography sx={{ fontSize: '13px', color: '#1F1714', fontWeight: 700 }}>
                    ₹{subtotal.toFixed(2)}
                  </Typography>
                </Box>
                {discountAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>Discount:</Typography>
                    <Typography sx={{ fontSize: '13px', color: '#059669', fontWeight: 700 }}>
                      -₹{discountAmount.toFixed(2)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1, borderColor: '#FDE68A' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#991B1B' }}>
                    Grand Total:
                  </Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 900, color: '#B91C1C' }}>
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>

              {/* Save & Print Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => handleSaveBill(false)}
                  disabled={savingBill || productRows.length === 0}
                  sx={{
                    borderColor: '#F59E0B',
                    color: '#92400E',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 1,
                    borderRadius: '8px',
                    '&:hover': { borderColor: '#B45309', backgroundColor: '#FFFBEB' },
                  }}
                >
                  Save Bill
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  disableElevation
                  onClick={() => handleSaveBill(true)}
                  disabled={savingBill || productRows.length === 0}
                  startIcon={savingBill ? <CircularProgress size={16} color="inherit" /> : <PrintOutlinedIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    textTransform: 'none',
                    py: 1,
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                    '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
                  }}
                >
                  Save & Print
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column: Product Selector & Current Bill Table */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: '14px',
              border: '1.5px solid #FDE68A',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 20px -2px rgba(217, 119, 6, 0.08)',
              overflow: 'hidden',
              mb: 3,
            }}
          >
            {/* Top Product Entry Bar */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                borderBottom: '2px solid #F59E0B',
                p: 2,
                px: { xs: 2, sm: 2.5 },
                color: '#FFFFFF',
              }}
            >
              <Typography sx={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em', mb: 1.5 }}>
                2. Add Products from Price List
              </Typography>

              {/* Product Selection + Qty + Rate + Add Row */}
              <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
                {/* Autocomplete Product Dropdown */}
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Autocomplete
                    size="small"
                    autoHighlight
                    options={productOptions}
                    getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
                    isOptionEqualToValue={(option, val) => option.id === val.id || option.name === val.name}
                    value={productOptions.find((p) => p.name === selectedProduct) || null}
                    onChange={(_, val) => {
                      if (val) {
                        setSelectedProduct(val.name);
                        if (val.rate !== undefined && val.rate > 0) {
                          setRate(String(val.rate));
                        }
                        if (val.unit) {
                          setUnit(val.unit);
                        }
                      } else {
                        setSelectedProduct('');
                      }
                    }}
                    renderOption={(props, option) => (
                      <Box
                        component="li"
                        {...props}
                        key={option.id || option.name}
                        sx={{
                          display: 'flex !important',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                          py: 0.8,
                          px: 1.5,
                          gap: 1,
                          borderBottom: '1px solid #FEF3C7',
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714' }}>
                            {option.name}
                          </Typography>
                          {option.category && (
                            <Typography sx={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                              {option.category}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          {option.rate !== undefined && option.rate > 0 && (
                            <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C' }}>
                              ₹{Number(option.rate).toLocaleString('en-IN')}
                            </Typography>
                          )}
                          {option.unit && (
                            <Typography sx={{ fontSize: '10.5px', color: '#6B7280' }}>
                              / {option.unit}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search product from price list..."
                        sx={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '6px',
                          '& .MuiOutlinedInput-root': {
                            fontSize: '13px',
                            fontWeight: 600,
                          },
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Quantity */}
                <Grid size={{ xs: 4, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Qty"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      '& .MuiOutlinedInput-root': { fontSize: '13px', fontWeight: 600 },
                    }}
                  />
                </Grid>

                {/* Rate */}
                <Grid size={{ xs: 4, sm: 2.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Rate (₹)"
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      '& .MuiOutlinedInput-root': { fontSize: '13px', fontWeight: 800, color: '#B91C1C' },
                    }}
                  />
                </Grid>

                {/* Add Item Button */}
                <Grid size={{ xs: 4, sm: 2.5 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    disableElevation
                    onClick={handleAddProductItem}
                    startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      color: '#B91C1C',
                      border: '1.5px solid #FDE68A',
                      fontWeight: 800,
                      fontSize: '13px',
                      textTransform: 'none',
                      height: '38px',
                      borderRadius: '6px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      '&:hover': { backgroundColor: '#FFFBEB' },
                    }}
                  >
                    Add Item
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Current Bill Items Table */}
            <TableContainer sx={{ minHeight: '260px', maxHeight: '380px' }}>
              <Table stickyHeader size="small" aria-label="bill items table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#FFFBEB' }}>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', width: '50px', backgroundColor: '#FFFBEB' }}>
                      #
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                      PRODUCT / PARTICULAR
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', width: '80px', backgroundColor: '#FFFBEB' }}>
                      UNIT
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', width: '80px', backgroundColor: '#FFFBEB' }}>
                      QTY
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', width: '100px', backgroundColor: '#FFFBEB' }}>
                      RATE (₹)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', width: '110px', backgroundColor: '#FFFBEB' }}>
                      AMOUNT (₹)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', width: '60px', backgroundColor: '#FFFBEB' }}>
                      ACTION
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9CA3AF' }}>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#786C58' }}>
                          No products added to this invoice yet.
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#A8998A' }}>
                          Select a product from the top bar and click "Add Item" to build the bill.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    productRows.map((row, idx) => (
                      <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FEFDF5' } }}>
                        <TableCell sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58' }}>
                          {idx + 1}
                        </TableCell>
                        <TableCell sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714' }}>
                          {row.particular}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: '12px', color: '#57463A' }}>
                          {row.pktUnit}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: '13.5px', fontWeight: 700 }}>
                          {row.quantity}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '13.5px', fontWeight: 700, color: '#78350F' }}>
                          ₹{Number(row.rate || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '14px', fontWeight: 800, color: '#B91C1C' }}>
                          ₹{Number(row.amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRow(row.id)}
                            sx={{ color: '#DC2626', p: 0.5, '&:hover': { backgroundColor: '#FEF2F2' } }}
                          >
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Bills Section */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          borderRadius: '14px',
          border: '1.5px solid #FDE68A',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 20px -2px rgba(217, 119, 6, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Recent Bills Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            borderBottom: '2px solid #F59E0B',
            px: { xs: 2, sm: 3 },
            py: 1.5,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            minHeight: '56px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ color: '#FFFFFF', fontSize: '17px', fontWeight: 800 }}>
              Recent Bills & Invoices
            </Typography>
            <Typography
              sx={{
                color: '#FEF08A',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: 'rgba(254, 240, 138, 0.2)',
                px: 1.2,
                py: 0.2,
                borderRadius: '10px',
              }}
            >
              {filteredRecentBills.length} bills
            </Typography>
          </Box>

          {/* Search Box & Refresh */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                px: 1.2,
                height: '36px',
                width: { xs: '100%', sm: '220px' },
                border: '1.5px solid #FDE68A',
              }}
            >
              <SearchRoundedIcon sx={{ color: '#D97706', fontSize: 18, mr: 0.8 }} />
              <InputBase
                placeholder="Search bills..."
                value={billSearchTerm}
                onChange={(e) => setBillSearchTerm(e.target.value)}
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  width: '100%',
                  '& input': { p: 0, '&::placeholder': { color: '#A8998A' } },
                }}
              />
              {billSearchTerm && (
                <IconButton size="small" onClick={() => setBillSearchTerm('')} sx={{ p: 0.3 }}>
                  <ClearRoundedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              )}
            </Box>

            <Button
              variant="contained"
              size="small"
              onClick={fetchRecentBills}
              startIcon={<RefreshRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                border: '1px solid rgba(254, 240, 138, 0.4)',
                fontWeight: 700,
                textTransform: 'none',
                height: '36px',
                borderRadius: '8px',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Recent Bills Table */}
        <TableContainer sx={{ maxHeight: '420px' }}>
          <Table stickyHeader sx={{ width: '100%' }} aria-label="recent bills table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#FFFBEB' }}>
                <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '110px' }}>
                  BILL NO
                </TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '110px' }}>
                  DATE
                </TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                  CUSTOMER NAME
                </TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                  COMPANY
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '90px' }}>
                  ITEMS
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '130px' }}>
                  TOTAL AMOUNT (₹)
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '130px' }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingRecent ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                  </TableCell>
                </TableRow>
              ) : filteredRecentBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#786C58' }}>
                    {billSearchTerm ? `No bills matching "${billSearchTerm}" found.` : 'No bills created yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecentBills.map((bill, index) => {
                  const isLast = index === filteredRecentBills.length - 1;
                  const totalAmt = parseFloat(String(bill.total || bill.amount || '0').replace(/,/g, '')) || 0;
                  const prodCount = (bill.products || []).length;

                  return (
                    <TableRow key={bill._id || bill.id || index} sx={{ '&:hover': { backgroundColor: '#FEFDF5' } }}>
                      <TableCell sx={{ fontSize: '13.5px', fontWeight: 800, color: '#B91C1C', borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                        #{bill.billNo}
                      </TableCell>
                      <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#57463A', borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                        {bill.date}
                      </TableCell>
                      <TableCell sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714', borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                        {bill.customerName}
                      </TableCell>
                      <TableCell sx={{ fontSize: '13px', color: '#786C58', borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                        {bill.companyName || 'Dheeksha Trade'}
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                        <Chip
                          label={`${prodCount} ${prodCount === 1 ? 'item' : 'items'}`}
                          size="small"
                          sx={{ fontSize: '11.5px', fontWeight: 700, backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '14.5px', fontWeight: 800, color: '#B91C1C', borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                        ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          {/* Print Invoice */}
                          <Tooltip title="Print / View Invoice" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handlePrintRecentBill(bill)}
                              sx={{
                                color: '#D97706',
                                backgroundColor: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                borderRadius: '6px',
                                p: 0.6,
                                '&:hover': { color: '#FFFFFF', backgroundColor: '#D97706' },
                              }}
                            >
                              <PrintOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>

                          {/* Delete Bill */}
                          <Tooltip title="Delete Bill" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteRecentBill(bill)}
                              sx={{
                                color: '#DC2626',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '6px',
                                p: 0.6,
                                '&:hover': { color: '#FFFFFF', backgroundColor: '#DC2626' },
                              }}
                            >
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
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
      </Paper>

      {/* Print Bill Modal */}
      {printModalOpen && selectedBillForPrint && (
        <BillPrintModal
          open={printModalOpen}
          onClose={() => {
            setPrintModalOpen(false);
            setSelectedBillForPrint(null);
          }}
          bill={selectedBillForPrint}
        />
      )}
    </Box>
  );
};
