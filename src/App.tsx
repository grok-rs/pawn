import { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { APP_ROUTES } from './constants/appRoutes';
import NewTournamentPage from './pages/NewTournament';
import TournamentsPage from './pages/Tournaments';
import TournamentInfoPage from './pages/TournamentInfo';
import SettingsPage from './pages/Settings';
import { NotificationProvider } from './contexts/NotificationContext';

function App(): ReactElement {
  return (
    <NotificationProvider>
      <Routes>
        {/* Default Route to /overview */}
        <Route path="/" element={<Navigate to={APP_ROUTES.TOURNAMENTS} />} />

        {/* Overview Page Route */}
        <Route path={APP_ROUTES.TOURNAMENTS} element={<TournamentsPage />} />
        <Route
          path={APP_ROUTES.NEW_TOURNAMENT}
          element={<NewTournamentPage />}
        />
        <Route
          path={APP_ROUTES.TOURNAMENT_INFO}
          element={<TournamentInfoPage />}
        />
        <Route path={APP_ROUTES.SETTINGS} element={<SettingsPage />} />

        {/* Catch-all Route to handle undefined paths and redirect to /overview */}
        <Route path="*" element={<Navigate to={APP_ROUTES.TOURNAMENTS} />} />
      </Routes>
    </NotificationProvider>
  );
}

export default App;
