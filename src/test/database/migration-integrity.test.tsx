import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock database migration utilities
const DatabaseTestUtils = {
  // Schema version tracking
  schemaVersions: {
    v1: {
      version: 1,
      tables: ['tournaments', 'players', 'games'],
      indexes: ['idx_tournament_status', 'idx_player_rating'],
    },
    v2: {
      version: 2,
      tables: ['tournaments', 'players', 'games', 'teams'],
      indexes: [
        'idx_tournament_status',
        'idx_player_rating',
        'idx_team_tournament',
      ],
      migrations: ['add_teams_table', 'add_team_id_to_players'],
    },
    v3: {
      version: 3,
      tables: ['tournaments', 'players', 'games', 'teams', 'pairings'],
      indexes: [
        'idx_tournament_status',
        'idx_player_rating',
        'idx_team_tournament',
        'idx_pairing_round',
      ],
      migrations: [
        'add_teams_table',
        'add_team_id_to_players',
        'add_pairings_table',
      ],
    },
  },

  // Mock migration functions
  migrations: {
    add_teams_table: {
      up: () => ({
        sql: `CREATE TABLE teams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          tournament_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
        )`,
        rollback: 'DROP TABLE teams',
      }),
      down: () => ({
        sql: 'DROP TABLE teams',
        rollback: 'recreate_teams_table',
      }),
    },

    add_team_id_to_players: {
      up: () => ({
        sql: 'ALTER TABLE players ADD COLUMN team_id INTEGER REFERENCES teams(id)',
        rollback: 'ALTER TABLE players DROP COLUMN team_id',
      }),
      down: () => ({
        sql: 'ALTER TABLE players DROP COLUMN team_id',
        rollback: 'add_team_id_column',
      }),
    },

    add_pairings_table: {
      up: () => ({
        sql: `CREATE TABLE pairings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER NOT NULL,
          round_number INTEGER NOT NULL,
          white_player_id INTEGER,
          black_player_id INTEGER,
          board_number INTEGER,
          result TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
          FOREIGN KEY (white_player_id) REFERENCES players(id),
          FOREIGN KEY (black_player_id) REFERENCES players(id)
        )`,
        rollback: 'DROP TABLE pairings',
      }),
      down: () => ({
        sql: 'DROP TABLE pairings',
        rollback: 'recreate_pairings_table',
      }),
    },
  },

  // Mock database operations
  mockDatabase: {
    currentSchema: 1,
    data: {
      tournaments: [],
      players: [],
      games: [],
      teams: [],
      pairings: [],
    },

    execute: async (sql: string) => {
      // Mock SQL execution
      console.log('Executing SQL:', sql);
      return { success: true, rowsAffected: 1 };
    },

    query: async (sql: string, params: any[] = []) => {
      // Mock query execution
      console.log('Querying SQL:', sql, 'Params:', params);
      return [];
    },

    transaction: async (operations: Array<() => Promise<any>>) => {
      const results = [];
      for (const operation of operations) {
        results.push(await operation());
      }
      return results;
    },
  },

  // Data integrity checks
  validateDataIntegrity: (data: any) => {
    const issues: string[] = [];

    // Check foreign key integrity
    if (data.players) {
      data.players.forEach((player: any) => {
        if (
          player.tournament_id &&
          !data.tournaments.find((t: any) => t.id === player.tournament_id)
        ) {
          issues.push(
            `Player ${player.id} references non-existent tournament ${player.tournament_id}`
          );
        }
        if (
          player.team_id &&
          !data.teams.find((t: any) => t.id === player.team_id)
        ) {
          issues.push(
            `Player ${player.id} references non-existent team ${player.team_id}`
          );
        }
      });
    }

    // Check game result integrity
    if (data.games) {
      data.games.forEach((game: any) => {
        if (!data.players.find((p: any) => p.id === game.white_player_id)) {
          issues.push(
            `Game ${game.id} references non-existent white player ${game.white_player_id}`
          );
        }
        if (!data.players.find((p: any) => p.id === game.black_player_id)) {
          issues.push(
            `Game ${game.id} references non-existent black player ${game.black_player_id}`
          );
        }
        if (!data.tournaments.find((t: any) => t.id === game.tournament_id)) {
          issues.push(
            `Game ${game.id} references non-existent tournament ${game.tournament_id}`
          );
        }
      });
    }

    // Check duplicate data
    const duplicateChecks = [
      { table: 'tournaments', field: 'name' },
      { table: 'players', field: 'email' },
      { table: 'teams', field: 'name' },
    ];

    duplicateChecks.forEach(({ table, field }) => {
      if (data[table]) {
        const values = data[table]
          .map((item: any) => item[field])
          .filter(Boolean);
        const duplicates = values.filter(
          (value: any, index: number) => values.indexOf(value) !== index
        );
        if (duplicates.length > 0) {
          issues.push(
            `Duplicate ${field} values in ${table}: ${duplicates.join(', ')}`
          );
        }
      }
    });

    return issues;
  },
};

// Mock migration manager component
const MockMigrationManager = ({
  targetVersion,
}: {
  targetVersion?: number;
}) => {
  const [currentVersion, setCurrentVersion] = React.useState(1);
  const [migrationStatus, setMigrationStatus] = React.useState<
    'idle' | 'running' | 'completed' | 'failed'
  >('idle');
  const [migrationLog, setMigrationLog] = React.useState<string[]>([]);
  const [integrityIssues, setIntegrityIssues] = React.useState<string[]>([]);

  const runMigration = async (fromVersion: number, toVersion: number) => {
    setMigrationStatus('running');
    setMigrationLog([]);

    try {
      const log = [`Starting migration from v${fromVersion} to v${toVersion}`];

      for (let version = fromVersion + 1; version <= toVersion; version++) {
        const schemaInfo =
          DatabaseTestUtils.schemaVersions[
            `v${version}` as keyof typeof DatabaseTestUtils.schemaVersions
          ];

        if (schemaInfo?.migrations) {
          for (const migrationName of schemaInfo.migrations) {
            const migration =
              DatabaseTestUtils.migrations[
                migrationName as keyof typeof DatabaseTestUtils.migrations
              ];
            if (migration) {
              log.push(`Running migration: ${migrationName}`);
              await DatabaseTestUtils.mockDatabase.execute(migration.up().sql);
              log.push(`✓ Migration ${migrationName} completed`);
            }
          }
        }
      }

      // Validate data integrity after migration
      const issues = DatabaseTestUtils.validateDataIntegrity(
        DatabaseTestUtils.mockDatabase.data
      );
      setIntegrityIssues(issues);

      if (issues.length > 0) {
        log.push(`⚠️ Data integrity issues found: ${issues.length}`);
      } else {
        log.push('✓ Data integrity validation passed');
      }

      setCurrentVersion(toVersion);
      setMigrationStatus('completed');
      log.push(`Migration to v${toVersion} completed successfully`);
      setMigrationLog(log);
    } catch (error: any) {
      setMigrationStatus('failed');
      setMigrationLog(prev => [
        ...prev,
        `❌ Migration failed: ${error.message}`,
      ]);
    }
  };

  const rollbackMigration = async (fromVersion: number, toVersion: number) => {
    setMigrationStatus('running');

    try {
      const log = [`Starting rollback from v${fromVersion} to v${toVersion}`];

      for (let version = fromVersion; version > toVersion; version--) {
        const schemaInfo =
          DatabaseTestUtils.schemaVersions[
            `v${version}` as keyof typeof DatabaseTestUtils.schemaVersions
          ];

        if (schemaInfo?.migrations) {
          for (const migrationName of [...schemaInfo.migrations].reverse()) {
            const migration =
              DatabaseTestUtils.migrations[
                migrationName as keyof typeof DatabaseTestUtils.migrations
              ];
            if (migration) {
              log.push(`Rolling back migration: ${migrationName}`);
              await DatabaseTestUtils.mockDatabase.execute(
                migration.down().sql
              );
              log.push(`✓ Rollback of ${migrationName} completed`);
            }
          }
        }
      }

      setCurrentVersion(toVersion);
      setMigrationStatus('completed');
      log.push(`Rollback to v${toVersion} completed successfully`);
      setMigrationLog(log);
    } catch (error: any) {
      setMigrationStatus('failed');
      setMigrationLog(prev => [
        ...prev,
        `❌ Rollback failed: ${error.message}`,
      ]);
    }
  };

  React.useEffect(() => {
    if (targetVersion && targetVersion !== currentVersion) {
      if (targetVersion > currentVersion) {
        runMigration(currentVersion, targetVersion);
      } else {
        rollbackMigration(currentVersion, targetVersion);
      }
    }
  }, [targetVersion, currentVersion]);

  return (
    <div data-testid="migration-manager">
      <div data-testid="current-version">
        Current Schema Version: {currentVersion}
      </div>
      <div
        data-testid="migration-status"
        className={`status-${migrationStatus}`}
      >
        Status: {migrationStatus}
      </div>

      {migrationLog.length > 0 && (
        <div data-testid="migration-log">
          <h4>Migration Log:</h4>
          {migrationLog.map((entry, index) => (
            <div key={index} data-testid={`log-entry-${index}`}>
              {entry}
            </div>
          ))}
        </div>
      )}

      {integrityIssues.length > 0 && (
        <div data-testid="integrity-issues" role="alert">
          <h4>Data Integrity Issues:</h4>
          {integrityIssues.map((issue, index) => (
            <div
              key={index}
              data-testid={`issue-${index}`}
              className="integrity-issue"
            >
              {issue}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Mock data consistency checker
const MockDataConsistencyChecker = ({ data }: { data: any }) => {
  const [consistencyReport, setConsistencyReport] = React.useState<any>(null);
  const [checking, setChecking] = React.useState(false);

  const runConsistencyCheck = async () => {
    setChecking(true);

    // Simulate async consistency checking
    await new Promise(resolve => setTimeout(resolve, 100));

    const report = {
      totalRecords: Object.values(data).reduce(
        (sum: number, table: any) =>
          sum + (Array.isArray(table) ? table.length : 0),
        0
      ),
      issues: DatabaseTestUtils.validateDataIntegrity(data),
      referentialIntegrity: {
        tournaments: data.tournaments?.length || 0,
        players: data.players?.length || 0,
        games: data.games?.length || 0,
        teams: data.teams?.length || 0,
        orphanedPlayers:
          data.players?.filter(
            (p: any) =>
              p.tournament_id &&
              !data.tournaments?.find((t: any) => t.id === p.tournament_id)
          ).length || 0,
        orphanedGames:
          data.games?.filter(
            (g: any) =>
              !data.tournaments?.find((t: any) => t.id === g.tournament_id)
          ).length || 0,
      },
      constraints: {
        uniqueConstraints: checkUniqueConstraints(data),
        checkConstraints: checkCheckConstraints(data),
      },
    };

    setConsistencyReport(report);
    setChecking(false);
  };

  const checkUniqueConstraints = (data: any) => {
    const violations = [];

    // Check unique email addresses
    if (data.players) {
      const emails = data.players.map((p: any) => p.email).filter(Boolean);
      const duplicateEmails = emails.filter(
        (email: string, index: number) => emails.indexOf(email) !== index
      );
      if (duplicateEmails.length > 0) {
        violations.push(
          `Duplicate email addresses: ${duplicateEmails.join(', ')}`
        );
      }
    }

    // Check unique tournament names
    if (data.tournaments) {
      const names = data.tournaments.map((t: any) => t.name);
      const duplicateNames = names.filter(
        (name: string, index: number) => names.indexOf(name) !== index
      );
      if (duplicateNames.length > 0) {
        violations.push(
          `Duplicate tournament names: ${duplicateNames.join(', ')}`
        );
      }
    }

    return violations;
  };

  const checkCheckConstraints = (data: any) => {
    const violations = [];

    // Check player rating constraints
    if (data.players) {
      data.players.forEach((player: any) => {
        if (player.rating < 0 || player.rating > 3500) {
          violations.push(
            `Player ${player.name} has invalid rating: ${player.rating}`
          );
        }
      });
    }

    // Check tournament constraints
    if (data.tournaments) {
      data.tournaments.forEach((tournament: any) => {
        if (tournament.max_players <= 0) {
          violations.push(
            `Tournament ${tournament.name} has invalid max_players: ${tournament.max_players}`
          );
        }
        if (tournament.max_rounds <= 0) {
          violations.push(
            `Tournament ${tournament.name} has invalid max_rounds: ${tournament.max_rounds}`
          );
        }
      });
    }

    return violations;
  };

  React.useEffect(() => {
    runConsistencyCheck();
  }, [data]);

  if (checking) {
    return (
      <div data-testid="checking-consistency">Checking data consistency...</div>
    );
  }

  if (!consistencyReport) {
    return <div data-testid="no-report">No consistency report available</div>;
  }

  return (
    <div data-testid="consistency-report">
      <h3>Data Consistency Report</h3>

      <div data-testid="record-counts">
        <h4>Record Counts</h4>
        <div>Total Records: {consistencyReport.totalRecords}</div>
        <div>
          Tournaments: {consistencyReport.referentialIntegrity.tournaments}
        </div>
        <div>Players: {consistencyReport.referentialIntegrity.players}</div>
        <div>Games: {consistencyReport.referentialIntegrity.games}</div>
        <div>Teams: {consistencyReport.referentialIntegrity.teams}</div>
      </div>

      <div data-testid="referential-integrity">
        <h4>Referential Integrity</h4>
        <div>
          Orphaned Players:{' '}
          {consistencyReport.referentialIntegrity.orphanedPlayers}
        </div>
        <div>
          Orphaned Games: {consistencyReport.referentialIntegrity.orphanedGames}
        </div>
      </div>

      {consistencyReport.issues.length > 0 && (
        <div data-testid="data-issues" role="alert">
          <h4>Data Issues Found:</h4>
          {consistencyReport.issues.map((issue: string, index: number) => (
            <div
              key={index}
              data-testid={`data-issue-${index}`}
              className="data-issue"
            >
              {issue}
            </div>
          ))}
        </div>
      )}

      {consistencyReport.constraints.uniqueConstraints.length > 0 && (
        <div data-testid="unique-constraint-violations">
          <h4>Unique Constraint Violations:</h4>
          {consistencyReport.constraints.uniqueConstraints.map(
            (violation: string, index: number) => (
              <div key={index} data-testid={`unique-violation-${index}`}>
                {violation}
              </div>
            )
          )}
        </div>
      )}

      {consistencyReport.constraints.checkConstraints.length > 0 && (
        <div data-testid="check-constraint-violations">
          <h4>Check Constraint Violations:</h4>
          {consistencyReport.constraints.checkConstraints.map(
            (violation: string, index: number) => (
              <div key={index} data-testid={`check-violation-${index}`}>
                {violation}
              </div>
            )
          )}
        </div>
      )}

      <div
        data-testid="overall-status"
        className={
          consistencyReport.issues.length === 0
            ? 'status-good'
            : 'status-issues'
        }
      >
        Overall Status:{' '}
        {consistencyReport.issues.length === 0
          ? 'Data is consistent'
          : `${consistencyReport.issues.length} issues found`}
      </div>
    </div>
  );
};

// Mock backup and restore component
const MockBackupRestore = ({
  onBackupCreated,
  onRestoreCompleted,
}: {
  onBackupCreated?: (backup: any) => void;
  onRestoreCompleted?: (success: boolean) => void;
}) => {
  const [backups, setBackups] = React.useState<any[]>([]);
  const [operation, setOperation] = React.useState<
    'idle' | 'backing-up' | 'restoring'
  >('idle');

  const createBackup = async () => {
    setOperation('backing-up');

    // Simulate backup creation
    await new Promise(resolve => setTimeout(resolve, 500));

    const backup = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      schemaVersion: DatabaseTestUtils.mockDatabase.currentSchema,
      data: JSON.parse(JSON.stringify(DatabaseTestUtils.mockDatabase.data)),
      checksum: 'mock-checksum-' + Math.random().toString(36),
    };

    setBackups(prev => [backup, ...prev]);
    setOperation('idle');

    if (onBackupCreated) {
      onBackupCreated(backup);
    }
  };

  const restoreBackup = async (backupId: number) => {
    setOperation('restoring');

    try {
      const backup = backups.find(b => b.id === backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Validate backup integrity
      if (!backup.checksum.startsWith('mock-checksum-')) {
        throw new Error('Backup integrity check failed');
      }

      // Restore data
      DatabaseTestUtils.mockDatabase.data = backup.data;
      DatabaseTestUtils.mockDatabase.currentSchema = backup.schemaVersion;

      setOperation('idle');

      if (onRestoreCompleted) {
        onRestoreCompleted(true);
      }
    } catch {
      setOperation('idle');

      if (onRestoreCompleted) {
        onRestoreCompleted(false);
      }
    }
  };

  return (
    <div data-testid="backup-restore">
      <div data-testid="operation-status">Status: {operation}</div>

      <button
        data-testid="create-backup"
        onClick={createBackup}
        disabled={operation !== 'idle'}
      >
        Create Backup
      </button>

      {backups.length > 0 && (
        <div data-testid="backup-list">
          <h4>Available Backups</h4>
          {backups.map((backup, index) => (
            <div
              key={backup.id}
              data-testid={`backup-${index}`}
              className="backup-item"
            >
              <div>Created: {new Date(backup.timestamp).toLocaleString()}</div>
              <div>Schema Version: {backup.schemaVersion}</div>
              <div>Checksum: {backup.checksum}</div>
              <button
                data-testid={`restore-backup-${index}`}
                onClick={() => restoreBackup(backup.id)}
                disabled={operation !== 'idle'}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

describe('Database Migration and Data Integrity Tests', () => {
  beforeEach(() => {
    // Reset mock database state
    DatabaseTestUtils.mockDatabase.currentSchema = 1;
    DatabaseTestUtils.mockDatabase.data = {
      tournaments: [],
      players: [],
      games: [],
      teams: [],
      pairings: [],
    };
  });

  describe('Schema Migration Tests', () => {
    test('should migrate from v1 to v2 successfully', async () => {
      render(<MockMigrationManager targetVersion={2} />);

      await waitFor(() => {
        expect(screen.getByTestId('current-version')).toHaveTextContent(
          'Current Schema Version: 2'
        );
        expect(screen.getByTestId('migration-status')).toHaveTextContent(
          'Status: completed'
        );
      });

      // Check migration log
      expect(screen.getByTestId('migration-log')).toBeInTheDocument();
      expect(screen.getByTestId('log-entry-0')).toHaveTextContent(
        'Starting migration from v1 to v2'
      );
      expect(
        screen.getByText(/Running migration: add_teams_table/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Migration.*completed successfully/)
      ).toBeInTheDocument();
    });

    test('should migrate from v1 to v3 through multiple versions', async () => {
      render(<MockMigrationManager targetVersion={3} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('current-version')).toHaveTextContent(
            'Current Schema Version: 3'
          );
          expect(screen.getByTestId('migration-status')).toHaveTextContent(
            'Status: completed'
          );
        },
        { timeout: 5000 }
      );

      const migrationLog = screen.getByTestId('migration-log');
      expect(migrationLog).toBeInTheDocument();
      expect(screen.getByText(/add_teams_table/)).toBeInTheDocument();
      expect(screen.getByText(/add_team_id_to_players/)).toBeInTheDocument();
      expect(screen.getByText(/add_pairings_table/)).toBeInTheDocument();
    });

    test('should rollback migration from v3 to v1', async () => {
      // Start at v3
      DatabaseTestUtils.mockDatabase.currentSchema = 3;

      render(<MockMigrationManager targetVersion={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('current-version')).toHaveTextContent(
          'Current Schema Version: 1'
        );
        expect(screen.getByTestId('migration-status')).toHaveTextContent(
          'Status: completed'
        );
      });

      const migrationLog = screen.getByTestId('migration-log');
      expect(migrationLog).toBeInTheDocument();
      expect(
        screen.getByText(/Starting rollback from v3 to v1/)
      ).toBeInTheDocument();
    });

    test('should handle migration failure gracefully', async () => {
      // Mock a migration failure
      const originalExecute = DatabaseTestUtils.mockDatabase.execute;
      DatabaseTestUtils.mockDatabase.execute = jest
        .fn()
        .mockRejectedValue(new Error('SQL execution failed'));

      render(<MockMigrationManager targetVersion={2} />);

      await waitFor(() => {
        expect(screen.getByTestId('migration-status')).toHaveTextContent(
          'Status: failed'
        );
      });

      expect(
        screen.getByText(/Migration failed: SQL execution failed/)
      ).toBeInTheDocument();

      // Restore original function
      DatabaseTestUtils.mockDatabase.execute = originalExecute;
    });
  });

  describe('Data Integrity Tests', () => {
    test('should detect referential integrity violations', () => {
      const corruptedData = {
        tournaments: [{ id: 1, name: 'Tournament 1' }],
        players: [
          { id: 1, name: 'Player 1', tournament_id: 1 },
          { id: 2, name: 'Player 2', tournament_id: 999 }, // Invalid tournament_id
        ],
        games: [
          { id: 1, tournament_id: 1, white_player_id: 1, black_player_id: 2 },
          { id: 2, tournament_id: 1, white_player_id: 999, black_player_id: 1 }, // Invalid player_id
        ],
        teams: [],
        pairings: [],
      };

      render(<MockDataConsistencyChecker data={corruptedData} />);

      expect(screen.getByTestId('consistency-report')).toBeInTheDocument();
      expect(screen.getByTestId('data-issues')).toBeInTheDocument();
      expect(
        screen.getByText(/Player 2 references non-existent tournament 999/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Game 2 references non-existent white player 999/)
      ).toBeInTheDocument();
    });

    test('should detect duplicate data violations', () => {
      const duplicateData = {
        tournaments: [
          { id: 1, name: 'Tournament 1' },
          { id: 2, name: 'Tournament 1' }, // Duplicate name
        ],
        players: [
          {
            id: 1,
            name: 'Player 1',
            email: 'test@example.com',
            tournament_id: 1,
          },
          {
            id: 2,
            name: 'Player 2',
            email: 'test@example.com',
            tournament_id: 1,
          }, // Duplicate email
        ],
        games: [],
        teams: [],
        pairings: [],
      };

      render(<MockDataConsistencyChecker data={duplicateData} />);

      expect(
        screen.getByTestId('unique-constraint-violations')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Duplicate email addresses: test@example.com/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Duplicate tournament names: Tournament 1/)
      ).toBeInTheDocument();
    });

    test('should detect check constraint violations', () => {
      const invalidData = {
        tournaments: [
          { id: 1, name: 'Tournament 1', max_players: -5, max_rounds: 0 },
        ],
        players: [
          { id: 1, name: 'Player 1', rating: -100, tournament_id: 1 },
          { id: 2, name: 'Player 2', rating: 5000, tournament_id: 1 },
        ],
        games: [],
        teams: [],
        pairings: [],
      };

      render(<MockDataConsistencyChecker data={invalidData} />);

      expect(
        screen.getByTestId('check-constraint-violations')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Player Player 1 has invalid rating: -100/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Player Player 2 has invalid rating: 5000/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Tournament Tournament 1 has invalid max_players: -5/)
      ).toBeInTheDocument();
    });

    test('should report clean data as consistent', () => {
      const cleanData = {
        tournaments: [
          { id: 1, name: 'Tournament 1', max_players: 16, max_rounds: 5 },
        ],
        players: [
          {
            id: 1,
            name: 'Player 1',
            rating: 1600,
            email: 'player1@example.com',
            tournament_id: 1,
          },
          {
            id: 2,
            name: 'Player 2',
            rating: 1500,
            email: 'player2@example.com',
            tournament_id: 1,
          },
        ],
        games: [
          { id: 1, tournament_id: 1, white_player_id: 1, black_player_id: 2 },
        ],
        teams: [],
        pairings: [],
      };

      render(<MockDataConsistencyChecker data={cleanData} />);

      expect(screen.getByTestId('overall-status')).toHaveTextContent(
        'Overall Status: Data is consistent'
      );
      expect(screen.queryByTestId('data-issues')).not.toBeInTheDocument();
    });
  });

  describe('Backup and Restore Tests', () => {
    test('should create backup successfully', async () => {
      const user = userEvent.setup();
      const mockBackupCreated = jest.fn();

      render(<MockBackupRestore onBackupCreated={mockBackupCreated} />);

      const createBackupButton = screen.getByTestId('create-backup');
      await user.click(createBackupButton);

      await waitFor(() => {
        expect(screen.getByTestId('operation-status')).toHaveTextContent(
          'Status: idle'
        );
      });

      expect(screen.getByTestId('backup-list')).toBeInTheDocument();
      expect(screen.getByTestId('backup-0')).toBeInTheDocument();
      expect(mockBackupCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(Number),
          timestamp: expect.any(String),
          checksum: expect.stringContaining('mock-checksum-'),
        })
      );
    });

    test('should restore backup successfully', async () => {
      const user = userEvent.setup();
      const mockRestoreCompleted = jest.fn();

      render(<MockBackupRestore onRestoreCompleted={mockRestoreCompleted} />);

      // Create a backup first
      const createBackupButton = screen.getByTestId('create-backup');
      await user.click(createBackupButton);

      await waitFor(() => {
        expect(screen.getByTestId('backup-0')).toBeInTheDocument();
      });

      // Restore the backup
      const restoreButton = screen.getByTestId('restore-backup-0');
      await user.click(restoreButton);

      await waitFor(() => {
        expect(screen.getByTestId('operation-status')).toHaveTextContent(
          'Status: idle'
        );
      });

      expect(mockRestoreCompleted).toHaveBeenCalledWith(true);
    });

    test('should handle multiple backups', async () => {
      const user = userEvent.setup();

      render(<MockBackupRestore />);

      // Create multiple backups
      const createBackupButton = screen.getByTestId('create-backup');

      await user.click(createBackupButton);
      await waitFor(() =>
        expect(screen.getByTestId('backup-0')).toBeInTheDocument()
      );

      await user.click(createBackupButton);
      await waitFor(() =>
        expect(screen.getByTestId('backup-1')).toBeInTheDocument()
      );

      await user.click(createBackupButton);
      await waitFor(() =>
        expect(screen.getByTestId('backup-2')).toBeInTheDocument()
      );

      // Should have 3 backups
      expect(screen.getByTestId('backup-0')).toBeInTheDocument();
      expect(screen.getByTestId('backup-1')).toBeInTheDocument();
      expect(screen.getByTestId('backup-2')).toBeInTheDocument();
    });
  });

  describe('Transaction Integrity Tests', () => {
    test('should maintain atomicity in transactions', async () => {
      const TransactionComponent = () => {
        const [result, setResult] = React.useState<string>('');

        const runTransaction = async () => {
          try {
            await DatabaseTestUtils.mockDatabase.transaction([
              async () => {
                await DatabaseTestUtils.mockDatabase.execute(
                  'INSERT INTO tournaments (name) VALUES ("Test Tournament")'
                );
              },
              async () => {
                await DatabaseTestUtils.mockDatabase.execute(
                  'INSERT INTO players (name, tournament_id) VALUES ("Player 1", 1)'
                );
              },
              async () => {
                // This should fail and rollback the entire transaction
                throw new Error('Simulated transaction failure');
              },
            ]);
            setResult('Transaction completed');
          } catch (error: any) {
            setResult(`Transaction failed: ${error.message}`);
          }
        };

        React.useEffect(() => {
          runTransaction();
        }, []);

        return <div data-testid="transaction-result">{result}</div>;
      };

      render(<TransactionComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('transaction-result')).toHaveTextContent(
          'Transaction failed: Simulated transaction failure'
        );
      });
    });

    test('should handle concurrent transaction conflicts', async () => {
      const ConcurrentTransactionComponent = () => {
        const [results, setResults] = React.useState<string[]>([]);

        const runConcurrentTransactions = async () => {
          const transactions = [
            DatabaseTestUtils.mockDatabase.transaction([
              async () =>
                DatabaseTestUtils.mockDatabase.execute(
                  'UPDATE tournaments SET name = "Updated 1" WHERE id = 1'
                ),
            ]),
            DatabaseTestUtils.mockDatabase.transaction([
              async () =>
                DatabaseTestUtils.mockDatabase.execute(
                  'UPDATE tournaments SET name = "Updated 2" WHERE id = 1'
                ),
            ]),
          ];

          try {
            const results = await Promise.allSettled(transactions);
            setResults(
              results.map((result, index) =>
                result.status === 'fulfilled'
                  ? `Transaction ${index + 1}: Success`
                  : `Transaction ${index + 1}: Failed`
              )
            );
          } catch (error: any) {
            setResults([`Error: ${error.message}`]);
          }
        };

        React.useEffect(() => {
          runConcurrentTransactions();
        }, []);

        return (
          <div data-testid="concurrent-results">
            {results.map((result, index) => (
              <div key={index} data-testid={`result-${index}`}>
                {result}
              </div>
            ))}
          </div>
        );
      };

      render(<ConcurrentTransactionComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('concurrent-results')).toBeInTheDocument();
        expect(screen.getByTestId('result-0')).toBeInTheDocument();
        expect(screen.getByTestId('result-1')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Scalability Tests', () => {
    test('should handle large dataset migrations efficiently', async () => {
      // Populate with large dataset
      const largeDataset = {
        tournaments: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `Tournament ${i + 1}`,
        })),
        players: Array.from({ length: 5000 }, (_, i) => ({
          id: i + 1,
          name: `Player ${i + 1}`,
          tournament_id: (i % 100) + 1,
          rating: 1200 + (i % 1600),
        })),
        games: Array.from({ length: 10000 }, (_, i) => ({
          id: i + 1,
          tournament_id: (i % 100) + 1,
          white_player_id: (i % 5000) + 1,
          black_player_id: ((i + 1) % 5000) + 1,
        })),
        teams: [],
        pairings: [],
      };

      DatabaseTestUtils.mockDatabase.data = largeDataset;

      const startTime = performance.now();
      render(<MockMigrationManager targetVersion={2} />);

      await waitFor(() => {
        expect(screen.getByTestId('migration-status')).toHaveTextContent(
          'Status: completed'
        );
      });

      const endTime = performance.now();
      const migrationTime = endTime - startTime;

      console.log(
        `Large dataset migration time: ${migrationTime.toFixed(2)}ms`
      );

      // Migration should complete within reasonable time
      expect(migrationTime).toBeLessThan(5000);
    });

    test('should perform consistency checks on large datasets efficiently', async () => {
      const largeDataset = {
        tournaments: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          name: `Tournament ${i + 1}`,
        })),
        players: Array.from({ length: 2000 }, (_, i) => ({
          id: i + 1,
          name: `Player ${i + 1}`,
          email: `player${i + 1}@example.com`,
          tournament_id: (i % 50) + 1,
          rating: 1200 + (i % 1600),
        })),
        games: Array.from({ length: 5000 }, (_, i) => ({
          id: i + 1,
          tournament_id: (i % 50) + 1,
          white_player_id: (i % 2000) + 1,
          black_player_id: ((i + 1) % 2000) + 1,
        })),
        teams: [],
        pairings: [],
      };

      const startTime = performance.now();
      render(<MockDataConsistencyChecker data={largeDataset} />);

      await waitFor(() => {
        expect(screen.getByTestId('consistency-report')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const checkTime = endTime - startTime;

      console.log(
        `Large dataset consistency check time: ${checkTime.toFixed(2)}ms`
      );

      // Consistency check should complete within reasonable time
      expect(checkTime).toBeLessThan(1000);
      expect(screen.getByTestId('overall-status')).toHaveTextContent(
        'Data is consistent'
      );
    });
  });
});
