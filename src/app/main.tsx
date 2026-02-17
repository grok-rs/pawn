import '@mui/material/styles/styled';
import '@app/styles/main.css';
import '@app/styles/animations.css';
import '@fontsource/roboto';
import '@shared/lib/i18n';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@app/App';
import { Providers } from '@app/providers';

const container = document.getElementById('root');

if (!container) throw new Error('Failed to find the root element');

const root = createRoot(container);

root.render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
);
