import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  InputBase,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import { CustomersApi, ParticularsApi } from '../services/api';
import { printCustomerListDirectly } from '../utils/printUtils';
import { DateRangePrintModal } from './DateRangePrintModal';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';
import { getStoredSettings } from './SettingsPage';

export interface CustomerItem {
  _id?: string;
  id?: string;
  idCode?: string;
  name: string;
  avatarLetter?: string;
  avatarBg?: string;
  avatarColor?: string;
  address: string;
  mobile: string;
  gst: string;
}

interface AllCustomersPageProps {
  onAddNewCustomer?: () => void;
  onSelectCustomerForParticular?: (customerName: string, subTab?: 'Account Details' | 'Create Particular') => void;
  onEditBill?: (bill: any) => void;
}

export const AllCustomersPage: FC<AllCustomersPageProps> = ({
  onAddNewCustomer,
  onSelectCustomerForParticular,
  onEditBill,
}) => {
  const [storeSettings, setStoreSettings] = useState(() => getStoredSettings());
  const [activeView, setActiveView] = useState<'customers' | 'bills'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Customer Dialog State
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    gst: '',
    address: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Date Range Print Modal State
  const [openDatePrintModal, setOpenDatePrintModal] = useState(false);

  // Recent Bills State
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [loadingRecentBills, setLoadingRecentBills] = useState<boolean>(true);
  const [billSearchTerm, setBillSearchTerm] = useState<string>('');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('ALL');
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

  // Unique Customer Names for Filtering Bills
  const uniqueCustomerNames = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.name && c.name.trim()) set.add(c.name.trim());
    });
    recentBills.forEach((b) => {
      const name = (b.customerName || b.customer || '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customers, recentBills]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await CustomersApi.getAll();
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentBills = async () => {
    try {
      setLoadingRecentBills(true);
      const bills = await ParticularsApi.getAll();
      setRecentBills(Array.isArray(bills) ? bills : []);
    } catch (err) {
      console.error('Failed to fetch recent bills:', err);
    } finally {
      setLoadingRecentBills(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchRecentBills();

    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    window.addEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const handleOpenEdit = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name || '',
      mobile: customer.mobile || '',
      gst: customer.gst || '',
      address: customer.address || '',
    });
    setOpenEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    const id = editingCustomer._id || editingCustomer.id;
    if (!id) return;

    if (!editFormData.name.trim() || !editFormData.address.trim()) {
      alert('Please fill in Customer Name and Address');
      return;
    }

    try {
      setEditLoading(true);
      await CustomersApi.update(id, {
        name: editFormData.name.trim(),
        mobile: editFormData.mobile.trim() || 'N/A',
        gst: editFormData.gst.trim() || 'N/A',
        address: editFormData.address.trim(),
        avatarLetter: editFormData.name.trim().charAt(0).toUpperCase(),
      });
      setOpenEditModal(false);
      await fetchCustomers();
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      alert(err.message || 'Error updating customer');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"? This will delete all associated records.`)) return;

    try {
      await CustomersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== id));
      await fetchRecentBills();
      window.dispatchEvent(new Event('dheeksha_bills_updated'));
      window.dispatchEvent(new Event('dheeksha_customers_updated'));
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      alert(err.message || 'Error deleting customer');
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
      await fetchCustomers();
      window.dispatchEvent(new Event('dheeksha_bills_updated'));
    } catch (err: any) {
      console.error('Failed to delete bill:', err);
      alert(err.message || 'Error deleting bill');
    }
  };

  // Open Print for Recent Bill
  const handlePrintRecentBill = (bill: any) => {
    const matchedCust = customers.find(
      (c) => (c.name || '').trim().toLowerCase() === (bill.customerName || '').trim().toLowerCase()
    );

    const printData: BillPrintData = {
      billNo: bill.billNo || '',
      date: bill.date || '',
      customerName: bill.customerName || '',
      customerPhone: bill.customerPhone && bill.customerPhone !== '-' ? bill.customerPhone : (matchedCust?.mobile || (matchedCust as any)?.phone || ''),
      customerAddress: bill.customerAddress && bill.customerAddress !== '-' ? bill.customerAddress : (matchedCust?.address || ''),
      customerGst: bill.customerGst && bill.customerGst !== '-' && bill.customerGst !== 'N/A' ? bill.customerGst : (matchedCust?.gst || ''),
      companyName:
        bill.companyName && bill.companyName.trim() !== '' && bill.companyName !== 'General'
          ? bill.companyName
          : storeSettings.companyName || 'NARENDIRAA ENTERPRISES',
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
      pdfData: bill.pdfData || bill.pdfUrl || '',
    };
    setSelectedBillForPrint(printData);
    setPrintModalOpen(true);
  };

  // Filtering Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        (c.address && c.address.toLowerCase().includes(term)) ||
        (c.gst && c.gst.toLowerCase().includes(term)) ||
        (c.mobile && c.mobile.includes(term)) ||
        (c.idCode && c.idCode.toLowerCase().includes(term))
      );
    });
  }, [customers, searchTerm]);

  // Filtered recent bills by Selected Customer and/or Search Term (including product particulars)
  const filteredRecentBills = useMemo(() => {
    return recentBills.filter((b) => {
      // 1. Customer Dropdown Filter
      if (selectedCustomerFilter && selectedCustomerFilter !== 'ALL') {
        const billCust = (b.customerName || b.customer || '').trim().toLowerCase();
        const targetCust = selectedCustomerFilter.trim().toLowerCase();
        if (billCust !== targetCust) {
          return false;
        }
      }

      // 2. Search Term Filter across Bill No, Customer Name, Company, Date, Phone, and Product Particulars
      if (billSearchTerm.trim()) {
        const term = billSearchTerm.toLowerCase().trim();
        const billNo = String(b.billNo || '').toLowerCase();
        const customerName = String(b.customerName || b.customer || '').toLowerCase();
        const companyName = String(b.companyName || '').toLowerCase();
        const date = String(b.date || '').toLowerCase();
        const phone = String(b.customerPhone || b.phone || '').toLowerCase();

        const matchesMain =
          billNo.includes(term) ||
          customerName.includes(term) ||
          companyName.includes(term) ||
          date.includes(term) ||
          phone.includes(term);

        const matchesProducts =
          Array.isArray(b.products) &&
          b.products.some((p: any) => {
            const particular = String(p.particular || p.name || '').toLowerCase();
            const pktUnit = String(p.pktUnit || p.unit || '').toLowerCase();
            const rate = String(p.rate || '');
            const qty = String(p.quantity || '');
            const amount = String(p.amount || '');
            return (
              particular.includes(term) ||
              pktUnit.includes(term) ||
              rate.includes(term) ||
              qty.includes(term) ||
              amount.includes(term)
            );
          });

        if (!matchesMain && !matchesProducts) {
          return false;
        }
      }

      return true;
    });
  }, [recentBills, selectedCustomerFilter, billSearchTerm]);

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.5, md: 3.5 },
        boxSizing: 'border-box',
      }}
    >
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '24px', sm: '28px', md: '30px' },
                fontWeight: 800,
                color: '#B91C1C',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              All Customers & Invoices Directory
            </Typography>
            <Chip
              label={`${customers.length} Customers`}
              size="small"
              sx={{
                backgroundColor: '#FFFBEB',
                color: '#92400E',
                fontWeight: 800,
                border: '1px solid #FDE68A',
              }}
            />
          </Box>
          <Typography sx={{ fontSize: '13.5px', color: '#786C58', mt: 0.5, fontWeight: 600 }}>
            Directory of all registered customers, contact numbers, and recent invoices history.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            width: { xs: '100%', md: 'auto' },
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1.5px solid #FDE68A',
              px: 1.5,
              height: '40px',
              width: { xs: '100%', sm: '280px' },
              boxSizing: 'border-box',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#F59E0B',
              },
              '&:focus-within': {
                borderColor: '#DC2626',
                boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)',
              },
            }}
          >
            <SearchRoundedIcon
              sx={{
                color: '#D97706',
                fontSize: 20,
                mr: 1,
              }}
            />
            <InputBase
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#1F1714',
                width: '100%',
                '& input': {
                  p: 0,
                  '&::placeholder': {
                    color: '#A8998A',
                    opacity: 1,
                  },
                },
              }}
            />
          </Box>

          {/* Print Customers Report Button */}
          <Button
            variant="outlined"
            onClick={() => setOpenDatePrintModal(true)}
            startIcon={<PrintOutlinedIcon sx={{ fontSize: 19 }} />}
            sx={{
              backgroundColor: '#FFFFFF',
              color: '#7C2D12',
              borderColor: '#FCD34D',
              borderWidth: '1.5px',
              height: '40px',
              px: 2,
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(217, 119, 6, 0.08)',
              '&:hover': {
                backgroundColor: '#FFFBEB',
                borderColor: '#F59E0B',
              },
            }}
          >
            Print Report ({filteredCustomers.length})
          </Button>

          {/* Add New Customer Button */}
          {onAddNewCustomer && (
            <Button
              variant="contained"
              disableElevation
              onClick={onAddNewCustomer}
              startIcon={<AddRoundedIcon sx={{ fontSize: 20 }} />}
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                border: '1px solid #F59E0B',
                height: '40px',
                px: 2.4,
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 700,
                textTransform: 'none',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                },
              }}
            >
              Add Customer
            </Button>
          )}
        </Box>
      </Box>

      {/* View Switcher Tabs: Customers Directory vs Bills & Invoices */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 2.5,
          borderBottom: '2px solid #FDE68A',
          pb: 1.2,
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant={activeView === 'customers' ? 'contained' : 'outlined'}
          disableElevation
          onClick={() => setActiveView('customers')}
          startIcon={<PeopleAltRoundedIcon sx={{ fontSize: 18 }} />}
          sx={{
            fontWeight: 800,
            fontSize: '13.5px',
            textTransform: 'none',
            borderRadius: '8px',
            px: 2.5,
            py: 0.8,
            backgroundColor: activeView === 'customers' ? '#B91C1C' : '#FFFFFF',
            color: activeView === 'customers' ? '#FFFFFF' : '#78350F',
            borderColor: activeView === 'customers' ? '#991B1B' : '#FDE68A',
            boxShadow: activeView === 'customers' ? '0 2px 8px rgba(185, 28, 28, 0.25)' : 'none',
            '&:hover': {
              backgroundColor: activeView === 'customers' ? '#991B1B' : '#FEF3C7',
            },
          }}
        >
          Customers Directory ({customers.length})
        </Button>

        <Button
          variant={activeView === 'bills' ? 'contained' : 'outlined'}
          disableElevation
          onClick={() => setActiveView('bills')}
          startIcon={<ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />}
          sx={{
            fontWeight: 800,
            fontSize: '13.5px',
            textTransform: 'none',
            borderRadius: '8px',
            px: 2.5,
            py: 0.8,
            backgroundColor: activeView === 'bills' ? '#B91C1C' : '#FFFFFF',
            color: activeView === 'bills' ? '#FFFFFF' : '#78350F',
            borderColor: activeView === 'bills' ? '#991B1B' : '#FDE68A',
            boxShadow: activeView === 'bills' ? '0 2px 8px rgba(185, 28, 28, 0.25)' : 'none',
            '&:hover': {
              backgroundColor: activeView === 'bills' ? '#991B1B' : '#FEF3C7',
            },
          }}
        >
          Bills & Invoices ({recentBills.length})
        </Button>
      </Box>

      {/* Overview Metric Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '12px',
          border: '1.5px solid #FDE68A',
          backgroundColor: '#FFFBEB',
          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: '#FEF3C7',
              color: '#B91C1C',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PeopleAltRoundedIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58' }}>
              Total Registered Customers
            </Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 900, color: '#B91C1C', lineHeight: 1.2, mt: 0.2 }}>
              {customers.length}
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ fontSize: '12.5px', color: '#786C58', fontWeight: 600 }}>
          Showing {filteredCustomers.length} of {customers.length} customer records
        </Typography>
      </Paper>

      {/* 1. Main Customers Table Card */}
      {activeView === 'customers' && (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: '12px',
              border: '1.5px solid #FDE68A',
              backgroundColor: '#FFFBEB',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  backgroundColor: '#FEF3C7',
                  color: '#B91C1C',
                  border: '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PeopleAltRoundedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#991B1B', lineHeight: 1.2 }}>
                  Customer Registry
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#786C58', fontWeight: 500, mt: 0.2 }}>
                  Manage client accounts, view statements, and access billing records.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setActiveView('bills')}
                startIcon={<ReceiptLongRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderColor: '#F59E0B',
                  color: '#92400E',
                  backgroundColor: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  textTransform: 'none',
                  borderRadius: '8px',
                  '&:hover': { backgroundColor: '#FEF3C7' },
                }}
              >
                View All Bills ({recentBills.length})
              </Button>
            </Box>
          </Paper>

          {/* Main Customers List Card */}
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1.5px solid #FDE68A',
              boxShadow: '0 4px 20px -2px rgba(217, 119, 6, 0.08)',
              overflow: 'hidden',
              mb: 3.5,
            }}
          >
            {/* Desktop View: Full Data Table */}
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table sx={{ width: '100%' }} aria-label="all customers table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#FFFBEB' }}>
                    <TableCell
                      sx={{
                        py: 1.8,
                        px: 2.5,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#7C2D12',
                        letterSpacing: '0.04em',
                        borderBottom: '2px solid #FDE68A',
                        width: '90px',
                      }}
                    >
                      ID CODE
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 1.8,
                        px: 2.5,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#7C2D12',
                        letterSpacing: '0.04em',
                        borderBottom: '2px solid #FDE68A',
                      }}
                    >
                      CUSTOMER NAME & CONTACT
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 1.8,
                        px: 2.5,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#7C2D12',
                        letterSpacing: '0.04em',
                        borderBottom: '2px solid #FDE68A',
                      }}
                    >
                      ADDRESS & GSTIN
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        py: 1.8,
                        px: 2.5,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#7C2D12',
                        letterSpacing: '0.04em',
                        borderBottom: '2px solid #FDE68A',
                        width: '280px',
                      }}
                    >
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: '#786C58' }}>
                        {searchTerm ? 'No customers match your search criteria.' : 'No customers found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer, index) => {
                      const isLast = index === filteredCustomers.length - 1;
                      const recordId = customer._id || customer.id || '';
                      const idDisplay = customer.idCode || `#${(index + 1).toString().padStart(4, '0')}`;
                      const avatarInitial = customer.avatarLetter || customer.name.charAt(0).toUpperCase();

                      return (
                        <TableRow
                          key={recordId || index}
                          sx={{
                            transition: 'background-color 0.15s ease',
                            '&:hover': {
                              backgroundColor: '#FEFDF5',
                            },
                          }}
                        >
                          {/* ID */}
                          <TableCell
                            sx={{
                              py: 1.8,
                              px: 2.5,
                              fontSize: '13px',
                              color: '#B91C1C',
                              fontWeight: 800,
                              borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                            }}
                          >
                            {idDisplay}
                          </TableCell>

                          {/* Customer Name & Mobile */}
                          <TableCell
                            sx={{
                              py: 1.8,
                              px: 2.5,
                              borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                            }}
                          >
                            <Box
                              onClick={() => onSelectCustomerForParticular?.(customer.name, 'Account Details')}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                cursor: 'pointer',
                              }}
                            >
                              <Box
                                sx={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: '50%',
                                  backgroundColor: customer.avatarBg || '#FEF3C7',
                                  color: customer.avatarColor || '#B91C1C',
                                  border: '1px solid #FDE68A',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {avatarInitial}
                              </Box>
                              <Box>
                                <Typography
                                  sx={{
                                    fontSize: '14.5px',
                                    fontWeight: 700,
                                    color: '#1F1714',
                                    letterSpacing: '-0.01em',
                                    '&:hover': {
                                      color: '#DC2626',
                                      textDecoration: 'underline',
                                    },
                                  }}
                                >
                                  {customer.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                                  <PhoneOutlinedIcon sx={{ fontSize: 13, color: '#D97706' }} />
                                  <Typography sx={{ fontSize: '12px', color: '#786C58', fontWeight: 600 }}>
                                    {customer.mobile || 'N/A'}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Address & GST */}
                          <TableCell
                            sx={{
                              py: 1.8,
                              px: 2.5,
                              fontSize: '13px',
                              color: '#334155',
                              fontWeight: 500,
                              borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.6 }}>
                              <LocationOnOutlinedIcon sx={{ fontSize: 15, color: '#64748B', mt: 0.2, flexShrink: 0 }} />
                              <Typography sx={{ fontSize: '13px', color: '#334155', fontWeight: 500, maxWidth: '320px' }}>
                                {customer.address || 'N/A'}
                              </Typography>
                            </Box>
                            {customer.gst && customer.gst !== 'N/A' && (
                              <Typography sx={{ fontSize: '11.5px', color: '#D97706', fontWeight: 700, mt: 0.4, pl: 2.6 }}>
                                GSTIN: {customer.gst}
                              </Typography>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell
                            align="center"
                            sx={{
                              py: 1.8,
                              px: 2,
                              borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                            }}
                          >
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8 }}>
                              {/* View Customer Bills Button */}
                              <Tooltip title={`View Invoices & Bills for ${customer.name}`} arrow>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disableElevation
                                  onClick={() => {
                                    setSelectedCustomerFilter(customer.name);
                                    setBillSearchTerm('');
                                    setActiveView('bills');
                                  }}
                                  startIcon={<ReceiptLongRoundedIcon sx={{ fontSize: '15px !important' }} />}
                                  sx={{
                                    height: '32px',
                                    px: 1.2,
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: '#FFFFFF',
                                    backgroundColor: '#B91C1C',
                                    borderRadius: '6px',
                                    '&:hover': {
                                      backgroundColor: '#991B1B',
                                    },
                                  }}
                                >
                                  Bills
                                </Button>
                              </Tooltip>

                              {/* View Statement / Account Details Button */}
                              <Tooltip title="View Account Statement & Billing History" arrow>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => onSelectCustomerForParticular?.(customer.name, 'Account Details')}
                                  startIcon={<AccountBalanceWalletRoundedIcon sx={{ fontSize: '15px !important' }} />}
                                  sx={{
                                    height: '32px',
                                    px: 1.2,
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: '#92400E',
                                    borderColor: '#FDE68A',
                                    backgroundColor: '#FFFBEB',
                                    borderRadius: '6px',
                                    '&:hover': {
                                      backgroundColor: '#FDE68A',
                                      borderColor: '#F59E0B',
                                      color: '#78350F',
                                    },
                                  }}
                                >
                                  Statement
                                </Button>
                              </Tooltip>

                              {/* Edit Customer Button */}
                              <Tooltip title="Edit Customer" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEdit(customer)}
                                  sx={{
                                    color: '#D97706',
                                    backgroundColor: '#FFFBEB',
                                    border: '1px solid #FDE68A',
                                    borderRadius: '6px',
                                    p: 0.7,
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                      color: '#FFFFFF',
                                      backgroundColor: '#D97706',
                                      borderColor: '#D97706',
                                    },
                                  }}
                                >
                                  <ModeEditOutlineRoundedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>

                              {/* Delete Customer Button */}
                              <Tooltip title="Delete Customer" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(recordId, customer.name)}
                                  sx={{
                                    color: '#DC2626',
                                    backgroundColor: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '6px',
                                    p: 0.7,
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                      color: '#FFFFFF',
                                      backgroundColor: '#DC2626',
                                      borderColor: '#DC2626',
                                    },
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

            {/* Mobile View: Responsive Customer Cards */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, p: 1.5 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                </Box>
              ) : filteredCustomers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: '#786C58' }}>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                    {searchTerm ? 'No customers match your search criteria.' : 'No customers found.'}
                  </Typography>
                </Box>
              ) : (
                filteredCustomers.map((customer, index) => {
                  const recordId = customer._id || customer.id || '';
                  const idDisplay = customer.idCode || `#${(index + 1).toString().padStart(4, '0')}`;
                  const avatarInitial = customer.avatarLetter || customer.name.charAt(0).toUpperCase();

                  return (
                    <Paper
                      key={recordId || index}
                      elevation={0}
                      sx={{
                        p: 1.8,
                        borderRadius: '10px',
                        border: '1px solid #FDE68A',
                        backgroundColor: '#FFFDF9',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              backgroundColor: customer.avatarBg || '#FEF3C7',
                              color: customer.avatarColor || '#B91C1C',
                              border: '1px solid #FDE68A',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {avatarInitial}
                          </Box>
                          <Box>
                            <Typography
                              onClick={() => onSelectCustomerForParticular?.(customer.name, 'Account Details')}
                              sx={{
                                fontSize: '14.5px',
                                fontWeight: 800,
                                color: '#1F1714',
                                cursor: 'pointer',
                                '&:hover': { color: '#DC2626' },
                              }}
                            >
                              {customer.name}
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#B91C1C', fontWeight: 700 }}>
                              {idDisplay}
                            </Typography>
                          </Box>
                        </Box>

                        {customer.mobile && customer.mobile !== 'N/A' && (
                          <Button
                            size="small"
                            component="a"
                            href={`tel:${customer.mobile}`}
                            startIcon={<PhoneOutlinedIcon sx={{ fontSize: 13 }} />}
                            sx={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'none',
                              color: '#7C2D12',
                              backgroundColor: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              borderRadius: '6px',
                              py: 0.3,
                              px: 1,
                              minWidth: 'auto',
                            }}
                          >
                            Call
                          </Button>
                        )}
                      </Box>

                      {/* Customer Address & GSTIN */}
                      <Box sx={{ pl: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.6 }}>
                          <LocationOnOutlinedIcon sx={{ fontSize: 14, color: '#64748B', mt: 0.2, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '12.5px', color: '#475569', fontWeight: 500 }}>
                            {customer.address || 'N/A'}
                          </Typography>
                        </Box>
                        {customer.gst && customer.gst !== 'N/A' && (
                          <Typography sx={{ fontSize: '11.5px', color: '#D97706', fontWeight: 700, mt: 0.4, pl: 2.2 }}>
                            GSTIN: {customer.gst}
                          </Typography>
                        )}
                      </Box>

                      {/* Mobile Action Buttons */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, pt: 0.8, borderTop: '1px solid #FEF3C7' }}>
                        <Button
                          size="small"
                          variant="contained"
                          disableElevation
                          onClick={() => {
                            setSelectedCustomerFilter(customer.name);
                            setBillSearchTerm('');
                            setActiveView('bills');
                          }}
                          startIcon={<ReceiptLongRoundedIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            textTransform: 'none',
                            color: '#FFFFFF',
                            backgroundColor: '#B91C1C',
                            borderRadius: '6px',
                            py: 0.6,
                            px: 1.2,
                            minWidth: 'auto',
                            whiteSpace: 'nowrap',
                            '&:hover': { backgroundColor: '#991B1B' },
                          }}
                        >
                          Bills
                        </Button>

                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          onClick={() => onSelectCustomerForParticular?.(customer.name, 'Account Details')}
                          startIcon={<AccountBalanceWalletRoundedIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            textTransform: 'none',
                            color: '#92400E',
                            borderColor: '#FDE68A',
                            backgroundColor: '#FFFBEB',
                            borderRadius: '6px',
                            py: 0.6,
                            whiteSpace: 'nowrap',
                            '&:hover': { backgroundColor: '#FDE68A' },
                          }}
                        >
                          Statement
                        </Button>

                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(customer)}
                          sx={{
                            color: '#D97706',
                            backgroundColor: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            borderRadius: '6px',
                            p: 0.8,
                            '&:hover': { color: '#FFFFFF', backgroundColor: '#D97706' },
                          }}
                        >
                          <ModeEditOutlineRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>

                        <IconButton
                          size="small"
                          onClick={() => handleDelete(recordId, customer.name)}
                          sx={{
                            color: '#DC2626',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '6px',
                            p: 0.8,
                            '&:hover': { color: '#FFFFFF', backgroundColor: '#DC2626' },
                          }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Paper>
                  );
                })
              )}
            </Box>
          </Paper>
        </>
      )}

      {/* 2. Recent Bills & Invoices Section */}
      {activeView === 'bills' && (
        <Paper
          elevation={0}
          sx={{
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
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              gap: 1.5,
              minHeight: '56px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <ReceiptLongRoundedIcon sx={{ color: '#FFFFFF', fontSize: 22 }} />
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
                {filteredRecentBills.length} {filteredRecentBills.length === 1 ? 'bill' : 'bills'}
              </Typography>
            </Box>

            {/* Filter Dropdown, Search Box & Refresh */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
                flexWrap: 'wrap',
                width: { xs: '100%', md: 'auto' },
              }}
            >
              {/* Customer Selector Dropdown */}
              <FormControl
                size="small"
                sx={{
                  minWidth: { xs: '100%', sm: '180px', md: '200px' },
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    height: '36px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1F1714',
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#FDE68A',
                      borderWidth: '1.5px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#F59E0B',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#B91C1C',
                    },
                  },
                }}
              >
                <Select
                  value={selectedCustomerFilter}
                  onChange={(e) => setSelectedCustomerFilter(e.target.value)}
                  displayEmpty
                  renderValue={(val) => {
                    if (val === 'ALL' || !val) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#786C58' }}>
                          <PeopleAltRoundedIcon sx={{ fontSize: 16, color: '#D97706' }} />
                          <span>All Customers</span>
                        </Box>
                      );
                    }
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#B91C1C', fontWeight: 800 }}>
                        <PeopleAltRoundedIcon sx={{ fontSize: 16, color: '#B91C1C' }} />
                        <span style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {val}
                        </span>
                      </Box>
                    );
                  }}
                >
                  <MenuItem value="ALL" sx={{ fontSize: '13px', fontWeight: 700 }}>
                    👥 All Customers ({recentBills.length} total bills)
                  </MenuItem>
                  {uniqueCustomerNames.map((cName) => (
                    <MenuItem key={cName} value={cName} sx={{ fontSize: '13px', fontWeight: 600 }}>
                      {cName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Free-text Search Box */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  px: 1.2,
                  height: '36px',
                  width: { xs: '100%', sm: '220px', md: '240px' },
                  border: '1.5px solid #FDE68A',
                }}
              >
                <SearchRoundedIcon sx={{ color: '#D97706', fontSize: 18, mr: 0.8 }} />
                <InputBase
                  placeholder="Search bill no, particular..."
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
                  whiteSpace: 'nowrap',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {/* Active Filter Bar */}
          {(selectedCustomerFilter !== 'ALL' || billSearchTerm) && (
            <Box
              sx={{
                backgroundColor: '#FEF3C7',
                borderBottom: '1px solid #FDE68A',
                px: { xs: 2, sm: 3 },
                py: 0.8,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                Active Filters:
              </Typography>
              {selectedCustomerFilter !== 'ALL' && (
                <Chip
                  label={`Customer: ${selectedCustomerFilter}`}
                  size="small"
                  onDelete={() => setSelectedCustomerFilter('ALL')}
                  sx={{
                    backgroundColor: '#B91C1C',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '11.5px',
                    '& .MuiChip-deleteIcon': { color: '#FFFFFF', '&:hover': { color: '#FDE68A' } },
                  }}
                />
              )}
              {billSearchTerm && (
                <Chip
                  label={`Search: "${billSearchTerm}"`}
                  size="small"
                  onDelete={() => setBillSearchTerm('')}
                  sx={{
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '11.5px',
                    '& .MuiChip-deleteIcon': { color: '#FFFFFF', '&:hover': { color: '#FEF3C7' } },
                  }}
                />
              )}
              <Button
                size="small"
                onClick={() => {
                  setSelectedCustomerFilter('ALL');
                  setBillSearchTerm('');
                }}
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  color: '#92400E',
                  p: 0,
                  minWidth: 'auto',
                  textDecoration: 'underline',
                }}
              >
                Clear All
              </Button>
            </Box>
          )}

          {/* Desktop View: Recent Bills Table */}
          <TableContainer sx={{ display: { xs: 'none', md: 'block' }, maxHeight: '520px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table stickyHeader sx={{ minWidth: 750 }} aria-label="recent bills table">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#FFFBEB' }}>
                  <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '110px' }}>
                    BILL NO
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '110px' }}>
                    DATE
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                    CUSTOMER & PARTICULAR ITEMS
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '90px' }}>
                    ITEMS
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '130px' }}>
                    TOTAL AMOUNT (₹)
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '12px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '140px' }}>
                    ACTIONS
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingRecentBills ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                    </TableCell>
                  </TableRow>
                ) : filteredRecentBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#786C58' }}>
                      {selectedCustomerFilter !== 'ALL' || billSearchTerm
                        ? `No bills found for the selected customer/particular filter.`
                        : 'No bills created yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecentBills.map((bill, index) => {
                    const isLast = index === filteredRecentBills.length - 1;
                    const totalAmt = parseFloat(String(bill.total || bill.amount || '0').replace(/,/g, '')) || 0;
                    const prodCount = (bill.products || []).length;
                    const particularList = (bill.products || [])
                      .map((p: any) => p.particular || p.name)
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <TableRow key={bill._id || bill.id || index} sx={{ '&:hover': { backgroundColor: '#FEFDF5' } }}>
                        <TableCell sx={{ fontSize: '13.5px', fontWeight: 800, color: '#B91C1C', borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                          #{bill.billNo}
                        </TableCell>
                        <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#57463A', borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                          {bill.date}
                        </TableCell>
                        <TableCell sx={{ borderBottom: isLast ? 'none' : '1px solid #F7EEDB' }}>
                          <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714', lineHeight: 1.2 }}>
                            {bill.customerName}
                          </Typography>
                          {particularList && (
                            <Typography
                              sx={{
                                fontSize: '11.5px',
                                fontWeight: 500,
                                color: '#786C58',
                                mt: 0.4,
                                maxWidth: '340px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={particularList}
                            >
                              📦 {particularList}
                            </Typography>
                          )}
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
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8 }}>
                            {/* Edit Bill */}
                            <Tooltip title="Edit Bill & Products" arrow>
                              <IconButton
                                size="small"
                                onClick={() => onEditBill?.(bill)}
                                sx={{
                                  color: '#D97706',
                                  backgroundColor: '#FFFBEB',
                                  border: '1px solid #FDE68A',
                                  borderRadius: '6px',
                                  p: 0.6,
                                  '&:hover': { color: '#FFFFFF', backgroundColor: '#D97706' },
                                }}
                              >
                                <ModeEditOutlineRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>

                            {/* Print Invoice */}
                            <Tooltip title="Print / View Invoice" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handlePrintRecentBill(bill)}
                                sx={{
                                  color: '#1E40AF',
                                  backgroundColor: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  p: 0.6,
                                  '&:hover': { color: '#FFFFFF', backgroundColor: '#2563EB' },
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

          {/* Mobile View: Recent Bills Cards */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, p: 1.5 }}>
            {loadingRecentBills ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress size={32} sx={{ color: '#DC2626' }} />
              </Box>
            ) : filteredRecentBills.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: '#786C58' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                  {selectedCustomerFilter !== 'ALL' || billSearchTerm
                    ? `No bills found for the selected customer/particular filter.`
                    : 'No bills created yet.'}
                </Typography>
              </Box>
            ) : (
              filteredRecentBills.map((bill, index) => {
                const totalAmt = parseFloat(String(bill.total || bill.amount || '0').replace(/,/g, '')) || 0;
                const prodCount = (bill.products || []).length;
                const particularList = (bill.products || [])
                  .map((p: any) => p.particular || p.name)
                  .filter(Boolean)
                  .join(', ');

                return (
                  <Paper
                    key={bill._id || bill.id || index}
                    elevation={0}
                    sx={{
                      p: 1.8,
                      borderRadius: '10px',
                      border: '1.5px solid #FDE68A',
                      backgroundColor: '#FFFDF9',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#B91C1C' }}>
                        #{bill.billNo}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#786C58', fontWeight: 600 }}>
                        {bill.date}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#1F1714' }}>
                          {bill.customerName}
                        </Typography>
                        <Chip
                          label={`${prodCount} ${prodCount === 1 ? 'item' : 'items'}`}
                          size="small"
                          sx={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
                        />
                      </Box>
                      {particularList && (
                        <Typography sx={{ fontSize: '11.5px', color: '#786C58', fontWeight: 500 }}>
                          📦 {particularList}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #FEF3C7' }}>
                      <Box>
                        <Typography sx={{ fontSize: '11px', color: '#786C58', fontWeight: 600 }}>
                          Total Amount
                        </Typography>
                        <Typography sx={{ fontSize: '16px', fontWeight: 900, color: '#B91C1C' }}>
                          ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onEditBill?.(bill)}
                          startIcon={<ModeEditOutlineRoundedIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            textTransform: 'none',
                            backgroundColor: '#FFFBEB',
                            color: '#B45309',
                            border: '1px solid #FDE68A',
                            borderRadius: '6px',
                            py: 0.5,
                            px: 1,
                            '&:hover': { backgroundColor: '#FDE68A' },
                          }}
                        >
                          Edit
                        </Button>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handlePrintRecentBill(bill)}
                          startIcon={<PrintOutlinedIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            textTransform: 'none',
                            backgroundColor: '#1E40AF',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            py: 0.5,
                            px: 1,
                            '&:hover': { backgroundColor: '#1D4ED8' },
                          }}
                        >
                          Print
                        </Button>

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
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Paper>
                );
              })
            )}
          </Box>
        </Paper>
      )}

      {/* Edit Customer Dialog */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              border: '1.5px solid #FDE68A',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '18px', color: '#B91C1C', pb: 1 }}>
          Edit Customer Details
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Box>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
              Customer Full Name *
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
              Mobile / Contact Number
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editFormData.mobile}
              onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
              Address / Town *
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
              GSTIN
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editFormData.gst}
              onChange={(e) => setEditFormData({ ...editFormData, gst: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setOpenEditModal(false)}
            sx={{ textTransform: 'none', color: '#786C58', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSaveEdit}
            disabled={editLoading}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              fontWeight: 700,
              textTransform: 'none',
              px: 2.5,
              borderRadius: '6px',
            }}
          >
            {editLoading ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date Range Print Report Modal */}
      {openDatePrintModal && (
        <DateRangePrintModal
          open={openDatePrintModal}
          onClose={() => setOpenDatePrintModal(false)}
          title="Customers Directory Report"
          items={filteredCustomers}
          getDateFromItem={(item) => item.createdAt || ''}
          onConfirmPrint={(items, dateRangeText) => {
            printCustomerListDirectly(items, 'Customers Directory Report', dateRangeText);
          }}
        />
      )}

      {/* Print Recent Bill Modal */}
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
