import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Avatar,
  Collapse,
} from '@mui/material';
import {
  EmojiEvents,
  Add,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExpandLess,
  ExpandMore,
  Dashboard,
  People,
  Analytics,
  FileUpload,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { APP_ROUTES } from '../../constants/appRoutes';
import { LanguageSwitcher } from '../LanguageSwitcher';

const drawerWidth = 280;
const collapsedWidth = 72;

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const Sidebar = ({ open, onToggle }: SidebarProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('tablet'));
  const [tournamentsOpen, setTournamentsOpen] = useState(true);

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onToggle();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    {
      text: t('dashboard'),
      icon: <Dashboard />,
      path: APP_ROUTES.TOURNAMENTS,
      primary: true,
    },
    {
      text: t('tournaments'),
      icon: <EmojiEvents />,
      expandable: true,
      expanded: tournamentsOpen,
      onToggle: () => setTournamentsOpen(!tournamentsOpen),
      subItems: [
        {
          text: t('allTournaments'),
          path: APP_ROUTES.TOURNAMENTS,
        },
        {
          text: t('newTournament'),
          icon: <Add />,
          path: APP_ROUTES.NEW_TOURNAMENT,
        },
        {
          text: t('importTournament'),
          icon: <FileUpload />,
          path: '#import',
        },
      ],
    },
    {
      text: t('players'),
      icon: <People />,
      path: '#players',
    },
    {
      text: t('analytics'),
      icon: <Analytics />,
      path: '#analytics',
    },
  ];

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minHeight: 64,
        }}
      >
        <Box
          component="img"
          src="/chess-logo.svg"
          alt="Pawn"
          sx={{
            width: 40,
            height: 40,
            display: open ? 'block' : 'none',
          }}
        />
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: theme.palette.primary.main,
            display: open ? 'block' : 'none',
          }}
        >
          Pawn
        </Typography>
        <IconButton
          onClick={onToggle}
          sx={{
            ml: 'auto',
            color: theme.palette.primary.main,
          }}
        >
          {open ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {menuItems.map((item, index) => (
          <Box key={index}>
            {item.expandable ? (
              <>
                <ListItemButton
                  onClick={item.onToggle}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: open ? 40 : 'auto',
                      color: theme.palette.primary.main,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontWeight: 500,
                        }}
                      />
                      {item.expanded ? <ExpandLess /> : <ExpandMore />}
                    </>
                  )}
                </ListItemButton>
                {open && (
                  <Collapse in={item.expanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subItems?.map((subItem, subIndex) => (
                        <ListItemButton
                          key={subIndex}
                          onClick={() => handleNavigation(subItem.path)}
                          selected={isActive(subItem.path)}
                          sx={{
                            pl: 4,
                            borderRadius: 2,
                            mb: 0.5,
                            '&.Mui-selected': {
                              backgroundColor:
                                theme.palette.primary.light + '20',
                              '&:hover': {
                                backgroundColor:
                                  theme.palette.primary.light + '30',
                              },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 40,
                              color: isActive(subItem.path)
                                ? theme.palette.primary.main
                                : 'inherit',
                            }}
                          >
                            {subItem.icon || <Box sx={{ width: 24 }} />}
                          </ListItemIcon>
                          <ListItemText
                            primary={subItem.text}
                            primaryTypographyProps={{
                              fontWeight: isActive(subItem.path) ? 600 : 400,
                              fontSize: '0.875rem',
                            }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </>
            ) : (
              <ListItemButton
                onClick={() => item.path && handleNavigation(item.path)}
                selected={item.path ? isActive(item.path) : false}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: item.primary
                      ? theme.palette.secondary.main + '20'
                      : theme.palette.primary.light + '20',
                    '&:hover': {
                      backgroundColor: item.primary
                        ? theme.palette.secondary.main + '30'
                        : theme.palette.primary.light + '30',
                    },
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: open ? 40 : 'auto',
                    color: item.primary
                      ? theme.palette.secondary.main
                      : item.path && isActive(item.path)
                        ? theme.palette.primary.main
                        : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: item.path && isActive(item.path) ? 600 : 500,
                    }}
                  />
                )}
              </ListItemButton>
            )}
          </Box>
        ))}
      </List>

      <Divider />

      {/* User Section */}
      <Box sx={{ p: 2 }}>
        <ListItemButton
          sx={{
            borderRadius: 2,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: open ? 40 : 'auto' }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: theme.palette.primary.main,
                fontSize: '0.875rem',
              }}
            >
              U
            </Avatar>
          </ListItemIcon>
          {open && (
            <ListItemText
              primary={t('user')}
              secondary="user@example.com"
              primaryTypographyProps={{ fontWeight: 500 }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          )}
        </ListItemButton>

        {open && (
          <>
            <ListItemButton
              onClick={() => handleNavigation(APP_ROUTES.SETTINGS)}
              selected={isActive(APP_ROUTES.SETTINGS)}
              sx={{
                borderRadius: 2,
                mt: 1,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.light + '20',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.light + '30',
                  },
                },
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActive(APP_ROUTES.SETTINGS)
                    ? theme.palette.primary.main
                    : 'inherit',
                }}
              >
                <Settings />
              </ListItemIcon>
              <ListItemText
                primary={t('settings')}
                primaryTypographyProps={{
                  fontWeight: isActive(APP_ROUTES.SETTINGS) ? 600 : 400,
                }}
              />
            </ListItemButton>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <LanguageSwitcher />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? open : true}
      onClose={onToggle}
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : collapsedWidth,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
          borderRight: '1px solid',
          borderColor: theme.palette.divider,
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
