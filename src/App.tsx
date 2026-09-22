import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './theme/theme';
import { Navbar, type NavTab } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { CategoriesPage } from './components/CategoriesPage';
import { PriceListPage } from './components/PriceListPage';
import { ProductsPage } from './components/ProductsPage';
import { StockPage } from './components/StockPage';
import { AllCustomersPage } from './components/AllCustomersPage';
import { AddCustomerPage } from './components/AddCustomerPage';
import { ParticularsPage } from './components/ParticularsPage';
import { SettingsPage, getStoredSettings, DEFAULT_COMPANY_SETTINGS } from './components/SettingsPage';
import { SettingsApi } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('dheeksha_auth_token'));
  });
  const [activeTab, setActiveTab] = useState<NavTab>('All Customers');
  const [customerSubView, setCustomerSubView] = useState<'list' | 'add'>('list');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [editingBill, setEditingBill] = useState<any | null>(null);

  useEffect(() => {
    // Clear legacy sticky customer if present
    localStorage.removeItem('dheeksha_active_customer');
    const updateTitle = () => {
      const settings = getStoredSettings();
      if (settings.companyName) {
        document.title = `${settings.companyName} - Billing & Management`;
      }
    };
    updateTitle();

    // Fetch settings from MongoDB database so brand identity is always live across all devices
    SettingsApi.get()
      .then((res) => {
        const data = (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
        if (data && typeof data === 'object') {
          const sanitized: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(data)) {
            if (v !== '' && v !== null && v !== undefined) {
              sanitized[k] = v;
            }
          }
          const remoteSettings = { ...DEFAULT_COMPANY_SETTINGS, ...sanitized };
          localStorage.setItem('dheeksha_app_settings', JSON.stringify(remoteSettings));
          window.dispatchEvent(new Event('dheeksha_settings_updated'));
          updateTitle();
        }
      })
      .catch((err) => {
        console.warn('Could not connect to settings API on startup:', err);
      });

    window.addEventListener('dheeksha_settings_updated', updateTitle);
    return () => {
      window.removeEventListener('dheeksha_settings_updated', updateTitle);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('dheeksha_auth_token');
    localStorage.removeItem('dheeksha_auth_user');
    localStorage.removeItem('dheeksha_active_customer');
    setIsAuthenticated(false);
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'All Customers') {
      setCustomerSubView('list');
    }
    if (tab === 'Billing') {
      setSelectedCustomerName('');
    }
  };

  const handleCustomerSelectedForParticular = (customerName: string) => {
    setEditingBill(null);
    setSelectedCustomerName(customerName);
    setActiveTab('Billing');
  };

  const handleEditBill = (bill: any) => {
    setSelectedCustomerName('');
    setEditingBill(bill);
    setActiveTab('Billing');
  };

  const handleCancelEdit = () => {
    setEditingBill(null);
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#FEFDF9',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <Navbar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />

        <Box component="main" sx={{ flexGrow: 1, width: '100%', py: 0.5 }}>
          {/* All Customers Tab */}
          {activeTab === 'All Customers' && (
            <>
              {customerSubView === 'add' ? (
                <AddCustomerPage
                  onCancel={() => setCustomerSubView('list')}
                  onSubmitSuccess={() => setCustomerSubView('list')}
                />
              ) : (
                <AllCustomersPage
                  onAddNewCustomer={() => setCustomerSubView('add')}
                  onSelectCustomerForParticular={handleCustomerSelectedForParticular}
                  onEditBill={handleEditBill}
                />
              )}
            </>
          )}

          {/* Billing / Particulars Tab */}
          {activeTab === 'Billing' && (
            <ParticularsPage
              initialCustomerName={selectedCustomerName}
              editingBill={editingBill}
              onCancelEdit={handleCancelEdit}
            />
          )}

          {/* Stock Maintenance Tab */}
          {activeTab === 'Stock' && <StockPage />}

          {/* Categories Tab */}
          {activeTab === 'Categories' && <CategoriesPage />}

          {/* Price List Tab */}
          {activeTab === 'Price List' && <PriceListPage />}

          {/* Products Tab */}
          {activeTab === 'Product' && <ProductsPage />}

          {/* Settings Tab */}
          {activeTab === 'Settings' && <SettingsPage />}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
