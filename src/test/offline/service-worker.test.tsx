import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Service Worker utilities
const ServiceWorkerTestUtils = {
  // Mock service worker registration
  createMockServiceWorker: () => {
    const mockSW = {
      state: 'activated',
      scriptURL: '/sw.js',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      postMessage: jest.fn(),
    };

    const mockRegistration = {
      active: mockSW,
      installing: null,
      waiting: null,
      scope: '/',
      update: jest.fn(),
      unregister: jest.fn().mockResolvedValue(true),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      pushManager: {
        subscribe: jest.fn(),
        getSubscription: jest.fn(),
      },
    };

    return { mockSW, mockRegistration };
  },

  // Mock navigator.serviceWorker
  mockServiceWorkerAPI: (registration: any = null) => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: jest.fn().mockResolvedValue(registration),
        getRegistration: jest.fn().mockResolvedValue(registration),
        getRegistrations: jest
          .fn()
          .mockResolvedValue([registration].filter(Boolean)),
        ready: Promise.resolve(registration),
        controller: registration?.active || null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      configurable: true,
    });
  },

  // Mock online/offline events
  mockNetworkStatus: (online: boolean) => {
    Object.defineProperty(navigator, 'onLine', {
      value: online,
      configurable: true,
    });

    // Trigger online/offline events
    const event = new Event(online ? 'online' : 'offline');
    window.dispatchEvent(event);
  },

  // Mock IndexedDB for offline storage
  mockIndexedDB: () => {
    const mockDB = {
      version: 1,
      name: 'pawn-offline-db',
      objectStoreNames: ['tournaments', 'players', 'games'],
      transaction: jest.fn(),
      close: jest.fn(),
    };

    const mockTransaction = {
      objectStore: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const mockObjectStore = {
      add: jest.fn().mockResolvedValue(undefined),
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(undefined),
      getAll: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      createIndex: jest.fn(),
      index: jest.fn(),
    };

    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockDB.transaction.mockReturnValue(mockTransaction);

    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: jest.fn().mockImplementation(() => {
          const request = {
            result: mockDB,
            error: null,
            transaction: null,
            readyState: 'done',
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          };

          setTimeout(() => {
            if (request.onsuccess)
              request.onsuccess({ target: request } as any);
          }, 10);

          return request;
        }),
        deleteDatabase: jest.fn(),
      },
      configurable: true,
    });

    return { mockDB, mockTransaction, mockObjectStore };
  },

  // Mock cache API
  mockCacheAPI: () => {
    const mockCache = {
      match: jest.fn(),
      matchAll: jest.fn(),
      add: jest.fn(),
      addAll: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn(),
    };

    const mockCaches = {
      open: jest.fn().mockResolvedValue(mockCache),
      has: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      keys: jest.fn().mockResolvedValue(['v1']),
      match: jest.fn(),
    };

    Object.defineProperty(window, 'caches', {
      value: mockCaches,
      configurable: true,
    });

    return { mockCache, mockCaches };
  },
};

// Offline storage manager component
const OfflineStorageManager = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = React.useState<
    'idle' | 'syncing' | 'error'
  >('idle');
  const [offlineData, setOfflineData] = React.useState<any[]>([]);
  const [storageUsage, setStorageUsage] = React.useState<{
    quota: number;
    usage: number;
    percentage: number;
  }>({ quota: 0, usage: 0, percentage: 0 });

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check storage usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        setStorageUsage({
          quota,
          usage,
          percentage: quota > 0 ? (usage / quota) * 100 : 0,
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineData = async () => {
    if (!isOnline) return;

    setSyncStatus('syncing');
    try {
      // Simulate syncing offline data
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOfflineData([]);
      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    }
  };

  const addOfflineData = (data: any) => {
    setOfflineData(prev => [...prev, { ...data, timestamp: Date.now() }]);
  };

  const clearOfflineData = () => {
    setOfflineData([]);
  };

  return (
    <div data-testid="offline-storage-manager">
      <div data-testid="network-status">
        Status: {isOnline ? 'Online' : 'Offline'}
      </div>

      <div data-testid="sync-status">Sync: {syncStatus}</div>

      <div data-testid="offline-data-count">
        Offline Items: {offlineData.length}
      </div>

      <div data-testid="storage-usage">
        Storage: {storageUsage.percentage.toFixed(1)}% used (
        {(storageUsage.usage / 1024 / 1024).toFixed(2)} MB /{' '}
        {(storageUsage.quota / 1024 / 1024).toFixed(2)} MB)
      </div>

      <div data-testid="controls">
        <button
          data-testid="add-offline-item"
          onClick={() => addOfflineData({ type: 'test', data: 'test data' })}
        >
          Add Offline Item
        </button>

        <button
          data-testid="sync-data"
          onClick={syncOfflineData}
          disabled={!isOnline || syncStatus === 'syncing'}
        >
          Sync Data
        </button>

        <button data-testid="clear-offline-data" onClick={clearOfflineData}>
          Clear Offline Data
        </button>
      </div>

      <div data-testid="offline-items">
        {offlineData.map((item, index) => (
          <div key={index} data-testid={`offline-item-${index}`}>
            {item.type}: {new Date(item.timestamp).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  );
};

// Service worker registration component
const ServiceWorkerRegistration = () => {
  const [registrationState, setRegistrationState] = React.useState<
    'unregistered' | 'registering' | 'registered' | 'error'
  >('unregistered');
  const [swState, setSWState] = React.useState<string>('');
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [registration, setRegistration] =
    React.useState<ServiceWorkerRegistration | null>(null);

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      setRegistrationState('error');
      return;
    }

    setRegistrationState('registering');

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      setRegistration(registration);
      setRegistrationState('registered');
      setSWState(registration.active?.state || 'unknown');

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        setUpdateAvailable(true);
      });
    } catch {
      setRegistrationState('error');
    }
  };

  const updateServiceWorker = async () => {
    if (registration) {
      try {
        await registration.update();
        setUpdateAvailable(false);
      } catch (error) {
        console.error('Service worker update failed:', error);
      }
    }
  };

  const unregisterServiceWorker = async () => {
    if (registration) {
      await registration.unregister();
      setRegistration(null);
      setRegistrationState('unregistered');
      setSWState('');
      setUpdateAvailable(false);
    }
  };

  return (
    <div data-testid="sw-registration">
      <div data-testid="registration-state">
        Registration: {registrationState}
      </div>

      <div data-testid="sw-state">Service Worker: {swState}</div>

      {updateAvailable && (
        <div data-testid="update-available">Update Available</div>
      )}

      <div data-testid="sw-controls">
        <button
          data-testid="register-sw"
          onClick={registerServiceWorker}
          disabled={
            registrationState === 'registering' ||
            registrationState === 'registered'
          }
        >
          Register Service Worker
        </button>

        <button
          data-testid="update-sw"
          onClick={updateServiceWorker}
          disabled={!registration}
        >
          Update Service Worker
        </button>

        <button
          data-testid="unregister-sw"
          onClick={unregisterServiceWorker}
          disabled={!registration}
        >
          Unregister Service Worker
        </button>
      </div>
    </div>
  );
};

// Offline tournament management component
const OfflineTournamentManager = () => {
  const [tournaments, setTournaments] = React.useState<any[]>([]);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = React.useState<any[]>([]);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const createTournament = async (tournamentData: any) => {
    const tournament = {
      id: Date.now(),
      ...tournamentData,
      createdOffline: !isOnline,
      lastModified: Date.now(),
    };

    setTournaments(prev => [...prev, tournament]);

    if (!isOnline) {
      // Add to sync queue
      setSyncQueue(prev => [
        ...prev,
        {
          action: 'create',
          type: 'tournament',
          data: tournament,
          timestamp: Date.now(),
        },
      ]);
    } else {
      // Simulate API call
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('Tournament created online:', tournament);
      } catch (error) {
        console.error('Failed to create tournament online:', error);
      }
    }
  };

  const updateTournament = async (id: number, updates: any) => {
    setTournaments(prev =>
      prev.map(t =>
        t.id === id ? { ...t, ...updates, lastModified: Date.now() } : t
      )
    );

    if (!isOnline) {
      setSyncQueue(prev => [
        ...prev,
        {
          action: 'update',
          type: 'tournament',
          id,
          data: updates,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const syncOfflineChanges = async () => {
    if (!isOnline || syncQueue.length === 0) return;

    try {
      // Simulate syncing changes
      for (const change of syncQueue) {
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('Synced change:', change);
      }

      setSyncQueue([]);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div data-testid="offline-tournament-manager">
      <div data-testid="connection-status">
        {isOnline ? 'Connected' : 'Offline Mode'}
      </div>

      <div data-testid="sync-queue-count">
        Pending Sync: {syncQueue.length} items
      </div>

      <div data-testid="tournament-controls">
        <button
          data-testid="create-tournament"
          onClick={() =>
            createTournament({
              name: 'Test Tournament',
              maxPlayers: 16,
              format: 'swiss',
            })
          }
        >
          Create Tournament
        </button>

        <button
          data-testid="sync-changes"
          onClick={syncOfflineChanges}
          disabled={!isOnline || syncQueue.length === 0}
        >
          Sync Changes
        </button>
      </div>

      <div data-testid="tournament-list">
        {tournaments.map(tournament => (
          <div key={tournament.id} data-testid={`tournament-${tournament.id}`}>
            <div>{tournament.name}</div>
            <div>
              {tournament.createdOffline ? 'Created Offline' : 'Created Online'}
            </div>
            <button
              data-testid={`update-tournament-${tournament.id}`}
              onClick={() =>
                updateTournament(tournament.id, {
                  name: tournament.name + ' (Updated)',
                })
              }
            >
              Update
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Cache management component
const CacheManager = () => {
  const [cacheStatus, setCacheStatus] = React.useState<
    'unknown' | 'available' | 'unavailable'
  >('unknown');
  const [cachedResources, setCachedResources] = React.useState<string[]>([]);
  const [cacheSize, setCacheSize] = React.useState<number>(0);

  React.useEffect(() => {
    checkCacheAvailability();
  }, []);

  const checkCacheAvailability = async () => {
    if ('caches' in window) {
      setCacheStatus('available');
      await updateCacheInfo();
    } else {
      setCacheStatus('unavailable');
    }
  };

  const updateCacheInfo = async () => {
    try {
      const cacheNames = await caches.keys();
      const resources: string[] = [];
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          resources.push(request.url);
          // Estimate size (simplified)
          totalSize += request.url.length * 2; // rough estimate
        }
      }

      setCachedResources(resources);
      setCacheSize(totalSize);
    } catch (error) {
      console.error('Failed to update cache info:', error);
    }
  };

  const addToCache = async (url: string) => {
    try {
      const cache = await caches.open('pawn-v1');
      await cache.add(url);
      await updateCacheInfo();
    } catch (error) {
      console.error('Failed to add to cache:', error);
    }
  };

  const clearCache = async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      await updateCacheInfo();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  return (
    <div data-testid="cache-manager">
      <div data-testid="cache-status">Cache API: {cacheStatus}</div>

      <div data-testid="cache-stats">
        <div data-testid="cached-resources-count">
          Cached Resources: {cachedResources.length}
        </div>
        <div data-testid="cache-size">
          Estimated Size: {(cacheSize / 1024).toFixed(2)} KB
        </div>
      </div>

      <div data-testid="cache-controls">
        <button
          data-testid="cache-current-page"
          onClick={() => addToCache(window.location.href)}
          disabled={cacheStatus !== 'available'}
        >
          Cache Current Page
        </button>

        <button
          data-testid="cache-assets"
          onClick={() => {
            const urls = ['/static/js/main.js', '/static/css/main.css'];
            Promise.all(urls.map(url => addToCache(url)));
          }}
          disabled={cacheStatus !== 'available'}
        >
          Cache Essential Assets
        </button>

        <button
          data-testid="clear-all-caches"
          onClick={clearCache}
          disabled={cacheStatus !== 'available'}
        >
          Clear All Caches
        </button>

        <button
          data-testid="refresh-cache-info"
          onClick={updateCacheInfo}
          disabled={cacheStatus !== 'available'}
        >
          Refresh Info
        </button>
      </div>

      <div data-testid="cached-resources-list">
        {cachedResources.slice(0, 10).map((url, index) => (
          <div key={index} data-testid={`cached-resource-${index}`}>
            {url.split('/').pop() || url}
          </div>
        ))}
        {cachedResources.length > 10 && (
          <div data-testid="more-resources">
            ...and {cachedResources.length - 10} more
          </div>
        )}
      </div>
    </div>
  );
};

describe('Offline Functionality and Service Worker Tests', () => {
  let originalNavigator: any;

  beforeEach(() => {
    // Store originals
    originalNavigator = { ...navigator };

    // Mock basic APIs
    ServiceWorkerTestUtils.mockIndexedDB();
    ServiceWorkerTestUtils.mockCacheAPI();
  });

  afterEach(() => {
    // Restore originals
    Object.keys(originalNavigator).forEach(key => {
      Object.defineProperty(navigator, key, {
        value: originalNavigator[key],
        configurable: true,
      });
    });
  });

  describe('Service Worker Registration', () => {
    test('should register service worker successfully', async () => {
      const { mockRegistration } =
        ServiceWorkerTestUtils.createMockServiceWorker();
      ServiceWorkerTestUtils.mockServiceWorkerAPI(mockRegistration);

      const user = userEvent.setup();
      render(<ServiceWorkerRegistration />);

      const registerButton = screen.getByTestId('register-sw');
      await user.click(registerButton);

      await waitFor(() => {
        expect(screen.getByTestId('registration-state')).toHaveTextContent(
          'Registration: registered'
        );
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
      });
    });

    test('should handle service worker registration failure', async () => {
      ServiceWorkerTestUtils.mockServiceWorkerAPI();
      (navigator.serviceWorker.register as jest.Mock).mockRejectedValue(
        new Error('Registration failed')
      );

      const user = userEvent.setup();
      render(<ServiceWorkerRegistration />);

      const registerButton = screen.getByTestId('register-sw');
      await user.click(registerButton);

      await waitFor(() => {
        expect(screen.getByTestId('registration-state')).toHaveTextContent(
          'Registration: error'
        );
      });
    });

    test('should handle service worker updates', async () => {
      const { mockRegistration } =
        ServiceWorkerTestUtils.createMockServiceWorker();
      ServiceWorkerTestUtils.mockServiceWorkerAPI(mockRegistration);

      const user = userEvent.setup();
      render(<ServiceWorkerRegistration />);

      // Register first
      await user.click(screen.getByTestId('register-sw'));

      await waitFor(() => {
        expect(screen.getByTestId('registration-state')).toHaveTextContent(
          'registered'
        );
      });

      // Simulate update available
      const updateEvent = new Event('updatefound');
      mockRegistration.dispatchEvent(updateEvent);

      // Test update button
      await user.click(screen.getByTestId('update-sw'));
      expect(mockRegistration.update).toHaveBeenCalled();
    });

    test('should unregister service worker', async () => {
      const { mockRegistration } =
        ServiceWorkerTestUtils.createMockServiceWorker();
      ServiceWorkerTestUtils.mockServiceWorkerAPI(mockRegistration);

      const user = userEvent.setup();
      render(<ServiceWorkerRegistration />);

      // Register first
      await user.click(screen.getByTestId('register-sw'));

      await waitFor(() => {
        expect(screen.getByTestId('registration-state')).toHaveTextContent(
          'registered'
        );
      });

      // Unregister
      await user.click(screen.getByTestId('unregister-sw'));

      await waitFor(() => {
        expect(mockRegistration.unregister).toHaveBeenCalled();
        expect(screen.getByTestId('registration-state')).toHaveTextContent(
          'unregistered'
        );
      });
    });
  });

  describe('Offline Storage Management', () => {
    test('should detect online/offline status changes', async () => {
      render(<OfflineStorageManager />);

      // Initially online
      expect(screen.getByTestId('network-status')).toHaveTextContent(
        'Status: Online'
      );

      // Go offline
      ServiceWorkerTestUtils.mockNetworkStatus(false);

      await waitFor(() => {
        expect(screen.getByTestId('network-status')).toHaveTextContent(
          'Status: Offline'
        );
      });

      // Go back online
      ServiceWorkerTestUtils.mockNetworkStatus(true);

      await waitFor(() => {
        expect(screen.getByTestId('network-status')).toHaveTextContent(
          'Status: Online'
        );
      });
    });

    test('should manage offline data queue', async () => {
      const user = userEvent.setup();
      render(<OfflineStorageManager />);

      // Add offline items
      await user.click(screen.getByTestId('add-offline-item'));
      await user.click(screen.getByTestId('add-offline-item'));

      expect(screen.getByTestId('offline-data-count')).toHaveTextContent(
        'Offline Items: 2'
      );
      expect(screen.getByTestId('offline-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('offline-item-1')).toBeInTheDocument();
    });

    test('should sync offline data when online', async () => {
      const user = userEvent.setup();
      render(<OfflineStorageManager />);

      // Add offline items
      await user.click(screen.getByTestId('add-offline-item'));
      expect(screen.getByTestId('offline-data-count')).toHaveTextContent(
        'Offline Items: 1'
      );

      // Sync data
      await user.click(screen.getByTestId('sync-data'));

      expect(screen.getByTestId('sync-status')).toHaveTextContent(
        'Sync: syncing'
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('sync-status')).toHaveTextContent(
            'Sync: idle'
          );
          expect(screen.getByTestId('offline-data-count')).toHaveTextContent(
            'Offline Items: 0'
          );
        },
        { timeout: 2000 }
      );
    });

    test('should clear offline data', async () => {
      const user = userEvent.setup();
      render(<OfflineStorageManager />);

      // Add items
      await user.click(screen.getByTestId('add-offline-item'));
      expect(screen.getByTestId('offline-data-count')).toHaveTextContent(
        'Offline Items: 1'
      );

      // Clear data
      await user.click(screen.getByTestId('clear-offline-data'));
      expect(screen.getByTestId('offline-data-count')).toHaveTextContent(
        'Offline Items: 0'
      );
    });

    test('should display storage usage information', () => {
      // Mock storage estimate
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            quota: 1024 * 1024 * 100, // 100MB
            usage: 1024 * 1024 * 25, // 25MB
          }),
        },
        configurable: true,
      });

      render(<OfflineStorageManager />);

      waitFor(() => {
        expect(screen.getByTestId('storage-usage')).toHaveTextContent(
          'Storage: 25.0% used'
        );
      });
    });
  });

  describe('Offline Tournament Management', () => {
    test('should create tournaments offline', async () => {
      const user = userEvent.setup();

      // Start offline
      ServiceWorkerTestUtils.mockNetworkStatus(false);

      render(<OfflineTournamentManager />);

      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Offline Mode'
      );

      await user.click(screen.getByTestId('create-tournament'));

      await waitFor(() => {
        expect(screen.getByTestId('sync-queue-count')).toHaveTextContent(
          'Pending Sync: 1 items'
        );
        expect(screen.getByText('Created Offline')).toBeInTheDocument();
      });
    });

    test('should create tournaments online', async () => {
      const user = userEvent.setup();

      // Ensure online
      ServiceWorkerTestUtils.mockNetworkStatus(true);

      render(<OfflineTournamentManager />);

      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Connected'
      );

      await user.click(screen.getByTestId('create-tournament'));

      await waitFor(() => {
        expect(screen.getByText('Created Online')).toBeInTheDocument();
        expect(screen.getByTestId('sync-queue-count')).toHaveTextContent(
          'Pending Sync: 0 items'
        );
      });
    });

    test('should queue updates when offline', async () => {
      const user = userEvent.setup();

      render(<OfflineTournamentManager />);

      // Create tournament online first
      await user.click(screen.getByTestId('create-tournament'));

      await waitFor(() => {
        expect(screen.getByText('Test Tournament')).toBeInTheDocument();
      });

      // Go offline
      ServiceWorkerTestUtils.mockNetworkStatus(false);

      // Update tournament
      const updateButton = screen.getByTestId(/^update-tournament-\d+$/);
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByTestId('sync-queue-count')).toHaveTextContent(
          'Pending Sync: 1 items'
        );
        expect(
          screen.getByText('Test Tournament (Updated)')
        ).toBeInTheDocument();
      });
    });

    test('should sync changes when back online', async () => {
      const user = userEvent.setup();

      // Start offline
      ServiceWorkerTestUtils.mockNetworkStatus(false);

      render(<OfflineTournamentManager />);

      // Create tournament offline
      await user.click(screen.getByTestId('create-tournament'));

      await waitFor(() => {
        expect(screen.getByTestId('sync-queue-count')).toHaveTextContent(
          'Pending Sync: 1 items'
        );
      });

      // Go online
      ServiceWorkerTestUtils.mockNetworkStatus(true);

      // Sync changes
      await user.click(screen.getByTestId('sync-changes'));

      await waitFor(
        () => {
          expect(screen.getByTestId('sync-queue-count')).toHaveTextContent(
            'Pending Sync: 0 items'
          );
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Cache Management', () => {
    test('should detect cache API availability', async () => {
      render(<CacheManager />);

      await waitFor(() => {
        expect(screen.getByTestId('cache-status')).toHaveTextContent(
          'Cache API: available'
        );
      });
    });

    test('should add resources to cache', async () => {
      const { mockCache } = ServiceWorkerTestUtils.mockCacheAPI();
      const user = userEvent.setup();

      render(<CacheManager />);

      await user.click(screen.getByTestId('cache-current-page'));

      expect(mockCache.add).toHaveBeenCalled();
    });

    test('should cache essential assets', async () => {
      const { mockCache } = ServiceWorkerTestUtils.mockCacheAPI();
      const user = userEvent.setup();

      render(<CacheManager />);

      await user.click(screen.getByTestId('cache-assets'));

      await waitFor(() => {
        expect(mockCache.add).toHaveBeenCalledWith('/static/js/main.js');
        expect(mockCache.add).toHaveBeenCalledWith('/static/css/main.css');
      });
    });

    test('should clear all caches', async () => {
      const { mockCaches } = ServiceWorkerTestUtils.mockCacheAPI();
      mockCaches.keys.mockResolvedValue(['cache1', 'cache2']);

      const user = userEvent.setup();
      render(<CacheManager />);

      await user.click(screen.getByTestId('clear-all-caches'));

      await waitFor(() => {
        expect(mockCaches.delete).toHaveBeenCalledWith('cache1');
        expect(mockCaches.delete).toHaveBeenCalledWith('cache2');
      });
    });

    test('should display cache statistics', async () => {
      const { mockCache, mockCaches } = ServiceWorkerTestUtils.mockCacheAPI();

      mockCaches.keys.mockResolvedValue(['pawn-v1']);
      mockCache.keys.mockResolvedValue([
        { url: '/static/js/main.js' },
        { url: '/static/css/main.css' },
        { url: '/index.html' },
      ]);

      render(<CacheManager />);

      await waitFor(() => {
        expect(screen.getByTestId('cached-resources-count')).toHaveTextContent(
          'Cached Resources: 3'
        );
      });
    });

    test('should refresh cache information', async () => {
      const { mockCaches } = ServiceWorkerTestUtils.mockCacheAPI();
      const user = userEvent.setup();

      render(<CacheManager />);

      await user.click(screen.getByTestId('refresh-cache-info'));

      expect(mockCaches.keys).toHaveBeenCalled();
    });

    test('should handle cache API unavailability', () => {
      // Remove cache API
      Object.defineProperty(window, 'caches', {
        value: undefined,
        configurable: true,
      });

      render(<CacheManager />);

      expect(screen.getByTestId('cache-status')).toHaveTextContent(
        'Cache API: unavailable'
      );

      // Buttons should be disabled
      expect(screen.getByTestId('cache-current-page')).toBeDisabled();
      expect(screen.getByTestId('clear-all-caches')).toBeDisabled();
    });
  });

  describe('IndexedDB Integration', () => {
    test('should open IndexedDB successfully', async () => {
      const { mockDB } = ServiceWorkerTestUtils.mockIndexedDB();

      const openDBPromise = new Promise(resolve => {
        const request = indexedDB.open('test-db', 1);
        request.onsuccess = () => resolve(request.result);
      });

      const db = await openDBPromise;
      expect(db).toBe(mockDB);
    });

    test('should handle IndexedDB transactions', async () => {
      const { mockDB, mockObjectStore } =
        ServiceWorkerTestUtils.mockIndexedDB();

      // Simulate transaction
      const transaction = mockDB.transaction(['tournaments'], 'readwrite');
      const store = transaction.objectStore('tournaments');

      await store.add({ name: 'Test Tournament', id: 1 });

      expect(mockObjectStore.add).toHaveBeenCalledWith({
        name: 'Test Tournament',
        id: 1,
      });
    });

    test('should retrieve data from IndexedDB', async () => {
      const { mockDB, mockObjectStore } =
        ServiceWorkerTestUtils.mockIndexedDB();

      const testData = { name: 'Test Tournament', id: 1 };
      mockObjectStore.get.mockResolvedValue(testData);

      const transaction = mockDB.transaction(['tournaments'], 'readonly');
      const store = transaction.objectStore('tournaments');
      const result = await store.get(1);

      expect(result).toEqual(testData);
    });
  });

  describe('Background Sync Simulation', () => {
    test('should queue operations for background sync', async () => {
      const user = userEvent.setup();

      // Start offline
      ServiceWorkerTestUtils.mockNetworkStatus(false);

      const BackgroundSyncComponent = () => {
        const [syncQueue, setSyncQueue] = React.useState<any[]>([]);
        const [isOnline, setIsOnline] = React.useState(navigator.onLine);

        React.useEffect(() => {
          const handleOnline = () => setIsOnline(true);
          const handleOffline = () => setIsOnline(false);

          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);

          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }, []);

        const addToSyncQueue = (operation: any) => {
          setSyncQueue(prev => [...prev, operation]);
        };

        const processSyncQueue = async () => {
          if (!isOnline) return;

          // Process all queued operations
          for (const operation of syncQueue) {
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('Processed sync operation:', operation);
          }

          setSyncQueue([]);
        };

        return (
          <div data-testid="background-sync-component">
            <div data-testid="sync-queue-length">
              Queue Length: {syncQueue.length}
            </div>

            <button
              data-testid="add-operation"
              onClick={() =>
                addToSyncQueue({ type: 'create', data: { id: Date.now() } })
              }
            >
              Add Operation
            </button>

            <button
              data-testid="process-queue"
              onClick={processSyncQueue}
              disabled={!isOnline || syncQueue.length === 0}
            >
              Process Queue
            </button>
          </div>
        );
      };

      render(<BackgroundSyncComponent />);

      // Add operations while offline
      await user.click(screen.getByTestId('add-operation'));
      await user.click(screen.getByTestId('add-operation'));

      expect(screen.getByTestId('sync-queue-length')).toHaveTextContent(
        'Queue Length: 2'
      );

      // Go online and process
      ServiceWorkerTestUtils.mockNetworkStatus(true);

      await user.click(screen.getByTestId('process-queue'));

      await waitFor(() => {
        expect(screen.getByTestId('sync-queue-length')).toHaveTextContent(
          'Queue Length: 0'
        );
      });
    });
  });

  describe('Performance and Storage Limits', () => {
    test('should handle storage quota exceeded scenarios', async () => {
      // Mock storage quota exceeded
      const mockStorage = {
        estimate: jest.fn().mockResolvedValue({
          quota: 1024 * 1024 * 50, // 50MB
          usage: 1024 * 1024 * 48, // 48MB (96% used)
        }),
      };

      Object.defineProperty(navigator, 'storage', {
        value: mockStorage,
        configurable: true,
      });

      const StorageWarningComponent = () => {
        const [storageInfo, setStorageInfo] = React.useState<any>(null);
        const [warning, setWarning] = React.useState<string | null>(null);

        React.useEffect(() => {
          if ('storage' in navigator) {
            navigator.storage.estimate().then(estimate => {
              setStorageInfo(estimate);
              const usage = estimate.usage || 0;
              const quota = estimate.quota || 0;
              const percentage = quota > 0 ? (usage / quota) * 100 : 0;

              if (percentage > 90) {
                setWarning('Storage almost full! Consider clearing cache.');
              }
            });
          }
        }, []);

        return (
          <div data-testid="storage-warning-component">
            {warning && (
              <div data-testid="storage-warning" role="alert">
                {warning}
              </div>
            )}
            {storageInfo && (
              <div data-testid="storage-percentage">
                {((storageInfo.usage / storageInfo.quota) * 100).toFixed(1)}%
                used
              </div>
            )}
          </div>
        );
      };

      render(<StorageWarningComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('storage-warning')).toBeInTheDocument();
        expect(screen.getByTestId('storage-percentage')).toHaveTextContent(
          '96.0% used'
        );
      });
    });
  });
});
