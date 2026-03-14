import { AppRoutes } from '@app/routes';

import { NotificationProvider } from '@shared/lib/notification';
import type { ReactElement } from 'react';

function App(): ReactElement {
  return (
    <NotificationProvider>
      <AppRoutes />
    </NotificationProvider>
  );
}

export default App;
