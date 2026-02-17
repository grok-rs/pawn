import { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { APP_ROUTES } from '@shared/config/routes';
import NewTournamentPage from '@pages/new-tournament';
import TournamentsPage from '@pages/tournaments';
import TournamentInfoPage from '@pages/tournament-info';
import SettingsPage from '@pages/settings';

export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={APP_ROUTES.TOURNAMENTS} />} />
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
      <Route path="*" element={<Navigate to={APP_ROUTES.TOURNAMENTS} />} />
    </Routes>
  );
}
