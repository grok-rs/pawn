import {
  Add,
  ChevronLeft,
  ChevronRight,
  Dashboard,
  EmojiEvents,
  ExpandLess,
  ExpandMore,
  FileUpload,
  Settings,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { APP_ROUTES } from '@shared/config/routes';
import { LanguageSwitcher } from '@shared/ui/LanguageSwitcher';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
        {menuItems.map(item => (
          <Box key={item.text}>
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
                      {item.subItems?.map(subItem => (
                        <ListItemButton
                          key={subItem.text}
                          onClick={() => handleNavigation(subItem.path)}
                          selected={isActive(subItem.path)}
                          sx={{
                            pl: 4,
                            borderRadius: 2,
                            mb: 0.5,
                            '&.Mui-selected': {
                              backgroundColor: `${theme.palette.primary.light}20`,
                              '&:hover': {
                                backgroundColor: `${theme.palette.primary.light}30`,
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
                      ? `${theme.palette.secondary.main}20`
                      : `${theme.palette.primary.light}20`,
                    '&:hover': {
                      backgroundColor: item.primary
                        ? `${theme.palette.secondary.main}30`
                        : `${theme.palette.primary.light}30`,
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
      <Box sx={{ p: open ? 2 : 1 }}>
        <ListItemButton
          sx={{
            borderRadius: 2,
            justifyContent: open ? 'initial' : 'center',
            px: open ? 2 : 1,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <ListItemIcon
            sx={{ minWidth: open ? 40 : 'auto', justifyContent: 'center' }}
          >
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

        <ListItemButton
          onClick={() => handleNavigation(APP_ROUTES.SETTINGS)}
          selected={isActive(APP_ROUTES.SETTINGS)}
          sx={{
            borderRadius: 2,
            mt: 1,
            justifyContent: open ? 'initial' : 'center',
            px: open ? 2 : 1,
            '&.Mui-selected': {
              backgroundColor: `${theme.palette.primary.light}20`,
              '&:hover': {
                backgroundColor: `${theme.palette.primary.light}30`,
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
              justifyContent: 'center',
              color: isActive(APP_ROUTES.SETTINGS)
                ? theme.palette.primary.main
                : 'inherit',
            }}
          >
            <Settings />
          </ListItemIcon>
          {open && (
            <ListItemText
              primary={t('settings')}
              primaryTypographyProps={{
                fontWeight: isActive(APP_ROUTES.SETTINGS) ? 600 : 400,
              }}
            />
          )}
        </ListItemButton>
        {open && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher />
          </Box>
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
