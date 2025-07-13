import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Tooltip,
  Button,
  ButtonGroup,
  Chip,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
  GridRowsProp,
  GridColumnVisibilityModel,
} from '@mui/x-data-grid';
import {
  Search,
  Download,
  Print,
  TableRows,
  EmojiEvents,
  TrendingUp,
  TrendingDown,
  Remove,
  ExpandMore,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { PlayerStanding, TiebreakType } from '../../dto/bindings';

interface StandingsTableProps {
  standings: PlayerStanding[];
  loading?: boolean;
  onPlayerClick?: (playerId: number) => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  onPrint?: () => void;
}

const TIEBREAK_SHORT_NAMES: Record<TiebreakType, string> = {
  buchholz_full: 'Buch',
  buchholz_cut_1: 'Buch-1',
  buchholz_cut_2: 'Buch-2',
  buchholz_median: 'Med-Buch',
  sonneborn_berger: 'S-B',
  progressive_score: 'Prog',
  cumulative_score: 'Cumul',
  direct_encounter: 'DE',
  average_rating_of_opponents: 'ARO',
  tournament_performance_rating: 'TPR',
  number_of_wins: 'Wins',
  number_of_games_with_black: 'Black',
  number_of_wins_with_black: 'W-Black',
  koya_system: 'Koya',
  aroc_cut_1: 'AROC-1',
  aroc_cut_2: 'AROC-2',
  match_points: 'MP',
  game_points: 'GP',
  board_points: 'BP',
};

const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  loading = false,
  onPlayerClick,
  onExportCsv,
  onExportPdf,
  onPrint,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [denseMode, setDenseMode] = useState(false);
  const [showTiebreaks, setShowTiebreaks] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [columnVisibility, setColumnVisibility] = useState<GridColumnVisibilityModel>({});

  const filteredStandings = useMemo(() => {
    if (!searchQuery) return standings;
    
    const query = searchQuery.toLowerCase();
    return standings.filter((standing) =>
      standing.player.name.toLowerCase().includes(query) ||
      standing.player.country_code?.toLowerCase().includes(query) ||
      standing.player.rating?.toString().includes(query)
    );
  }, [standings, searchQuery]);

  const rows: GridRowsProp = filteredStandings.map((standing) => ({
    id: standing.player.id,
    ...standing,
  }));

  const baseColumns: GridColDef[] = [
    {
      field: 'rank',
      headerName: t('rank'),
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {params.value}
          {params.value === 1 && <EmojiEvents sx={{ color: 'gold', fontSize: 20 }} />}
          {params.value === 2 && <EmojiEvents sx={{ color: 'silver', fontSize: 18 }} />}
          {params.value === 3 && <EmojiEvents sx={{ color: '#CD7F32', fontSize: 16 }} />}
        </Box>
      ),
    },
    {
      field: 'name',
      headerName: t('player'),
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box
          sx={{
            cursor: onPlayerClick ? 'pointer' : 'default',
            '&:hover': onPlayerClick ? { textDecoration: 'underline' } : {},
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
          onClick={() => onPlayerClick?.(params.row.player.id)}
        >
          <Typography variant="body2" fontWeight={500}>
            {params.row.player.name}
          </Typography>
          {params.row.player.country_code && (
            <Chip 
              label={params.row.player.country_code} 
              size="small" 
              variant="outlined"
              sx={{ 
                height: 20, 
                fontSize: '0.75rem',
                color: 'text.secondary',
                borderColor: 'text.secondary',
              }}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'rating',
      headerName: t('rating'),
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          {params.row.player.rating || 'Unrated'}
          {params.row.rating_change && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {params.row.rating_change > 0 ? (
                <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
              ) : params.row.rating_change < 0 ? (
                <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />
              ) : (
                <Remove sx={{ color: 'text.secondary', fontSize: 16 }} />
              )}
              <Typography variant="caption" color={
                params.row.rating_change > 0 ? 'success.main' :
                params.row.rating_change < 0 ? 'error.main' : 'text.secondary'
              }>
                {params.row.rating_change > 0 ? '+' : ''}{params.row.rating_change}
              </Typography>
            </Box>
          )}
        </Box>
      ),
    },
    {
      field: 'points',
      headerName: t('points'),
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="h6" color="primary">
          {params.value}
        </Typography>
      ),
      valueFormatter: (value: any) => (value as number).toFixed(1),
    },
    {
      field: 'games_played',
      headerName: t('games'),
      width: 80,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'wins',
      headerName: t('wins'),
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          size="small" 
          color="success" 
          variant="outlined"
        />
      ),
    },
    {
      field: 'draws',
      headerName: t('draws'),
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          size="small" 
          color="warning" 
          variant="outlined"
        />
      ),
    },
    {
      field: 'losses',
      headerName: t('losses'),
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          size="small" 
          color="error" 
          variant="outlined"
        />
      ),
    },
    {
      field: 'performance_rating',
      headerName: 'TPR',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Tooltip title={t('Tournament Performance Rating')}>
            <Typography variant="body2" fontWeight={500}>
              {params.value}
            </Typography>
          </Tooltip>
        ) : '-'
      ),
    },
  ];

  // Add tiebreak columns dynamically
  const tiebreakColumns: GridColDef[] = showTiebreaks && standings[0]?.tiebreak_scores
    ? standings[0].tiebreak_scores.map((_, index) => ({
        field: `tiebreak_${index}`,
        headerName: TIEBREAK_SHORT_NAMES[standings[0].tiebreak_scores[index].tiebreak_type],
        width: 100,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (_value: any, row: any) => row.tiebreak_scores[index]?.display_value || '-',
        renderCell: (params: GridRenderCellParams) => (
          <Tooltip title={standings[0].tiebreak_scores[index].tiebreak_type.replace(/_/g, ' ')}>
            <Typography variant="body2">
              {params.value}
            </Typography>
          </Tooltip>
        ),
      }))
    : [];

  const columns = [...baseColumns, ...tiebreakColumns];

  const handleExportMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, maxWidth: 300 }}
          />
          
          <Box sx={{ flexGrow: 1 }} />
          
          <FormControlLabel
            control={
              <Switch
                checked={showTiebreaks}
                onChange={(e) => setShowTiebreaks(e.target.checked)}
                size="small"
              />
            }
            label={t('showTiebreaks')}
          />
          
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title={t('denseView')}>
              <Button
                onClick={() => setDenseMode(!denseMode)}
                variant={denseMode ? 'contained' : 'outlined'}
              >
                <TableRows />
              </Button>
            </Tooltip>
          </ButtonGroup>
          
          <Button
            variant="outlined"
            size="small"
            endIcon={<ExpandMore />}
            onClick={handleExportMenu}
          >
            {t('export')}
          </Button>
        </Box>
      </Box>

      {/* Data Grid */}
      <Box sx={{ flexGrow: 1, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          density={denseMode ? 'compact' : 'standard'}
          loading={loading}
          disableRowSelectionOnClick
          columnVisibilityModel={columnVisibility}
          onColumnVisibilityModelChange={(model) => setColumnVisibility(model)}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-row:nth-of-type(odd)': {
              backgroundColor: 'action.hover',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.selected',
            },
          }}
        />
      </Box>

      {/* Export Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {onExportCsv && (
          <MenuItem onClick={() => {
            handleCloseMenu();
            onExportCsv();
          }}>
            <ListItemIcon>
              <Download fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('exportCsv')}</ListItemText>
          </MenuItem>
        )}
        {onExportPdf && (
          <MenuItem onClick={() => {
            handleCloseMenu();
            onExportPdf();
          }}>
            <ListItemIcon>
              <Download fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('exportPdf')}</ListItemText>
          </MenuItem>
        )}
        <Divider />
        {onPrint && (
          <MenuItem onClick={() => {
            handleCloseMenu();
            onPrint();
          }}>
            <ListItemIcon>
              <Print fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('print')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export default StandingsTable;