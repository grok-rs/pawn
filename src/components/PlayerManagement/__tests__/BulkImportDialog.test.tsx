import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import BulkImportDialog from '../BulkImportDialog';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  CloudUpload: () => <span data-testid="cloud-upload-icon">☁️</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">✅</span>,
  Error: () => <span data-testid="error-icon">❌</span>,
  Warning: () => <span data-testid="warning-icon">⚠️</span>,
  Visibility: () => <span data-testid="visibility-icon">👁️</span>,
  Save: () => <span data-testid="save-icon">💾</span>,
}));

// Mock commands
const mockCommands = {
  validateBulkImport: vi.fn(),
  bulkImportPlayers: vi.fn(),
};

vi.mock('@dto/bindings', () => ({
  commands: mockCommands,
}));

// Mock File API
interface MockFile extends Partial<File> {
  name: string;
  size: number;
  type: string;
}

const createMockFile = (content: string, filename: string): MockFile => ({
  name: filename,
  size: content.length,
  type: 'text/csv',
});

// Mock FileReader
const mockFileReader = {
  readAsText: vi.fn(),
  result: '',
  onload: null as
    | ((this: FileReader, ev: ProgressEvent<FileReader>) => void)
    | null,
  onerror: null as
    | ((this: FileReader, ev: ProgressEvent<FileReader>) => void)
    | null,
};

// Mock FileReader globally
Object.defineProperty(globalThis, 'FileReader', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockFileReader),
});

// Mock data types
interface BulkImportPlayer {
  name: string;
  rating?: number;
  country_code?: string;
  title?: string;
  birth_date?: string;
  gender?: string;
  email?: string;
  phone?: string;
  club?: string;
}

interface BulkImportResult {
  success: boolean;
  valid_players: BulkImportPlayer[];
  invalid_players: { player: BulkImportPlayer; errors: string[] }[];
  warnings: { player: BulkImportPlayer; warnings: string[] }[];
  total_count: number;
  valid_count: number;
  invalid_count: number;
  warning_count: number;
}

// Sample CSV data
const validCsvData = `name,rating,country_code,title,email
John Doe,1800,US,FM,john@test.com
Jane Smith,2000,CA,IM,jane@test.com
Bob Wilson,1600,GB,,bob@test.com`;

const invalidCsvData = `name,rating,country_code
,1800,US
Invalid Name,5000,INVALID
Test Player,-100,US`;

describe('BulkImportDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    tournamentId: 1,
  };

  const mockValidationResult: BulkImportResult = {
    success: true,
    valid_players: [
      {
        name: 'John Doe',
        rating: 1800,
        country_code: 'US',
        title: 'FM',
        email: 'john@test.com',
      },
      {
        name: 'Jane Smith',
        rating: 2000,
        country_code: 'CA',
        title: 'IM',
        email: 'jane@test.com',
      },
    ],
    invalid_players: [
      {
        player: { name: '', rating: 1800, country_code: 'US' },
        errors: ['Name is required'],
      },
    ],
    warnings: [
      {
        player: {
          name: 'Bob Wilson',
          rating: 1600,
          country_code: 'GB',
          email: 'bob@test.com',
        },
        warnings: ['No title specified'],
      },
    ],
    total_count: 4,
    valid_count: 2,
    invalid_count: 1,
    warning_count: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommands.validateBulkImport.mockResolvedValue(mockValidationResult);
    mockCommands.bulkImportPlayers.mockResolvedValue({
      success: true,
      imported_count: 2,
    });
  });

  describe('Initial Rendering', () => {
    test('renders bulk import dialog when open', () => {
      render(<BulkImportDialog {...defaultProps} />);

      expect(screen.getByText('bulkImportPlayers')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<BulkImportDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('shows stepper with correct steps', () => {
      render(<BulkImportDialog {...defaultProps} />);

      expect(screen.getByText('uploadFile')).toBeInTheDocument();
      expect(screen.getByText('validateData')).toBeInTheDocument();
      expect(screen.getByText('reviewResults')).toBeInTheDocument();
      expect(screen.getByText('importPlayers')).toBeInTheDocument();
    });

    test('starts at first step', () => {
      render(<BulkImportDialog {...defaultProps} />);

      // First step should be active
      expect(screen.getByText('uploadCsvFile')).toBeInTheDocument();
      expect(screen.getByText('selectCsvFileToUpload')).toBeInTheDocument();
    });

    test('shows file upload instructions', () => {
      render(<BulkImportDialog {...defaultProps} />);

      expect(screen.getByText('csvFormatInstructions')).toBeInTheDocument();
      expect(screen.getByTestId('cloud-upload-icon')).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    test('processes valid CSV file', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      // Simulate file selection
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      // Mock FileReader behavior
      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      const changeEvent = new Event('change', { bubbles: true });
      Object.defineProperty(changeEvent, 'target', {
        value: input,
        enumerable: true,
      });

      // Trigger file selection
      await user.upload(fileInput, file as File);

      // Should advance to next step after processing
      await waitFor(() => {
        expect(screen.getByText('validateData')).toBeInTheDocument();
      });
    });

    test('handles CSV parsing errors', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile('invalid,csv,format\n', 'invalid.csv');

      // Mock FileReader with invalid CSV
      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = 'invalid,csv,format\n';
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      await waitFor(() => {
        expect(screen.getByText('invalidCsvFormat')).toBeInTheDocument();
      });
    });

    test('validates file type', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = {
        ...createMockFile(validCsvData, 'players.txt'),
        type: 'text/plain',
      };

      await user.upload(fileInput, file as File);

      expect(screen.getByText('pleaseSelectCsvFile')).toBeInTheDocument();
    });

    test('handles empty file', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile('', 'empty.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = '';
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      await waitFor(() => {
        expect(screen.getByText('csvFileIsEmpty')).toBeInTheDocument();
      });
    });
  });

  describe('Data Validation', () => {
    test('validates uploaded data', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Upload file first
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      // Click validate button
      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        expect(mockCommands.validateBulkImport).toHaveBeenCalledWith({
          tournament_id: 1,
          players: expect.any(Array),
        });
      });
    });

    test('displays validation results', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Upload and validate
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('validationComplete')).toBeInTheDocument();
        expect(screen.getByText('2 validPlayers')).toBeInTheDocument();
        expect(screen.getByText('1 invalidPlayers')).toBeInTheDocument();
        expect(screen.getByText('1 warnings')).toBeInTheDocument();
      });
    });

    test('shows validation errors', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Upload and validate
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(invalidCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = invalidCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    test('shows validation warnings', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Upload and validate
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('No title specified')).toBeInTheDocument();
        expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
      });
    });

    test('handles validation API errors', async () => {
      mockCommands.validateBulkImport.mockRejectedValue(
        new Error('Validation API failed')
      );

      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('validationFailed')).toBeInTheDocument();
      });
    });
  });

  describe('Data Review', () => {
    test('displays detailed results table', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Go through upload and validation steps
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('reviewResults')).toBeInTheDocument();
      });

      const reviewButton = screen.getByText('reviewResults');
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('1800')).toBeInTheDocument();
        expect(screen.getByText('2000')).toBeInTheDocument();
      });
    });

    test('shows status indicators for each player', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Go through steps to review
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        const reviewButton = screen.getByText('reviewResults');
        return user.click(reviewButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
        expect(screen.getByTestId('error-icon')).toBeInTheDocument();
        expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
      });
    });

    test('allows toggling between valid/invalid/warning views', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Navigate to review step
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        const reviewButton = screen.getByText('reviewResults');
        return user.click(reviewButton);
      });

      // Should have filter options
      await waitFor(() => {
        expect(screen.getByText('showValid')).toBeInTheDocument();
        expect(screen.getByText('showInvalid')).toBeInTheDocument();
        expect(screen.getByText('showWarnings')).toBeInTheDocument();
      });
    });
  });

  describe('Data Import', () => {
    test('imports valid players successfully', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Go through all steps
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        const reviewButton = screen.getByText('reviewResults');
        return user.click(reviewButton);
      });

      await waitFor(() => {
        const importButton = screen.getByText('importPlayers');
        return user.click(importButton);
      });

      await waitFor(() => {
        expect(mockCommands.bulkImportPlayers).toHaveBeenCalledWith({
          tournament_id: 1,
          players: expect.any(Array),
        });
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('shows import progress', async () => {
      let resolveImport: (value: {
        success: boolean;
        imported_count: number;
      }) => void;
      mockCommands.bulkImportPlayers.mockImplementation(() => {
        return new Promise(resolve => {
          resolveImport = resolve;
        });
      });

      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Navigate through steps
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      const validateButton = screen.getByText('validateData');
      await user.click(validateButton);

      await waitFor(() => {
        const reviewButton = screen.getByText('reviewResults');
        return user.click(reviewButton);
      });

      await waitFor(() => {
        const importButton = screen.getByText('importPlayers');
        return user.click(importButton);
      });

      // Should show loading
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('importingPlayers')).toBeInTheDocument();

      // Complete import
      resolveImport!({ success: true, imported_count: 2 });

      await waitFor(() => {
        expect(screen.getByText('importComplete')).toBeInTheDocument();
      });
    });

    test('handles import errors', async () => {
      mockCommands.bulkImportPlayers.mockRejectedValue(
        new Error('Import failed')
      );

      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Navigate to import step
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);
      await user.click(screen.getByText('validateData'));

      await waitFor(() => {
        const reviewButton = screen.getByText('reviewResults');
        return user.click(reviewButton);
      });

      await waitFor(() => {
        const importButton = screen.getByText('importPlayers');
        return user.click(importButton);
      });

      await waitFor(() => {
        expect(screen.getByText('importFailed')).toBeInTheDocument();
      });
    });

    test('only imports valid players', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Upload file with mixed valid/invalid data
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(invalidCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = invalidCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);
      await user.click(screen.getByText('validateData'));

      await waitFor(() => {
        const reviewButton = screen.getByText('reviewResults');
        return user.click(reviewButton);
      });

      await waitFor(() => {
        const importButton = screen.getByText('importPlayers');
        return user.click(importButton);
      });

      await waitFor(() => {
        expect(mockCommands.bulkImportPlayers).toHaveBeenCalledWith({
          tournament_id: 1,
          players: mockValidationResult.valid_players,
        });
      });
    });
  });

  describe('Navigation and Controls', () => {
    test('allows navigating between steps', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Upload file
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      // Should advance to validation step
      await waitFor(() => {
        expect(screen.getByText('validateData')).toBeInTheDocument();
      });

      // Go back to upload step
      const backButton = screen.getByText('back');
      await user.click(backButton);

      expect(screen.getByText('uploadCsvFile')).toBeInTheDocument();
    });

    test('disables next button when step is incomplete', () => {
      render(<BulkImportDialog {...defaultProps} />);

      // Next button should be disabled initially
      const nextButton = screen.getByText('next');
      expect(nextButton).toBeDisabled();
    });

    test('enables next button when step is complete', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      // Upload file
      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = validCsvData;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      // Next button should be enabled
      await waitFor(() => {
        const nextButton = screen.getByText('next');
        expect(nextButton).not.toBeDisabled();
      });
    });

    test('closes dialog on cancel', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const cancelButton = screen.getByText('cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('resets state when dialog reopens', () => {
      const { rerender } = render(<BulkImportDialog {...defaultProps} />);

      rerender(<BulkImportDialog {...defaultProps} open={false} />);
      rerender(<BulkImportDialog {...defaultProps} open={true} />);

      // Should be back at first step
      expect(screen.getByText('uploadCsvFile')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles file read errors', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = createMockFile(validCsvData, 'players.csv');

      // Mock FileReader error
      mockFileReader.readAsText.mockImplementation(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      await waitFor(() => {
        expect(screen.getByText('failedToReadFile')).toBeInTheDocument();
      });
    });

    test('validates CSV headers', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const invalidHeadersCsv = 'invalid,headers,only\ndata,data,data';
      const file = createMockFile(invalidHeadersCsv, 'players.csv');

      mockFileReader.readAsText.mockImplementation(() => {
        mockFileReader.result = invalidHeadersCsv;
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      });

      await user.upload(fileInput, file as File);

      await waitFor(() => {
        expect(screen.getByText('missingRequiredColumns')).toBeInTheDocument();
      });
    });

    test('handles large files gracefully', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const largeFile = {
        ...createMockFile(validCsvData, 'large.csv'),
        size: 10 * 1024 * 1024,
      }; // 10MB

      await user.upload(fileInput, largeFile as File);

      expect(screen.getByText('fileTooLarge')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('dialog has proper ARIA attributes', () => {
      render(<BulkImportDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    test('stepper has proper navigation', () => {
      render(<BulkImportDialog {...defaultProps} />);

      // Stepper should be navigable
      expect(screen.getByText('uploadFile')).toBeInTheDocument();
      expect(screen.getByText('validateData')).toBeInTheDocument();
    });

    test('file input has proper accessibility', () => {
      render(<BulkImportDialog {...defaultProps} />);

      const fileButton = screen.getByRole('button', { name: /uploadFile/ });
      expect(fileButton).toBeInTheDocument();
    });

    test('error messages are announced', async () => {
      const user = userEvent.setup();
      render(<BulkImportDialog {...defaultProps} />);

      const fileInput = screen.getByRole('button', { name: /uploadFile/ });
      const file = {
        ...createMockFile(validCsvData, 'players.txt'),
        type: 'text/plain',
      };

      await user.upload(fileInput, file as File);

      const errorMessage = screen.getByText('pleaseSelectCsvFile');
      expect(errorMessage).toBeInTheDocument();
    });
  });
});
