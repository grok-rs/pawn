import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Tooltip,
} from '@mui/material';
import { Language } from '@mui/icons-material';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ua', name: 'Українська', flag: '🇺🇦' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const currentLanguage =
    languages.find(lang => lang.code === i18n.language) || languages[0];

  // Safe translation function with fallback
  const safeTranslation = (key: string, fallback: string = key) => {
    try {
      return t(key);
    } catch (error) {
      console.warn(`Translation error for key "${key}":`, error);
      return fallback;
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    handleClose();
  };

  return (
    <>
      <Tooltip
        title={safeTranslation('language.changeLanguage', 'Change Language')}
      >
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ ml: 2 }}
          aria-label={safeTranslation(
            'language.changeLanguage',
            'Change Language'
          )}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span style={{ fontSize: '1.2rem' }}>{currentLanguage.flag}</span>
            <Language fontSize="small" />
          </Box>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {languages.map(language => (
          <MenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            selected={language.code === i18n.language}
          >
            <ListItemIcon>
              <span style={{ fontSize: '1.5rem' }}>{language.flag}</span>
            </ListItemIcon>
            <ListItemText>{language.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
