import { useState, useEffect, type FC, type MouseEvent } from 'react';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import { getStoredSettings, type CompanySettings } from './SettingsPage';

export type NavTab = 'All Customers' | 'Billing' | 'Stock' | 'Categories' | 'Price List' | 'Product' | 'Settings';

interface NavbarProps {
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onLogout?: () => void;
}

const TAB_ICONS: Record<NavTab, React.ReactElement> = {
  'All Customers': <PeopleAltRoundedIcon sx={{ fontSize: 20 }} />,
  'Billing': <ReceiptLongRoundedIcon sx={{ fontSize: 20 }} />,
  'Stock': <WarehouseRoundedIcon sx={{ fontSize: 20 }} />,
  'Categories': <CategoryRoundedIcon sx={{ fontSize: 20 }} />,
  'Price List': <FormatListNumberedRoundedIcon sx={{ fontSize: 20 }} />,
  'Product': <Inventory2RoundedIcon sx={{ fontSize: 20 }} />,
  'Settings': <SettingsRoundedIcon sx={{ fontSize: 20 }} />,
};

export const Navbar: FC<NavbarProps> = ({
  activeTab = 'All Customers',
  onSelectTab,
  onLogout,
}) => {
  const tabs: NavTab[] = ['All Customers', 'Billing', 'Stock', 'Categories', 'Price List', 'Product', 'Settings'];
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getStoredSettings);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setCompanySettings(getStoredSettings());
    };
    window.addEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const handleTabClick = (tab: NavTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    setMobileDrawerOpen(false);
  };

  const handleProfileClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleCloseMenu();
    setMobileDrawerOpen(false);
    if (onLogout) onLogout();
  };

  return (
    <>
      <Box
        component="header"
        sx={{
          width: '100%',
          backgroundColor: '#990000',
          background: 'linear-gradient(135deg, #990000 0%, #800A0A 50%, #630505 100%)',
          borderBottom: '2.5px solid #F59E0B',
          px: { xs: 1.5, sm: 2.5, md: 4 },
          height: { xs: '58px', sm: '66px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          boxSizing: 'border-box',
          boxShadow: '0 4px 20px rgba(100, 5, 5, 0.35)',
        }}
      >
        {/* Left Logo & Brand Section */}
        <Box
          onClick={() => handleTabClick('All Customers')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
            cursor: 'pointer',
            minWidth: 0,
            maxWidth: { xs: '68%', sm: 'auto' },
          }}
        >
          {/* Logo */}
          {companySettings.logoUrl ? (
            <Box
              component="img"
              src={companySettings.logoUrl}
              alt="Company Logo"
              sx={{
                height: { xs: 32, sm: 38 },
                maxWidth: { xs: 42, sm: 50 },
                width: 'auto',
                objectFit: 'contain',
                backgroundColor: 'transparent',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                display: 'block',
                flexShrink: 0,
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: 34, sm: 38 },
                height: { xs: 34, sm: 38 },
                borderRadius: '9px',
                border: '1.5px solid #FFD700',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M7 6H13C16.3137 6 19 8.68629 19 12C19 15.3137 16.3137 18 13 18H7V6Z"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 9.5H13C14.3807 9.5 15.5 10.6193 15.5 12C15.5 13.3807 14.3807 14.5 13 14.5H10V9.5Z"
                  fill="#FFFFFF"
                />
              </svg>
            </Box>
          )}

          <Box sx={{ minWidth: 0, overflow: 'hidden', flexShrink: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '13.5px', sm: '18px' },
                color: '#FFD700',
                letterSpacing: '0.01em',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >
              {companySettings.companyName || 'NARENDIRAA ENTERPRISES'}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '8.5px', sm: '11px' },
                fontWeight: 700,
                color: '#FFFFFF',
                opacity: 0.95,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {companySettings.tagline || (companySettings.city ? `${companySettings.city}` : 'Sivakasi')}
            </Typography>
          </Box>
        </Box>

        {/* Center Desktop Navigation Links (Hidden on Mobile/Tablet) */}
        <Box
          component="nav"
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: { md: 2.5, lg: 3.5 },
            height: '100%',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Box
                key={tab}
                onClick={() => handleTabClick(tab)}
                sx={{
                  position: 'relative',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  px: 0.8,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '14px',
                    color: isActive ? '#FFD700' : '#FDE68A',
                    letterSpacing: '0.01em',
                    transition: 'all 0.15s ease',
                    textShadow: isActive ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
                    '&:hover': {
                      color: '#FFFFFF',
                    },
                  }}
                >
                  {tab}
                </Typography>

                {/* Active indicator underline bar */}
                {isActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3.5px',
                      background: 'linear-gradient(90deg, #FFD700 0%, #F59E0B 100%)',
                      borderTopLeftRadius: '3px',
                      borderTopRightRadius: '3px',
                      boxShadow: '0 -2px 8px rgba(255, 215, 0, 0.6)',
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {/* Right Action Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.8, sm: 1.5 }, flexShrink: 0 }}>
          {/* Profile Avatar Button */}
          <Box
            onClick={handleProfileClick}
            sx={{
              width: { xs: 34, sm: 36 },
              height: { xs: 34, sm: 36 },
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #B45309 0%, #78350F 100%)',
              border: '1.5px solid #FFD700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
              '&:hover': {
                transform: 'scale(1.08)',
                boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)',
              },
            }}
          >
            <PersonOutlineRoundedIcon sx={{ fontSize: { xs: 19, sm: 20 }, color: '#FFD700' }} />
          </Box>

          {/* Mobile Hamburger Menu Button (Visible only on mobile/tablet) */}
          <IconButton
            onClick={() => setMobileDrawerOpen(true)}
            sx={{
              display: { xs: 'flex', md: 'none' },
              color: '#FFD700',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              p: 0.8,
              borderRadius: '8px',
              minWidth: '38px',
              minHeight: '38px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            <MenuRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>

        {/* Profile / Logout Popup Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '12px',
                minWidth: '180px',
                boxShadow: '0 8px 30px rgba(100, 5, 5, 0.25)',
                border: '1.5px solid #F59E0B',
                backgroundColor: '#FFFFFF',
                mt: 1,
              },
            },
          }}
        >
          <MenuItem disabled sx={{ opacity: '1 !important', py: 1.2 }}>
            <ListItemIcon>
              <AdminPanelSettingsRoundedIcon sx={{ fontSize: 20, color: '#990000' }} />
            </ListItemIcon>
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#240808' }}>
                Administrator
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>
                Logged In
              </Typography>
            </Box>
          </MenuItem>
          <Divider sx={{ my: 0.5, borderColor: '#FEF3C7' }} />
          <MenuItem
            onClick={() => {
              handleCloseMenu();
              handleTabClick('Settings');
            }}
            sx={{ py: 1 }}
          >
            <ListItemIcon>
              <SettingsRoundedIcon sx={{ fontSize: 18, color: '#990000' }} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#240808' }}>
              Software Settings
            </Typography>
          </MenuItem>
          <MenuItem onClick={handleLogoutClick} sx={{ color: '#990000', py: 1 }}>
            <ListItemIcon>
              <LogoutRoundedIcon sx={{ fontSize: 18, color: '#990000' }} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>
              Logout
            </Typography>
          </MenuItem>
        </Menu>
      </Box>

      {/* Mobile Horizontal Touch Tab Bar (Quick thumb scrolling under Navbar on Mobile) */}
      <Box
        className="touch-scroll"
        sx={{
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          gap: 1,
          px: 1.2,
          py: 0.8,
          backgroundColor: '#800A0A',
          borderBottom: '1.5px solid #F59E0B',
          position: 'sticky',
          top: '58px',
          zIndex: 1090,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Box
              key={tab}
              onClick={() => handleTabClick(tab)}
              sx={{
                px: 1.4,
                py: 0.6,
                borderRadius: '20px',
                backgroundColor: isActive ? '#FFD700' : 'rgba(255, 255, 255, 0.14)',
                color: isActive ? '#750909' : '#FEF3C7',
                border: isActive ? '1px solid #FFD700' : '1px solid rgba(253, 230, 138, 0.3)',
                fontSize: '12.5px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
                flexShrink: 0,
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                minHeight: '34px',
                '&:active': {
                  transform: 'scale(0.96)',
                },
              }}
            >
              {TAB_ICONS[tab]}
              {tab}
            </Box>
          );
        })}
      </Box>

      {/* Mobile Slide-Out Drawer Menu */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: '280px',
              backgroundColor: '#FFFDF9',
              borderLeft: '2px solid #F59E0B',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            },
          },
        }}
      >
        <Box>
          {/* Drawer Header */}
          <Box
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #990000 0%, #750909 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #F59E0B',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#FFD700' }}>
                {companySettings.companyName || 'NARENDIRAA ENTERPRISES'}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#FEF3C7', fontWeight: 600 }}>
                Main Navigation
              </Typography>
            </Box>
            <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: '#FFD700' }}>
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* Drawer Navigation List */}
          <List sx={{ p: 1 }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <ListItem key={tab} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleTabClick(tab)}
                    sx={{
                      borderRadius: '10px',
                      backgroundColor: isActive ? '#FEF3C7' : 'transparent',
                      border: isActive ? '1px solid #F59E0B' : '1px solid transparent',
                      color: isActive ? '#990000' : '#240808',
                      py: 1.2,
                      '&:hover': {
                        backgroundColor: '#FFFBEB',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive ? '#990000' : '#78350F', minWidth: '36px' }}>
                      {TAB_ICONS[tab]}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontSize: '14px', fontWeight: isActive ? 800 : 600 }}>
                          {tab}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Drawer Bottom Logout Button */}
        <Box sx={{ p: 2, borderTop: '1px solid #FDE68A' }}>
          <ListItemButton
            onClick={handleLogoutClick}
            sx={{
              borderRadius: '10px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#990000',
              py: 1,
              '&:hover': {
                backgroundColor: '#FEE2E2',
              },
            }}
          >
            <ListItemIcon sx={{ color: '#990000', minWidth: '36px' }}>
              <LogoutRoundedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography sx={{ fontSize: '14px', fontWeight: 700 }}>
                  Logout
                </Typography>
              }
            />
          </ListItemButton>
        </Box>
      </Drawer>
    </>
  );
};
