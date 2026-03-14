import type { ExportFormat, ExportRequest, ExportType } from '@dto/bindings';
import { commands } from '@dto/bindings';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { parseBackendError } from '@shared/lib/errorUtils';
import { useNotification } from '@shared/lib/notification';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Type guard functions for safe type checking
const isExportFormat = (value: string): value is ExportFormat => {
  return ['Html', 'Pdf', 'Xlsx', 'Csv', 'Json', 'Txt'].includes(value);
};

const isExportType = (value: string): value is ExportType => {
  return [
    'Standings',
    'CrossTable',
    'PairingSheets',
    'PlayerList',
    'Results',
    'GameResults',
    'TournamentSummary',
    'Complete',
  ].includes(value);
};

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  tournamentId: number;
  tournamentName: string;
}

export default function ExportDialog({
  open,
  onClose,
  tournamentId,
  tournamentName,
}: ExportDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useNotification();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('Html');
  const [exportType, setExportType] = useState<ExportType>('Standings');
  const [includeTiebreaks, setIncludeTiebreaks] = useState(true);
  const [includeCrossTable, setIncludeCrossTable] = useState(false);
  const [includeGameResults, setIncludeGameResults] = useState(false);
  const [includePlayerDetails, setIncludePlayerDetails] = useState(true);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportMessage('');

    try {
      const request: ExportRequest = {
        tournament_id: tournamentId,
        export_type: exportType,
        format: exportFormat,
        include_tiebreaks: includeTiebreaks,
        include_cross_table: includeCrossTable,
        include_game_results: includeGameResults,
        include_player_details: includePlayerDetails,
        custom_filename: customFilename || null,
        template_options: null,
      };

      const result = await commands.exportTournamentData(request);

      if (result.success) {
        const message = `Export successful! File saved as: ${result.file_name} (${(result.file_size / 1024).toFixed(2)} KB)`;
        setExportMessage(message);
        showSuccess(message);
      } else {
        const message = `Export failed: ${result.error_message || 'Unknown error'}`;
        setExportMessage(message);
        showError(message);
      }
    } catch (error) {
      const errorMessage = parseBackendError(error, t, 'export.failed');
      setExportMessage(`Export failed: ${errorMessage}`);
      showError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setExportMessage('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth>
      <DialogTitle>Export Tournament Data - {tournamentName}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Export Format</InputLabel>
              <Select
                value={exportFormat}
                onChange={e => {
                  const value = e.target.value;
                  if (isExportFormat(value)) {
                    setExportFormat(value);
                  }
                }}
                label="Export Format"
              >
                <MenuItem value="Html">HTML</MenuItem>
                <MenuItem value="Pdf">PDF</MenuItem>
                <MenuItem value="Xlsx">Excel (XLSX)</MenuItem>
                <MenuItem value="Csv">CSV</MenuItem>
                <MenuItem value="Json">JSON</MenuItem>
                <MenuItem value="Txt">Text</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Export Type</InputLabel>
              <Select
                value={exportType}
                onChange={e => {
                  const value = e.target.value;
                  if (isExportType(value)) {
                    setExportType(value);
                  }
                }}
                label="Export Type"
              >
                <MenuItem value="Standings">Standings</MenuItem>
                <MenuItem value="CrossTable">Cross Table</MenuItem>
                <MenuItem value="GameResults">Game Results</MenuItem>
                <MenuItem value="PlayerList">Player List</MenuItem>
                <MenuItem value="TournamentSummary">
                  Tournament Summary
                </MenuItem>
                <MenuItem value="Complete">Complete Export</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label="Custom Filename (optional)"
            value={customFilename}
            onChange={e => setCustomFilename(e.target.value)}
            placeholder="my-tournament-export"
            helperText="Leave empty for auto-generated filename"
          />

          <Box>
            <Typography variant="h6" gutterBottom>
              Include Options
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={includeTiebreaks}
                  onChange={e => setIncludeTiebreaks(e.target.checked)}
                />
              }
              label="Include Tiebreaks"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={includeCrossTable}
                  onChange={e => setIncludeCrossTable(e.target.checked)}
                />
              }
              label="Include Cross Table"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={includeGameResults}
                  onChange={e => setIncludeGameResults(e.target.checked)}
                />
              }
              label="Include Game Results"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={includePlayerDetails}
                  onChange={e => setIncludePlayerDetails(e.target.checked)}
                />
              }
              label="Include Player Details"
            />
          </Box>

          {exportMessage && (
            <Box
              sx={{
                p: 2,
                bgcolor: exportMessage.includes('successful')
                  ? 'success.light'
                  : 'error.light',
                color: exportMessage.includes('successful')
                  ? 'success.contrastText'
                  : 'error.contrastText',
                borderRadius: 1,
              }}
            >
              <Typography>{exportMessage}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={isExporting}
          startIcon={isExporting ? <CircularProgress size={16} /> : undefined}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
