import { ReactElement } from 'react';

import { NotificationProvider } from '@shared/lib/notification';
import { AppRoutes } from '@app/routes';

function App(): ReactElement {
  return (
    <NotificationProvider>
      <AppRoutes />
    </NotificationProvider>
  );
}

export default App;
