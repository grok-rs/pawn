import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BatchImport } from '../BatchImport';
import { commands } from '@dto/bindings';

// Mock the Tauri commands
vi.mock('@dto/bindings', () => ({
  commands: {
    batchUpdateResults: vi.fn(),
  },
}));

describe('BatchImport', () => {
  const theme = createTheme();

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
  };

  const defaultProps = {
    tournamentId: 1,
    onImportCompleted: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render batch import component with title', () => {
      renderWithTheme(<BatchImport {...defaultProps} />);

      expect(screen.getByText('Batch Import Game Results')).toBeInTheDocument();
    });

    it('should render import method selector', () => {
      renderWithTheme(<BatchImport {...defaultProps} />);

      expect(screen.getAllByText('Import Method')).toHaveLength(2); // Label and legend
      expect(screen.getByText('CSV Upload')).toBeInTheDocument();
    });

    it('should render CSV upload controls by default', () => {
      renderWithTheme(<BatchImport {...defaultProps} />);

      expect(screen.getByText('Upload CSV')).toBeInTheDocument();
      expect(screen.getByText('View Sample CSV')).toBeInTheDocument();
    });

    it('should show info message when no data is imported', () => {
      renderWithTheme(<BatchImport {...defaultProps} />);

      expect(
        screen.getByText('Upload a CSV file to start importing game results.')
      ).toBeInTheDocument();
    });
  });

  describe('Import Method Selection', () => {
    it('should switch to manual entry mode', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);

      await user.click(screen.getByText('Manual Entry'));

      expect(screen.getByText('Add Manual Entry')).toBeInTheDocument();
      expect(screen.queryByText('Upload CSV')).not.toBeInTheDocument();
    });

    it('should show manual entry form fields', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      expect(screen.getByLabelText('Game ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Result')).toBeInTheDocument();
      expect(screen.getByLabelText('Result Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });

  describe('Sample CSV Dialog', () => {
    it('should open sample CSV dialog when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      await user.click(screen.getByText('View Sample CSV'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Sample CSV Format')).toBeInTheDocument();
      });
    });

    it('should show sample CSV content in dialog', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      await user.click(screen.getByText('View Sample CSV'));

      await waitFor(() => {
        expect(
          screen.getByText(/Game ID,White Player,Black Player,Result/)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Smith J\.,Johnson A\.,1-0/)
        ).toBeInTheDocument();
      });
    });

    it('should close sample CSV dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      await user.click(screen.getByText('View Sample CSV'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Close' }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Manual Entry Basic Functionality', () => {
    it('should add manual entry and show import preview', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      // Switch to manual entry mode
      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      // Fill out and submit form
      await user.type(screen.getByLabelText('Game ID'), '1');
      await user.click(screen.getByLabelText('Result'));
      await user.click(screen.getByText('1-0'));
      await user.click(screen.getByText('Add'));

      // Should show import preview
      expect(
        screen.getByText('Import Preview (1 entries)')
      ).toBeInTheDocument();
    });

    it('should show validation and import buttons after adding entries', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      // Switch to manual entry mode and add entry
      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      await user.type(screen.getByLabelText('Game ID'), '1');
      await user.click(screen.getByLabelText('Result'));
      await user.click(screen.getByText('1-0'));
      await user.click(screen.getByText('Add'));

      expect(screen.getByText('Validate All')).toBeInTheDocument();
      expect(screen.getByText(/Import .* Results/)).toBeInTheDocument();
    });

    it('should display entry data in preview table', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      // Add entry
      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      await user.type(screen.getByLabelText('Game ID'), '1');
      await user.click(screen.getByLabelText('Result'));
      await user.click(screen.getByText('1-0'));
      await user.click(screen.getByText('Add'));

      // Check table data
      expect(screen.getByText('1')).toBeInTheDocument(); // Game ID
      expect(screen.getByText('1-0')).toBeInTheDocument(); // Result
      expect(screen.getByText('pending')).toBeInTheDocument(); // Status
    });
  });

  describe('CSV File Upload', () => {
    it('should handle basic CSV file upload', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      const csvContent =
        'Game ID,White Player,Black Player,Result,Result Type,Reason,Notes\n1,Smith,Johnson,1-0,,Normal game,';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      // Find file input (it's hidden)
      const uploadButton = screen.getByText('Upload CSV');
      const fileInput = uploadButton
        .closest('div')
        ?.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        await user.upload(fileInput, file);

        await waitFor(() => {
          expect(
            screen.getByText('Import Preview (1 entries)')
          ).toBeInTheDocument();
        });
      }
    });

    it('should parse multiple CSV rows', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      const csvContent = `Game ID,White Player,Black Player,Result,Result Type,Reason,Notes
1,Smith,Johnson,1-0,normal,Regular game,
2,Brown,Davis,0-1,normal,Another game,`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const uploadButton = screen.getByText('Upload CSV');
      const fileInput = uploadButton
        .closest('div')
        ?.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        await user.upload(fileInput, file);

        await waitFor(() => {
          expect(
            screen.getByText('Import Preview (2 entries)')
          ).toBeInTheDocument();
        });
      }
    });
  });

  describe('Validation', () => {
    it('should call validation API when validate button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      // Add entry
      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      await user.type(screen.getByLabelText('Game ID'), '1');
      await user.click(screen.getByLabelText('Result'));
      await user.click(screen.getByText('1-0'));
      await user.click(screen.getByText('Add'));

      const mockValidationResult = {
        overall_valid: true,
        results: [[0, { is_valid: true, errors: [], warnings: [] }]],
      };

      vi.mocked(commands.batchUpdateResults).mockResolvedValue(
        mockValidationResult
      );

      await user.click(screen.getByText('Validate All'));

      expect(commands.batchUpdateResults).toHaveBeenCalledWith({
        tournament_id: 1,
        updates: [
          {
            game_id: 1,
            result: '1-0',
            result_type: null,
            result_reason: null,
            arbiter_notes: null,
            changed_by: 'batch_import',
          },
        ],
        validate_only: true,
      });
    });

    it('should show validation results', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      // Add and validate entry
      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      await user.type(screen.getByLabelText('Game ID'), '1');
      await user.click(screen.getByLabelText('Result'));
      await user.click(screen.getByText('1-0'));
      await user.click(screen.getByText('Add'));

      const mockValidationResult = {
        overall_valid: true,
        results: [[0, { is_valid: true, errors: [], warnings: [] }]],
      };

      vi.mocked(commands.batchUpdateResults).mockResolvedValue(
        mockValidationResult
      );

      await user.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(screen.getByText('1 valid')).toBeInTheDocument();
      });
    });
  });

  describe('Import Execution', () => {
    it('should execute import after validation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      // Add and validate entry
      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      await user.type(screen.getByLabelText('Game ID'), '1');
      await user.click(screen.getByLabelText('Result'));
      await user.click(screen.getByText('1-0'));
      await user.click(screen.getByText('Add'));

      const mockValidationResult = {
        overall_valid: true,
        results: [[0, { is_valid: true, errors: [], warnings: [] }]],
      };

      vi.mocked(commands.batchUpdateResults).mockResolvedValue(
        mockValidationResult
      );
      await user.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(screen.getByText('1 valid')).toBeInTheDocument();
      });

      // Now test import
      const mockImportResult = {
        overall_valid: true,
        results: [[0, { is_valid: true, errors: [], warnings: [] }]],
      };

      vi.mocked(commands.batchUpdateResults).mockResolvedValue(
        mockImportResult
      );

      await user.click(screen.getByText(/Import .* Results/));

      expect(commands.batchUpdateResults).toHaveBeenCalledWith({
        tournament_id: 1,
        updates: [
          {
            game_id: 1,
            result: '1-0',
            result_type: null,
            result_reason: null,
            arbiter_notes: null,
            changed_by: 'batch_import',
          },
        ],
        validate_only: false,
      });
    });

    it('should call onImportCompleted callback after successful import', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      // Add, validate, and import entry
      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      await user.type(screen.getByLabelText('Game ID'), '1');
      await user.click(screen.getByLabelText('Result'));
      await user.click(screen.getByText('1-0'));
      await user.click(screen.getByText('Add'));

      const mockResult = {
        overall_valid: true,
        results: [[0, { is_valid: true, errors: [], warnings: [] }]],
      };

      vi.mocked(commands.batchUpdateResults).mockResolvedValue(mockResult);
      await user.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(screen.getByText('1 valid')).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Import .* Results/));

      await waitFor(() => {
        expect(defaultProps.onImportCompleted).toHaveBeenCalled();
      });
    });
  });

  describe('Close Functionality', () => {
    it('should render close button when onClose is provided', () => {
      renderWithTheme(<BatchImport {...defaultProps} />);

      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should call onClose callback when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      await user.click(screen.getByText('Close'));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should not render close button when onClose is not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { onClose, ...propsWithoutClose } = defaultProps;
      renderWithTheme(<BatchImport {...propsWithoutClose} />);

      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle CSV parsing errors gracefully', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const csvContent = 'Invalid CSV content';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const uploadButton = screen.getByText('Upload CSV');
      const fileInput = uploadButton
        .closest('div')
        ?.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        await user.upload(fileInput, file);

        expect(alertSpy).toHaveBeenCalledWith(
          'Failed to parse CSV file. Please check the format.'
        );
      }

      alertSpy.mockRestore();
    });

    it('should handle validation errors', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      // Add entry
      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      await user.type(screen.getByLabelText('Game ID'), '1');
      await user.click(screen.getByLabelText('Result'));
      await user.click(screen.getByText('1-0'));
      await user.click(screen.getByText('Add'));

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      vi.mocked(commands.batchUpdateResults).mockRejectedValue(
        new Error('Network error')
      );

      await user.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Validation failed:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle import errors', async () => {
      const user = userEvent.setup();
      renderWithTheme(<BatchImport {...defaultProps} />);

      // Add and validate entry
      const methodSelect = screen.getByRole('combobox');
      await user.click(methodSelect);
      await user.click(screen.getByText('Manual Entry'));

      await user.type(screen.getByLabelText('Game ID'), '1');
      await user.click(screen.getByLabelText('Result'));
      await user.click(screen.getByText('1-0'));
      await user.click(screen.getByText('Add'));

      const mockValidationResult = {
        overall_valid: true,
        results: [[0, { is_valid: true, errors: [], warnings: [] }]],
      };

      vi.mocked(commands.batchUpdateResults).mockResolvedValue(
        mockValidationResult
      );
      await user.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(screen.getByText('1 valid')).toBeInTheDocument();
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      vi.mocked(commands.batchUpdateResults).mockRejectedValue(
        new Error('Network error')
      );

      await user.click(screen.getByText(/Import .* Results/));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Import failed. Please try again.'
        );
      });

      alertSpy.mockRestore();
    });
  });
});
