import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  TablePagination,
  Box,
  Skeleton,
  Typography,
} from '@mui/material';
import { ReactNode, useState } from 'react';

interface Column<T> {
  id: keyof T | string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: unknown, row: T) => ReactNode;
  width?: string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: boolean;
  rowsPerPageOptions?: number[];
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  hideColumnsOnTablet?: string[]; // Column IDs to hide on tablet
}

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  pagination = true,
  rowsPerPageOptions = [10, 25, 50],
  onRowClick,
  stickyHeader = false,
  hideColumnsOnTablet = [],
}: DataTableProps<T>) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  // Filter columns based on screen size
  const visibleColumns = columns.filter(column => {
    if (hideColumnsOnTablet.includes(String(column.id))) {
      return false; // Hide on tablet and mobile
    }
    return true;
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedData = pagination
    ? data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : data;

  if (loading) {
    return (
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell key={column.id as string}>
                  <Skeleton width="60%" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {columns.map(column => (
                  <TableCell key={column.id as string}>
                    <Skeleton />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 2,
        // Enhanced scrolling for tablets
        '& .MuiTable-root': {
          minWidth: { mobile: '100%', tablet: '650px' },
        },
      }}
    >
      <Table stickyHeader={stickyHeader}>
        <TableHead>
          <TableRow>
            {visibleColumns.map(column => (
              <TableCell
                key={column.id as string}
                align={column.align || 'left'}
                sx={{
                  fontWeight: 600,
                  backgroundColor: theme.palette.background.default,
                  width: column.width,
                  // Better tablet styling
                  fontSize: { mobile: '0.875rem', tablet: '1rem' },
                  padding: { mobile: '8px 12px', tablet: '16px' },
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} align="center">
                <Box py={4}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row, index) => (
              <TableRow
                key={index}
                hover
                onClick={() => onRowClick?.(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                  // Better touch targets for tablet
                  height: { mobile: '56px', tablet: '64px' },
                }}
              >
                {visibleColumns.map(column => {
                  const columnId = String(column.id);
                  const value = columnId.includes('.')
                    ? columnId
                        .split('.')
                        .reduce((obj: unknown, key: string) => {
                          const record = obj as Record<string, unknown> | null;
                          return record?.[key];
                        }, row)
                    : row[column.id as keyof T];

                  return (
                    <TableCell
                      key={column.id as string}
                      align={column.align || 'left'}
                      sx={{
                        fontSize: { mobile: '0.875rem', tablet: '1rem' },
                        padding: { mobile: '8px 12px', tablet: '16px' },
                      }}
                    >
                      {column.format
                        ? column.format(value, row)
                        : (value as ReactNode)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination && data.length > 0 && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            // Better pagination for tablets
            '& .MuiTablePagination-toolbar': {
              padding: { mobile: '8px 16px', tablet: '16px 24px' },
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
              {
                fontSize: { mobile: '0.875rem', tablet: '1rem' },
              },
          }}
        />
      )}
    </TableContainer>
  );
}

export default DataTable;
