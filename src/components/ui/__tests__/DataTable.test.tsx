import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import DataTable from '../DataTable';

// Test data types
interface TestUser {
  id: number;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive';
  profile?: {
    bio?: string;
  };
}

// Create test theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
    },
    background: {
      default: '#fafafa',
    },
  },
});

// Test wrapper with theme
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('DataTable', () => {
  const mockColumns = [
    { id: 'id', label: 'ID', align: 'center' as const, width: 80 },
    { id: 'name', label: 'Name', align: 'left' as const },
    { id: 'email', label: 'Email', align: 'left' as const },
    { id: 'age', label: 'Age', align: 'right' as const, width: 100 },
    {
      id: 'status',
      label: 'Status',
      align: 'center' as const,
      format: (value: unknown) => (
        <span style={{ color: value === 'active' ? 'green' : 'red' }}>
          {String(value).toUpperCase()}
        </span>
      ),
    },
  ];

  const mockData: TestUser[] = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      status: 'active',
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 25,
      status: 'inactive',
    },
    {
      id: 3,
      name: 'Bob Wilson',
      email: 'bob@example.com',
      age: 35,
      status: 'active',
    },
    {
      id: 4,
      name: 'Alice Brown',
      email: 'alice@example.com',
      age: 28,
      status: 'active',
    },
  ];

  const mockOnRowClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders table with data', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    test('renders column headers correctly', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    test('renders table in Paper container with border radius', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      const tableContainer = screen
        .getByRole('table')
        .closest('.MuiTableContainer-root');
      expect(tableContainer).toHaveClass('MuiPaper-root');
    });
  });

  describe('Loading State', () => {
    test('shows skeleton rows when loading', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={[]} loading={true} />
        </TestWrapper>
      );

      // Should show skeleton elements instead of real data
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBeGreaterThan(0);

      // Should not show real data
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    test('shows data when not loading', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} loading={false} />
        </TestWrapper>
      );

      expect(screen.queryByTestId(/skeleton/i)).not.toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows default empty message when no data', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={[]} />
        </TestWrapper>
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    test('shows custom empty message', () => {
      render(
        <TestWrapper>
          <DataTable
            columns={mockColumns}
            data={[]}
            emptyMessage="No users found"
          />
        </TestWrapper>
      );

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    test('empty message spans all columns', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={[]} />
        </TestWrapper>
      );

      const emptyCell = screen.getByText('No data available').closest('td');
      expect(emptyCell).toHaveAttribute('colspan', String(mockColumns.length));
    });
  });

  describe('Column Configuration', () => {
    test('applies column alignment', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      // Check header alignments
      const idHeader = screen.getByText('ID').closest('th');
      const nameHeader = screen.getByText('Name').closest('th');
      const ageHeader = screen.getByText('Age').closest('th');

      expect(idHeader).toHaveStyle({ textAlign: 'center' });
      expect(nameHeader).toHaveStyle({ textAlign: 'left' });
      expect(ageHeader).toHaveStyle({ textAlign: 'right' });
    });

    test('applies custom column width', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      const idHeader = screen.getByText('ID').closest('th');
      const ageHeader = screen.getByText('Age').closest('th');

      expect(idHeader).toHaveStyle({ width: '80px' });
      expect(ageHeader).toHaveStyle({ width: '100px' });
    });

    test('uses custom format function', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      // Status column uses custom format
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    test('shows pagination by default', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByText('1–4 of 4')).toBeInTheDocument();
      expect(screen.getByText('Rows per page:')).toBeInTheDocument();
    });

    test('hides pagination when disabled', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} pagination={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Rows per page:')).not.toBeInTheDocument();
    });

    test('paginates data correctly', async () => {
      const largeData = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        age: 20 + i,
        status: 'active' as const,
      }));

      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DataTable
            columns={mockColumns}
            data={largeData}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </TestWrapper>
      );

      // Should show first 10 items by default
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 10')).toBeInTheDocument();
      expect(screen.queryByText('User 11')).not.toBeInTheDocument();

      // Change rows per page
      const rowsPerPageSelect = screen.getByDisplayValue('10');
      await user.click(rowsPerPageSelect);
      await user.click(screen.getByText('25'));

      // Should now show all 25 items
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 25')).toBeInTheDocument();
    });

    test('handles page navigation', async () => {
      const largeData = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        age: 20 + i,
        status: 'active' as const,
      }));

      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={largeData} />
        </TestWrapper>
      );

      // Go to next page
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Should show second page items
      expect(screen.getByText('User 11')).toBeInTheDocument();
      expect(screen.getByText('User 20')).toBeInTheDocument();
      expect(screen.queryByText('User 1')).not.toBeInTheDocument();
    });
  });

  describe('Row Interactions', () => {
    test('calls onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DataTable
            columns={mockColumns}
            data={mockData}
            onRowClick={mockOnRowClick}
          />
        </TestWrapper>
      );

      const firstRow = screen.getByText('John Doe').closest('tr');
      await user.click(firstRow!);

      expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    test('shows pointer cursor when onRowClick is provided', () => {
      render(
        <TestWrapper>
          <DataTable
            columns={mockColumns}
            data={mockData}
            onRowClick={mockOnRowClick}
          />
        </TestWrapper>
      );

      const firstRow = screen.getByText('John Doe').closest('tr');
      expect(firstRow).toHaveStyle({ cursor: 'pointer' });
    });

    test('shows default cursor when onRowClick is not provided', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      const firstRow = screen.getByText('John Doe').closest('tr');
      expect(firstRow).toHaveStyle({ cursor: 'default' });
    });

    test('applies hover styles', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      const firstRow = screen.getByText('John Doe').closest('tr');
      expect(firstRow).toHaveAttribute(
        'class',
        expect.stringContaining('MuiTableRow-hover')
      );
    });
  });

  describe('Responsive Features', () => {
    test('hides specified columns on tablet', () => {
      const responsiveColumns = [
        { id: 'name', label: 'Name' },
        { id: 'email', label: 'Email' },
        { id: 'details', label: 'Details' },
      ];

      render(
        <TestWrapper>
          <DataTable
            columns={responsiveColumns}
            data={mockData}
            hideColumnsOnTablet={['details']}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    test('shows all columns when hideColumnsOnTablet is empty', () => {
      render(
        <TestWrapper>
          <DataTable
            columns={mockColumns}
            data={mockData}
            hideColumnsOnTablet={[]}
          />
        </TestWrapper>
      );

      mockColumns.forEach(column => {
        expect(screen.getByText(column.label)).toBeInTheDocument();
      });
    });
  });

  describe('Sticky Header', () => {
    test('enables sticky header when specified', () => {
      render(
        <TestWrapper>
          <DataTable
            columns={mockColumns}
            data={mockData}
            stickyHeader={true}
          />
        </TestWrapper>
      );

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute(
        'class',
        expect.stringContaining('MuiTable-stickyHeader')
      );
    });

    test('disables sticky header by default', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      const table = screen.getByRole('table');
      expect(table).not.toHaveAttribute(
        'class',
        expect.stringContaining('MuiTable-stickyHeader')
      );
    });
  });

  describe('Nested Data Access', () => {
    test('handles nested object properties', () => {
      const nestedColumns = [
        { id: 'name', label: 'Name' },
        { id: 'profile.bio', label: 'Bio' },
      ];

      const nestedData = [
        { name: 'John', profile: { bio: 'Software Developer' } },
        { name: 'Jane', profile: { bio: 'Designer' } },
        { name: 'Bob', profile: undefined }, // Missing nested object
      ];

      render(
        <TestWrapper>
          <DataTable columns={nestedColumns} data={nestedData} />
        </TestWrapper>
      );

      expect(screen.getByText('Software Developer')).toBeInTheDocument();
      expect(screen.getByText('Designer')).toBeInTheDocument();
    });

    test('handles missing nested properties gracefully', () => {
      const nestedColumns = [
        { id: 'name', label: 'Name' },
        { id: 'profile.bio', label: 'Bio' },
      ];

      const incompleteData = [
        { name: 'John' }, // No profile object
        { name: 'Jane', profile: {} }, // Empty profile object
      ];

      render(
        <TestWrapper>
          <DataTable columns={nestedColumns} data={incompleteData} />
        </TestWrapper>
      );

      // Should not crash and render the names
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper table structure', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(
        mockColumns.length
      );
      expect(screen.getAllByRole('row')).toHaveLength(mockData.length + 1); // +1 for header
    });

    test('empty state has proper colspan', () => {
      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={[]} />
        </TestWrapper>
      );

      const emptyCell = screen.getByText('No data available');
      expect(emptyCell.closest('td')).toHaveAttribute(
        'colspan',
        String(mockColumns.length)
      );
    });

    test('pagination controls are accessible', () => {
      const largeData = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        age: 20 + i,
        status: 'active' as const,
      }));

      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={largeData} />
        </TestWrapper>
      );

      expect(
        screen.getByRole('button', { name: /first page/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /previous page/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /next page/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /last page/i })
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty columns array', () => {
      render(
        <TestWrapper>
          <DataTable columns={[]} data={mockData} />
        </TestWrapper>
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    test('handles invalid data gracefully', () => {
      const invalidData = [
        null,
        undefined,
        { id: 1, name: 'Valid' },
      ] as unknown as TestUser[];

      render(
        <TestWrapper>
          <DataTable columns={mockColumns} data={invalidData} />
        </TestWrapper>
      );

      // Should still render the valid row
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    test('handles zero page size', () => {
      render(
        <TestWrapper>
          <DataTable
            columns={mockColumns}
            data={mockData}
            rowsPerPageOptions={[0, 5, 10]}
          />
        </TestWrapper>
      );

      // Should still work with valid page size selected
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});
