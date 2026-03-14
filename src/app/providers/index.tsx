import { ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { muiTheme } from '@shared/config/theme';
import i18n from '@shared/lib/i18n';
import type { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): ReactElement {
  return (
    <ThemeProvider theme={muiTheme}>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {children}
          </LocalizationProvider>
        </I18nextProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
