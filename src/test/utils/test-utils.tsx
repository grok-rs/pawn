import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Mock translations for testing
const mockTranslations = {
  en: {
    translation: {
      // Navigation
      'nav.tournaments': 'Tournaments',
      'nav.newTournament': 'New Tournament',
      'nav.settings': 'Settings',

      // Common actions
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',

      // Tournament related
      'tournament.name': 'Tournament Name',
      'tournament.players': 'Players',
      'tournament.rounds': 'Rounds',
      'tournament.status': 'Status',
      'tournament.settings': 'Settings',

      // Player related
      'player.name': 'Name',
      'player.rating': 'Rating',
      'player.country': 'Country',
      'player.title': 'Title',

      // Form validation
      'validation.required': 'This field is required',
      'validation.minLength': 'Minimum length is {{min}} characters',
      'validation.invalidFormat': 'Invalid format',

      // Error messages
      'error.general': 'An error occurred',
      'error.networkError': 'Network error',
      'error.notFound': 'Not found',
    },
  },
};

// Create test i18n instance
const createTestI18n = () => {
  const testI18n = i18n.createInstance();
  testI18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    resources: mockTranslations,
    interpolation: {
      escapeValue: false,
    },
  });
  return testI18n;
};

// Mock Redux store for testing
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      // Add mock reducers as needed
      notifications: (state = { notifications: [] }, _action) => state,
      tournaments: (state = { tournaments: [], loading: false }, _action) =>
        state,
      players: (state = { players: [], loading: false }, _action) => state,
    },
    preloadedState: initialState,
  });
};

// Default theme for testing
const testTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  route?: string;
  theme?: any;
  i18nInstance?: any;
  store?: any;
  withRouter?: boolean;
  withI18n?: boolean;
  withTheme?: boolean;
  withRedux?: boolean;
}

// Comprehensive render utility with all providers
const customRender = (
  ui: ReactElement,
  {
    initialEntries = ['/'],
    route: _route = '/',
    theme = testTheme,
    i18nInstance,
    store,
    withRouter = true,
    withI18n = true,
    withTheme = true,
    withRedux = false,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const testI18n = i18nInstance || createTestI18n();
  const testStore = store || createMockStore();

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    let wrapped = <>{children}</>;

    if (withRedux) {
      wrapped = <ReduxProvider store={testStore}>{wrapped}</ReduxProvider>;
    }

    if (withTheme) {
      wrapped = <ThemeProvider theme={theme}>{wrapped}</ThemeProvider>;
    }

    if (withI18n) {
      wrapped = <I18nextProvider i18n={testI18n}>{wrapped}</I18nextProvider>;
    }

    if (withRouter) {
      wrapped = (
        <MemoryRouter initialEntries={initialEntries}>{wrapped}</MemoryRouter>
      );
    }

    return wrapped;
  };

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// Specific render utilities for common use cases
export const renderWithRouter = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => customRender(ui, { ...options, withRouter: true });

export const renderWithI18n = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => customRender(ui, { ...options, withI18n: true });

export const renderWithTheme = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => customRender(ui, { ...options, withTheme: true });

export const renderWithRedux = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => customRender(ui, { ...options, withRedux: true });

export const renderWithAllProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) =>
  customRender(ui, {
    ...options,
    withRouter: true,
    withI18n: true,
    withTheme: true,
    withRedux: true,
  });

// Mock data factories
export const createMockTournament = (overrides = {}) => ({
  id: 1,
  name: 'Test Tournament',
  description: 'A test tournament',
  status: 'draft',
  playerCount: 0,
  maxPlayers: 16,
  rounds: 0,
  maxRounds: 5,
  pairingMethod: 'swiss',
  timeControl: {
    mainTime: 90,
    increment: 30,
    type: 'fischer',
  },
  tiebreaks: ['buchholz', 'sonneborn_berger'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockPlayer = (overrides = {}) => ({
  id: 1,
  name: 'Test Player',
  rating: 1500,
  countryCode: 'US',
  title: '',
  birthDate: '1990-01-01',
  gender: 'M',
  fideId: null,
  email: 'test@example.com',
  phone: '+1234567890',
  address: '123 Test St',
  city: 'Test City',
  state: 'Test State',
  zipCode: '12345',
  emergencyContact: 'Emergency Contact',
  emergencyPhone: '+0987654321',
  medicalInfo: '',
  notes: '',
  isActive: true,
  pairingNumber: 1,
  ...overrides,
});

export const createMockGameResult = (overrides = {}) => ({
  id: 1,
  tournamentId: 1,
  roundNumber: 1,
  whitePlayerId: 1,
  blackPlayerId: 2,
  result: 'white_wins',
  resultType: 'normal',
  boardNumber: 1,
  isApproved: false,
  approvedBy: null,
  approvedAt: null,
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Mock Tauri invoke function for tests
export const createMockTauriInvoke = (
  mockResponses: Record<string, any> = {}
) => {
  return jest.fn().mockImplementation((command: string, _payload?: any) => {
    if (mockResponses[command]) {
      return Promise.resolve(mockResponses[command]);
    }

    // Default mock responses
    const defaultResponses: Record<string, any> = {
      get_tournaments: [createMockTournament()],
      get_players_by_tournament_enhanced: [createMockPlayer()],
      create_tournament: createMockTournament({ id: Date.now() }),
      create_player_enhanced: createMockPlayer({ id: Date.now() }),
      get_tournament_settings: {
        tiebreaks: ['buchholz', 'sonneborn_berger'],
        pairingMethod: 'swiss',
      },
    };

    return Promise.resolve(defaultResponses[command] || null);
  });
};

// Export the main render function and utilities
export * from '@testing-library/react';
export { customRender as render };
export { createTestI18n, createMockStore, testTheme };
