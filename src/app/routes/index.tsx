import NewTournamentPage from '@pages/new-tournament';
import SettingsPage from '@pages/settings';
import TournamentInfoPage from '@pages/tournament-info';
import TournamentsPage from '@pages/tournaments';
import { APP_ROUTES } from '@shared/config/routes';
import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={APP_ROUTES.TOURNAMENTS} />} />
      <Route path={APP_ROUTES.TOURNAMENTS} element={<TournamentsPage />} />
      <Route path={APP_ROUTES.NEW_TOURNAMENT} element={<NewTournamentPage />} />
      <Route
        path={APP_ROUTES.TOURNAMENT_INFO}
        element={<TournamentInfoPage />}
      />
      <Route path={APP_ROUTES.SETTINGS} element={<SettingsPage />} />
      <Route path="*" element={<Navigate to={APP_ROUTES.TOURNAMENTS} />} />
    </Routes>
  );
}
