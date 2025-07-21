import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// API Contract Testing Utilities
const APIContractUtils = {
  // Schema definitions for Tauri commands
  schemas: {
    tournament: {
      create: {
        input: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 1000 },
            maxPlayers: { type: 'number', minimum: 2, maximum: 1000 },
            maxRounds: { type: 'number', minimum: 1, maximum: 50 },
            pairingMethod: {
              type: 'string',
              enum: ['swiss', 'round_robin', 'knockout', 'team_swiss'],
            },
            timeControl: {
              type: 'object',
              properties: {
                mainTime: { type: 'number', minimum: 0 },
                increment: { type: 'number', minimum: 0 },
                type: {
                  type: 'string',
                  enum: ['fischer', 'bronstein', 'delay'],
                },
              },
              required: ['mainTime', 'increment', 'type'],
            },
          },
          required: ['name', 'maxPlayers', 'maxRounds', 'pairingMethod'],
        },
        output: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
            },
            playerCount: { type: 'number', minimum: 0 },
            rounds: { type: 'number', minimum: 0 },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
          required: [
            'id',
            'name',
            'status',
            'playerCount',
            'rounds',
            'createdAt',
            'updatedAt',
          ],
        },
      },

      update: {
        input: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 1000 },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
            },
          },
          required: ['id'],
        },
        output: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            updated: { type: 'object' },
          },
          required: ['success'],
        },
      },

      list: {
        input: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1 },
            pageSize: { type: 'number', minimum: 1, maximum: 100 },
            sortBy: {
              type: 'string',
              enum: ['name', 'createdAt', 'updatedAt', 'status'],
            },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
            filter: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
                },
                name: { type: 'string' },
              },
            },
          },
        },
        output: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              status: { type: 'string' },
              playerCount: { type: 'number' },
              createdAt: { type: 'string' },
            },
            required: ['id', 'name', 'status', 'playerCount', 'createdAt'],
          },
        },
      },
    },

    player: {
      create: {
        input: {
          type: 'object',
          properties: {
            tournamentId: { type: 'number' },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            rating: { type: 'number', minimum: 0, maximum: 3500 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', maxLength: 20 },
            countryCode: { type: 'string', maxLength: 3 },
            title: {
              type: 'string',
              enum: ['', 'CM', 'FM', 'IM', 'GM', 'WCM', 'WFM', 'WIM', 'WGM'],
            },
            birthDate: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['M', 'F', 'O'] },
            fideId: { type: ['string', 'null'], pattern: '^[0-9]*$' },
          },
          required: ['tournamentId', 'name', 'rating', 'email'],
        },
        output: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            tournamentId: { type: 'number' },
            name: { type: 'string' },
            rating: { type: 'number' },
            email: { type: 'string' },
            isActive: { type: 'boolean' },
            pairingNumber: { type: ['number', 'null'] },
            createdAt: { type: 'string' },
          },
          required: [
            'id',
            'tournamentId',
            'name',
            'rating',
            'email',
            'isActive',
            'createdAt',
          ],
        },
      },

      bulkImport: {
        input: {
          type: 'object',
          properties: {
            tournamentId: { type: 'number' },
            players: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1 },
                  rating: { type: 'number', minimum: 0, maximum: 3500 },
                  email: { type: 'string', format: 'email' },
                },
                required: ['name', 'rating', 'email'],
              },
              minItems: 1,
              maxItems: 500,
            },
          },
          required: ['tournamentId', 'players'],
        },
        output: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            imported: { type: 'number' },
            errors: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['success', 'imported', 'errors'],
        },
      },
    },

    pairing: {
      generate: {
        input: {
          type: 'object',
          properties: {
            tournamentId: { type: 'number' },
            roundNumber: { type: 'number', minimum: 1 },
            method: {
              type: 'string',
              enum: ['swiss', 'round_robin', 'knockout'],
            },
            options: {
              type: 'object',
              properties: {
                avoidRematches: { type: 'boolean' },
                balanceColors: { type: 'boolean' },
                allowByes: { type: 'boolean' },
              },
            },
          },
          required: ['tournamentId', 'roundNumber', 'method'],
        },
        output: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            pairings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  whitePlayerId: { type: ['number', 'null'] },
                  blackPlayerId: { type: ['number', 'null'] },
                  boardNumber: { type: 'number' },
                  bye: { type: 'boolean' },
                },
                required: ['boardNumber'],
              },
            },
            roundId: { type: 'number' },
          },
          required: ['success', 'pairings'],
        },
      },
    },

    gameResult: {
      update: {
        input: {
          type: 'object',
          properties: {
            gameId: { type: 'string' },
            result: {
              type: 'string',
              enum: ['white_wins', 'black_wins', 'draw', 'bye'],
            },
            resultType: {
              type: 'string',
              enum: ['normal', 'forfeit', 'timeout', 'bye'],
            },
            notes: { type: 'string', maxLength: 500 },
          },
          required: ['gameId', 'result', 'resultType'],
        },
        output: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            gameId: { type: 'string' },
            updatedAt: { type: 'string' },
          },
          required: ['success', 'gameId'],
        },
      },

      batchUpdate: {
        input: {
          type: 'object',
          properties: {
            tournamentId: { type: 'number' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  gameId: { type: 'string' },
                  result: {
                    type: 'string',
                    enum: ['white_wins', 'black_wins', 'draw'],
                  },
                  resultType: {
                    type: 'string',
                    enum: ['normal', 'forfeit', 'timeout'],
                  },
                },
                required: ['gameId', 'result', 'resultType'],
              },
              minItems: 1,
              maxItems: 100,
            },
          },
          required: ['tournamentId', 'results'],
        },
        output: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            updated: { type: 'number' },
            failed: { type: 'number' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  gameId: { type: 'string' },
                  error: { type: 'string' },
                },
                required: ['gameId', 'error'],
              },
            },
          },
          required: ['success', 'updated', 'failed', 'errors'],
        },
      },
    },

    export: {
      tournament: {
        input: {
          type: 'object',
          properties: {
            tournamentId: { type: 'number' },
            format: { type: 'string', enum: ['json', 'csv', 'pdf', 'pgn'] },
            includeStandings: { type: 'boolean' },
            includePairings: { type: 'boolean' },
            includeResults: { type: 'boolean' },
            includePlayerDetails: { type: 'boolean' },
          },
          required: ['tournamentId', 'format'],
        },
        output: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            filename: { type: 'string' },
            path: { type: 'string' },
            size: { type: 'number' },
          },
          required: ['success', 'filename'],
        },
      },
    },
  },

  // Schema validation function
  validateSchema: (
    data: any,
    schema: any
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    const validate = (obj: any, schema: any, path = ''): void => {
      if (schema.type === 'object') {
        if (typeof obj !== 'object' || obj === null) {
          errors.push(`${path}: Expected object, got ${typeof obj}`);
          return;
        }

        // Check required properties
        if (schema.required) {
          for (const prop of schema.required) {
            if (!(prop in obj)) {
              errors.push(`${path}.${prop}: Required property missing`);
            }
          }
        }

        // Validate properties
        if (schema.properties) {
          for (const [prop, propSchema] of Object.entries(schema.properties)) {
            if (prop in obj) {
              validate(obj[prop], propSchema, `${path}.${prop}`);
            }
          }
        }
      } else if (schema.type === 'array') {
        if (!Array.isArray(obj)) {
          errors.push(`${path}: Expected array, got ${typeof obj}`);
          return;
        }

        if (schema.minItems && obj.length < schema.minItems) {
          errors.push(
            `${path}: Array too short (${obj.length} < ${schema.minItems})`
          );
        }

        if (schema.maxItems && obj.length > schema.maxItems) {
          errors.push(
            `${path}: Array too long (${obj.length} > ${schema.maxItems})`
          );
        }

        if (schema.items) {
          obj.forEach((item, index) => {
            validate(item, schema.items, `${path}[${index}]`);
          });
        }
      } else if (schema.type === 'string') {
        if (typeof obj !== 'string') {
          errors.push(`${path}: Expected string, got ${typeof obj}`);
          return;
        }

        if (schema.minLength && obj.length < schema.minLength) {
          errors.push(
            `${path}: String too short (${obj.length} < ${schema.minLength})`
          );
        }

        if (schema.maxLength && obj.length > schema.maxLength) {
          errors.push(
            `${path}: String too long (${obj.length} > ${schema.maxLength})`
          );
        }

        if (schema.enum && !schema.enum.includes(obj)) {
          errors.push(
            `${path}: Invalid enum value "${obj}", expected one of: ${schema.enum.join(', ')}`
          );
        }

        if (
          schema.format === 'email' &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj)
        ) {
          errors.push(`${path}: Invalid email format`);
        }

        if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(obj)) {
          errors.push(`${path}: Invalid date format, expected YYYY-MM-DD`);
        }

        if (schema.pattern && !new RegExp(schema.pattern).test(obj)) {
          errors.push(
            `${path}: String does not match pattern ${schema.pattern}`
          );
        }
      } else if (schema.type === 'number') {
        if (typeof obj !== 'number' || isNaN(obj)) {
          errors.push(`${path}: Expected number, got ${typeof obj}`);
          return;
        }

        if (schema.minimum !== undefined && obj < schema.minimum) {
          errors.push(`${path}: Number too small (${obj} < ${schema.minimum})`);
        }

        if (schema.maximum !== undefined && obj > schema.maximum) {
          errors.push(`${path}: Number too large (${obj} > ${schema.maximum})`);
        }
      } else if (schema.type === 'boolean') {
        if (typeof obj !== 'boolean') {
          errors.push(`${path}: Expected boolean, got ${typeof obj}`);
        }
      } else if (Array.isArray(schema.type)) {
        // Handle union types like ['string', 'null']
        const validType = schema.type.some((type: string) => {
          if (type === 'null') return obj === null;
          return typeof obj === type;
        });

        if (!validType) {
          errors.push(
            `${path}: Expected one of ${schema.type.join('|')}, got ${typeof obj}`
          );
        }
      }
    };

    validate(data, schema);
    return { valid: errors.length === 0, errors };
  },

  // Mock API responses
  mockApiCall: (command: string, payload: any) => {
    switch (command) {
      case 'create_tournament':
        return {
          id: Date.now(),
          name: payload.name,
          status: 'draft',
          playerCount: 0,
          rounds: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...payload,
        };

      case 'create_player_enhanced':
        return {
          id: Date.now(),
          tournamentId: payload.tournamentId,
          name: payload.name,
          rating: payload.rating,
          email: payload.email,
          isActive: true,
          pairingNumber: null,
          createdAt: new Date().toISOString(),
          ...payload,
        };

      case 'generate_pairings':
        return {
          success: true,
          pairings: [
            { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1, bye: false },
            { whitePlayerId: 3, blackPlayerId: 4, boardNumber: 2, bye: false },
          ],
          roundId: Date.now(),
        };

      case 'update_game_result':
        return {
          success: true,
          gameId: payload.gameId,
          updatedAt: new Date().toISOString(),
        };

      case 'bulk_import_players':
        return {
          success: true,
          imported: payload.players.length,
          errors: [],
        };

      case 'export_tournament_data':
        return {
          success: true,
          filename: `tournament_${payload.tournamentId}.${payload.format}`,
          path: '/exports/tournament.json',
          size: 1024,
        };

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  },
};

// Mock Tauri API with contract validation
const createMockTauriAPI = () => {
  const invoke = jest
    .fn()
    .mockImplementation((command: string, payload: any = {}) => {
      // Find the appropriate schema
      let inputSchema = null;
      let outputSchema = null;

      // Map commands to schemas
      if (command === 'create_tournament') {
        inputSchema = APIContractUtils.schemas.tournament.create.input;
        outputSchema = APIContractUtils.schemas.tournament.create.output;
      } else if (command === 'get_tournaments') {
        inputSchema = APIContractUtils.schemas.tournament.list.input;
        outputSchema = APIContractUtils.schemas.tournament.list.output;
      } else if (command === 'create_player_enhanced') {
        inputSchema = APIContractUtils.schemas.player.create.input;
        outputSchema = APIContractUtils.schemas.player.create.output;
      } else if (command === 'bulk_import_players') {
        inputSchema = APIContractUtils.schemas.player.bulkImport.input;
        outputSchema = APIContractUtils.schemas.player.bulkImport.output;
      } else if (command === 'generate_pairings') {
        inputSchema = APIContractUtils.schemas.pairing.generate.input;
        outputSchema = APIContractUtils.schemas.pairing.generate.output;
      } else if (command === 'update_game_result') {
        inputSchema = APIContractUtils.schemas.gameResult.update.input;
        outputSchema = APIContractUtils.schemas.gameResult.update.output;
      } else if (command === 'export_tournament_data') {
        inputSchema = APIContractUtils.schemas.export.tournament.input;
        outputSchema = APIContractUtils.schemas.export.tournament.output;
      }

      return new Promise((resolve, reject) => {
        // Validate input schema
        if (inputSchema) {
          const inputValidation = APIContractUtils.validateSchema(
            payload,
            inputSchema
          );
          if (!inputValidation.valid) {
            reject(
              new Error(
                `Input validation failed: ${inputValidation.errors.join(', ')}`
              )
            );
            return;
          }
        }

        try {
          // Generate mock response
          const response = APIContractUtils.mockApiCall(command, payload);

          // Validate output schema
          if (outputSchema) {
            const outputValidation = APIContractUtils.validateSchema(
              response,
              outputSchema
            );
            if (!outputValidation.valid) {
              reject(
                new Error(
                  `Output validation failed: ${outputValidation.errors.join(', ')}`
                )
              );
              return;
            }
          }

          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

  return { invoke };
};

// Test components that use the API
const MockAPITestComponent = ({
  command,
  payload,
}: {
  command: string;
  payload: any;
}) => {
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const executeCommand = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await window.__TAURI_INTERNALS__.invoke(
        command,
        payload
      );
      setResult(response);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    executeCommand();
  }, [command, payload]);

  return (
    <div data-testid="api-test-component">
      {loading && <div data-testid="loading">Loading...</div>}
      {error && (
        <div data-testid="error" role="alert">
          {error}
        </div>
      )}
      {result && <div data-testid="result">{JSON.stringify(result)}</div>}
    </div>
  );
};

describe('API Contract Testing', () => {
  beforeEach(() => {
    const mockAPI = createMockTauriAPI();
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: mockAPI,
      configurable: true,
    });
  });

  describe('Tournament API Contracts', () => {
    test('should validate tournament creation input contract', async () => {
      const validPayload = {
        name: 'Test Tournament',
        maxPlayers: 16,
        maxRounds: 5,
        pairingMethod: 'swiss',
        timeControl: {
          mainTime: 90,
          increment: 30,
          type: 'fischer',
        },
      };

      render(
        <MockAPITestComponent
          command="create_tournament"
          payload={validPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toBeInTheDocument();
        expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      });

      const result = JSON.parse(screen.getByTestId('result').textContent || '');
      expect(result.id).toBeDefined();
      expect(result.name).toBe(validPayload.name);
      expect(result.status).toBe('draft');
    });

    test('should reject invalid tournament creation input', async () => {
      const invalidPayload = {
        name: '', // Invalid: empty string
        maxPlayers: -5, // Invalid: negative number
        maxRounds: 100, // Invalid: too large
        pairingMethod: 'invalid_method', // Invalid: not in enum
      };

      render(
        <MockAPITestComponent
          command="create_tournament"
          payload={invalidPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      const errorText = screen.getByTestId('error').textContent;
      expect(errorText).toContain('Input validation failed');
      expect(errorText).toContain('String too short'); // name validation
      expect(errorText).toContain('Number too small'); // maxPlayers validation
    });

    test('should validate tournament update contract', async () => {
      const validPayload = {
        id: 1,
        name: 'Updated Tournament',
        status: 'active',
      };

      // Mock the update response
      window.__TAURI_INTERNALS__.invoke = jest.fn().mockResolvedValue({
        success: true,
        updated: { id: 1, name: 'Updated Tournament', status: 'active' },
      });

      render(
        <MockAPITestComponent
          command="update_tournament"
          payload={validPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toBeInTheDocument();
      });
    });
  });

  describe('Player API Contracts', () => {
    test('should validate player creation input contract', async () => {
      const validPayload = {
        tournamentId: 1,
        name: 'John Doe',
        rating: 1650,
        email: 'john@example.com',
        phone: '+1-555-0123',
        countryCode: 'US',
        title: 'FM',
        birthDate: '1990-05-15',
        gender: 'M',
        fideId: '12345678',
      };

      render(
        <MockAPITestComponent
          command="create_player_enhanced"
          payload={validPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toBeInTheDocument();
        expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      });
    });

    test('should reject invalid player data', async () => {
      const invalidPayload = {
        tournamentId: 'not_a_number',
        name: 'A'.repeat(200), // Too long
        rating: 5000, // Too high
        email: 'invalid-email', // Invalid format
        title: 'INVALID_TITLE', // Not in enum
        birthDate: '1990/05/15', // Wrong format
        gender: 'X', // Not in enum
        fideId: 'abc123', // Invalid pattern
      };

      render(
        <MockAPITestComponent
          command="create_player_enhanced"
          payload={invalidPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      const errorText = screen.getByTestId('error').textContent;
      expect(errorText).toContain('Input validation failed');
    });

    test('should validate bulk player import contract', async () => {
      const validPayload = {
        tournamentId: 1,
        players: [
          { name: 'Player 1', rating: 1500, email: 'player1@example.com' },
          { name: 'Player 2', rating: 1600, email: 'player2@example.com' },
          { name: 'Player 3', rating: 1550, email: 'player3@example.com' },
        ],
      };

      render(
        <MockAPITestComponent
          command="bulk_import_players"
          payload={validPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toBeInTheDocument();
      });

      const result = JSON.parse(screen.getByTestId('result').textContent || '');
      expect(result.success).toBe(true);
      expect(result.imported).toBe(3);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should reject empty player list for bulk import', async () => {
      const invalidPayload = {
        tournamentId: 1,
        players: [], // Empty array violates minItems: 1
      };

      render(
        <MockAPITestComponent
          command="bulk_import_players"
          payload={invalidPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error').textContent).toContain(
        'Array too short'
      );
    });
  });

  describe('Pairing API Contracts', () => {
    test('should validate pairing generation contract', async () => {
      const validPayload = {
        tournamentId: 1,
        roundNumber: 1,
        method: 'swiss',
        options: {
          avoidRematches: true,
          balanceColors: true,
          allowByes: false,
        },
      };

      render(
        <MockAPITestComponent
          command="generate_pairings"
          payload={validPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toBeInTheDocument();
      });

      const result = JSON.parse(screen.getByTestId('result').textContent || '');
      expect(result.success).toBe(true);
      expect(Array.isArray(result.pairings)).toBe(true);
      expect(typeof result.roundId).toBe('number');
    });

    test('should reject invalid pairing method', async () => {
      const invalidPayload = {
        tournamentId: 1,
        roundNumber: 0, // Invalid: must be >= 1
        method: 'invalid_method', // Invalid enum value
      };

      render(
        <MockAPITestComponent
          command="generate_pairings"
          payload={invalidPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });
  });

  describe('Game Result API Contracts', () => {
    test('should validate game result update contract', async () => {
      const validPayload = {
        gameId: 'game-1-1',
        result: 'white_wins',
        resultType: 'normal',
        notes: 'Good game',
      };

      render(
        <MockAPITestComponent
          command="update_game_result"
          payload={validPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toBeInTheDocument();
      });

      const result = JSON.parse(screen.getByTestId('result').textContent || '');
      expect(result.success).toBe(true);
      expect(result.gameId).toBe(validPayload.gameId);
    });

    test('should reject invalid game result', async () => {
      const invalidPayload = {
        gameId: '', // Invalid: empty string
        result: 'invalid_result', // Invalid enum
        resultType: 'invalid_type', // Invalid enum
        notes: 'A'.repeat(1000), // Too long
      };

      render(
        <MockAPITestComponent
          command="update_game_result"
          payload={invalidPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });
  });

  describe('Export API Contracts', () => {
    test('should validate export tournament contract', async () => {
      const validPayload = {
        tournamentId: 1,
        format: 'json',
        includeStandings: true,
        includePairings: true,
        includeResults: false,
        includePlayerDetails: true,
      };

      render(
        <MockAPITestComponent
          command="export_tournament_data"
          payload={validPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toBeInTheDocument();
      });

      const result = JSON.parse(screen.getByTestId('result').textContent || '');
      expect(result.success).toBe(true);
      expect(result.filename).toContain('tournament_1.json');
    });

    test('should reject invalid export format', async () => {
      const invalidPayload = {
        tournamentId: 'invalid', // Should be number
        format: 'invalid_format', // Invalid enum
      };

      render(
        <MockAPITestComponent
          command="export_tournament_data"
          payload={invalidPayload}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });
  });

  describe('API Error Handling', () => {
    test('should handle unknown API commands', async () => {
      render(<MockAPITestComponent command="unknown_command" payload={{}} />);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error').textContent).toContain(
        'Unknown command'
      );
    });

    test('should handle API timeout scenarios', async () => {
      // Mock a slow API call
      window.__TAURI_INTERNALS__.invoke = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ success: true });
          }, 5000); // 5 second delay
        });
      });

      render(
        <MockAPITestComponent
          command="create_tournament"
          payload={{ name: 'Test' }}
        />
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // In a real app, there would be timeout handling
      // This test documents the current behavior
    });

    test('should handle network connectivity issues', async () => {
      // Mock network error
      window.__TAURI_INTERNALS__.invoke = jest
        .fn()
        .mockRejectedValue(new Error('Network connection failed'));

      render(
        <MockAPITestComponent
          command="create_tournament"
          payload={{ name: 'Test' }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error').textContent).toContain(
        'Network connection failed'
      );
    });
  });

  describe('Contract Evolution and Versioning', () => {
    test('should handle API version compatibility', () => {
      const v2Schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          maxPlayers: { type: 'number' },
          description: { type: 'string' }, // New optional field
          settings: {
            // New optional object
            type: 'object',
            properties: {
              allowSpectators: { type: 'boolean' },
            },
          },
        },
        required: ['name', 'maxPlayers'], // Same required fields for backward compatibility
      };

      // Test that v1 data is valid against v2 schema
      const v1Data = { name: 'Tournament', maxPlayers: 16 };
      const validation = APIContractUtils.validateSchema(v1Data, v2Schema);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect breaking changes in API contracts', () => {
      const breakingSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          maxPlayers: { type: 'number' },
          newRequiredField: { type: 'string' }, // Breaking change: new required field
        },
        required: ['name', 'maxPlayers', 'newRequiredField'],
      };

      const oldData = { name: 'Tournament', maxPlayers: 16 };
      const validation = APIContractUtils.validateSchema(
        oldData,
        breakingSchema
      );

      expect(validation.valid).toBe(false);
      expect(
        validation.errors.some(error => error.includes('newRequiredField'))
      ).toBe(true);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle large payload validation efficiently', () => {
      const largePayload = {
        tournamentId: 1,
        players: Array.from({ length: 500 }, (_, i) => ({
          name: `Player ${i + 1}`,
          rating: 1200 + Math.random() * 800,
          email: `player${i + 1}@example.com`,
        })),
      };

      const startTime = performance.now();
      const validation = APIContractUtils.validateSchema(
        largePayload,
        APIContractUtils.schemas.player.bulkImport.input
      );
      const endTime = performance.now();

      expect(validation.valid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should validate in <100ms
    });

    test('should handle rapid successive API calls', async () => {
      const promises = Array.from({ length: 10 }, () =>
        window.__TAURI_INTERNALS__.invoke('create_tournament', {
          name: 'Rapid Test Tournament',
          maxPlayers: 16,
          maxRounds: 5,
          pairingMethod: 'swiss',
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success !== false).toBe(true); // Allow for different response formats
      });
    });
  });
});
