import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid2 as Grid,
} from '@mui/material';
import {
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';

import type {
  UpdateGameResult,
  BatchValidationResult,
  GameResultValidation,
} from '../../dto/bindings';

interface BatchImportProps {
  tournamentId: number;
  onImportCompleted?: () => void;
  onClose?: () => void;
}

interface ImportData {
  gameId?: number;
  whitePlayer?: string;
  blackPlayer?: string;
  result: string;
  resultType?: string;
  resultReason?: string;
  arbiterNotes?: string;
}

interface ParsedImportRow {
  index: number;
  data: ImportData;
  validation?: GameResultValidation;
  status: 'pending' | 'valid' | 'invalid' | 'imported';
}


const SAMPLE_CSV = `Game ID,White Player,Black Player,Result,Result Type,Reason,Notes
1,Smith J.,Johnson A.,1-0,,Normal game,
2,Brown P.,Davis R.,0-1F,white_forfeit,Player did not show,
3,Wilson K.,Miller S.,1/2-1/2,,Draw agreed,
4,Taylor M.,Anderson L.,0-1D,white_default,Time forfeit,`;

export const BatchImport: React.FC<BatchImportProps> = ({
  tournamentId,
  onImportCompleted,
  onClose,
}) => {
  const [importData, setImportData] = useState<ParsedImportRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResults, setValidationResults] = useState<BatchValidationResult | null>(null);
  const [showSampleDialog, setShowSampleDialog] = useState(false);
  const [importFormat, setImportFormat] = useState<'csv' | 'manual'>('csv');
  const [manualEntry, setManualEntry] = useState<ImportData>({
    result: '*',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = useCallback((csvText: string): ImportData[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const header = lines[0].split(',').map(h => h.trim());
    const data: ImportData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== header.length) {
        console.warn(`Row ${i + 1} has ${values.length} columns, expected ${header.length}`);
        continue;
      }

      const row: ImportData = {
        gameId: values[0] ? parseInt(values[0]) : undefined,
        whitePlayer: values[1] || undefined,
        blackPlayer: values[2] || undefined,
        result: values[3] || '*',
        resultType: values[4] || undefined,
        resultReason: values[5] || undefined,
        arbiterNotes: values[6] || undefined,
      };

      data.push(row);
    }

    return data;
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      
      const rows: ParsedImportRow[] = parsed.map((data, index) => ({
        index: index + 1,
        data,
        status: 'pending',
      }));

      setImportData(rows);
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      alert('Failed to parse CSV file. Please check the format.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [parseCSV]);

  const addManualEntry = useCallback(() => {
    if (!manualEntry.result) return;

    const newRow: ParsedImportRow = {
      index: importData.length + 1,
      data: { ...manualEntry },
      status: 'pending',
    };

    setImportData(prev => [...prev, newRow]);
    setManualEntry({ result: '*' });
  }, [manualEntry, importData.length]);

  const removeRow = useCallback((index: number) => {
    setImportData(prev => prev.filter((_, i) => i !== index));
  }, []);

  const validateImportData = useCallback(async () => {
    if (importData.length === 0) return;

    setIsValidating(true);
    try {
      const updates: UpdateGameResult[] = importData.map(row => ({
        game_id: row.data.gameId || 0, // This needs to be resolved from player names if not provided
        result: row.data.result,
        result_type: row.data.resultType || null,
        result_reason: row.data.resultReason || null,
        arbiter_notes: row.data.arbiterNotes || null,
        changed_by: 'batch_import',
      }));

      const results = await invoke<BatchValidationResult>('plugin:pawn|batch_update_results', {
        data: {
          tournament_id: tournamentId,
          updates,
          validate_only: true,
        },
      });

      setValidationResults(results);

      // Update individual row validations
      setImportData(prev => prev.map((row, index) => {
        const validationResult = results.results.find(([i]) => i === index)?.[1];
        return {
          ...row,
          validation: validationResult,
          status: validationResult?.is_valid ? 'valid' : 'invalid',
        };
      }));

    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  }, [importData, tournamentId]);

  const executeImport = useCallback(async () => {
    if (!validationResults?.overall_valid) {
      alert('Please fix validation errors before importing');
      return;
    }

    setIsImporting(true);
    try {
      const updates: UpdateGameResult[] = importData
        .filter(row => row.status === 'valid')
        .map(row => ({
          game_id: row.data.gameId || 0,
          result: row.data.result,
          result_type: row.data.resultType || null,
          result_reason: row.data.resultReason || null,
          arbiter_notes: row.data.arbiterNotes || null,
          changed_by: 'batch_import',
        }));

      const results = await invoke<BatchValidationResult>('plugin:pawn|batch_update_results', {
        data: {
          tournament_id: tournamentId,
          updates,
          validate_only: false,
        },
      });

      if (results.overall_valid) {
        setImportData(prev => prev.map(row => ({
          ...row,
          status: row.status === 'valid' ? 'imported' : row.status,
        })));

        if (onImportCompleted) {
          onImportCompleted();
        }
      } else {
        alert('Import failed. Please check the results.');
      }

    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }, [validationResults, importData, tournamentId, onImportCompleted]);

  const validCount = importData.filter(row => row.status === 'valid').length;
  const invalidCount = importData.filter(row => row.status === 'invalid').length;
  const importedCount = importData.filter(row => row.status === 'imported').length;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Batch Import Game Results
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid>
          <FormControl>
            <InputLabel>Import Method</InputLabel>
            <Select
              value={importFormat}
              onChange={(e) => setImportFormat(e.target.value as 'csv' | 'manual')}
              label="Import Method"
            >
              <MenuItem value="csv">CSV Upload</MenuItem>
              <MenuItem value="manual">Manual Entry</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {importFormat === 'csv' && (
          <>
            <Grid>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload CSV
              </Button>
            </Grid>
            <Grid>
              <Button
                variant="text"
                onClick={() => setShowSampleDialog(true)}
              >
                View Sample CSV
              </Button>
            </Grid>
          </>
        )}
      </Grid>

      {importFormat === 'manual' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Add Manual Entry
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid size={2}>
                <TextField
                  label="Game ID"
                  type="number"
                  value={manualEntry.gameId || ''}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, gameId: parseInt(e.target.value) || undefined }))}
                  size="small"
                />
              </Grid>
              <Grid size={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Result</InputLabel>
                  <Select
                    value={manualEntry.result}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, result: e.target.value }))}
                    label="Result"
                  >
                    <MenuItem value="1-0">1-0</MenuItem>
                    <MenuItem value="0-1">0-1</MenuItem>
                    <MenuItem value="1/2-1/2">½-½</MenuItem>
                    <MenuItem value="*">*</MenuItem>
                    <MenuItem value="0-1F">0-1F</MenuItem>
                    <MenuItem value="1-0F">1-0F</MenuItem>
                    <MenuItem value="ADJ">ADJ</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={2}>
                <TextField
                  label="Result Type"
                  value={manualEntry.resultType || ''}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, resultType: e.target.value }))}
                  size="small"
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Reason"
                  value={manualEntry.resultReason || ''}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, resultReason: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid size={2}>
                <Button
                  variant="contained"
                  onClick={addManualEntry}
                  disabled={!manualEntry.result}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {importData.length > 0 && (
        <>
          <Box display="flex" gap={2} mb={2} alignItems="center">
            <Typography variant="subtitle1">
              Import Preview ({importData.length} entries)
            </Typography>
            
            {validCount > 0 && <Chip label={`${validCount} valid`} color="success" size="small" />}
            {invalidCount > 0 && <Chip label={`${invalidCount} invalid`} color="error" size="small" />}
            {importedCount > 0 && <Chip label={`${importedCount} imported`} color="info" size="small" />}

            <Button
              variant="outlined"
              onClick={validateImportData}
              disabled={isValidating || isImporting}
            >
              {isValidating ? 'Validating...' : 'Validate All'}
            </Button>

            <Button
              variant="contained"
              onClick={executeImport}
              disabled={!validationResults?.overall_valid || isImporting || validCount === 0}
              startIcon={<CloudUploadIcon />}
            >
              {isImporting ? 'Importing...' : `Import ${validCount} Results`}
            </Button>
          </Box>

          {(isValidating || isImporting) && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Game ID</TableCell>
                  <TableCell>Result</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Issues</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.index}</TableCell>
                    <TableCell>{row.data.gameId || 'N/A'}</TableCell>
                    <TableCell>{row.data.result}</TableCell>
                    <TableCell>{row.data.resultType || 'Standard'}</TableCell>
                    <TableCell>{row.data.resultReason || ''}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        color={
                          row.status === 'valid' ? 'success' :
                          row.status === 'invalid' ? 'error' :
                          row.status === 'imported' ? 'info' : 'default'
                        }
                        size="small"
                        icon={
                          row.status === 'valid' ? <CheckIcon /> :
                          row.status === 'invalid' ? <ErrorIcon /> :
                          row.status === 'imported' ? <CheckIcon /> : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {row.validation?.errors && row.validation.errors.length > 0 && (
                        <Typography variant="caption" color="error">
                          {row.validation.errors.join(', ')}
                        </Typography>
                      )}
                      {row.validation?.warnings && row.validation.warnings.length > 0 && (
                        <Typography variant="caption" color="warning.main">
                          {row.validation.warnings.join(', ')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => removeRow(index)}
                        disabled={row.status === 'imported'}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {importData.length === 0 && (
        <Alert severity="info">
          {importFormat === 'csv' 
            ? 'Upload a CSV file to start importing game results.' 
            : 'Add manual entries to start importing game results.'}
        </Alert>
      )}

      {onClose && (
        <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
          <Button onClick={onClose}>
            Close
          </Button>
        </Box>
      )}

      {/* Sample CSV Dialog */}
      <Dialog open={showSampleDialog} onClose={() => setShowSampleDialog(false)} maxWidth={false} fullWidth>
        <DialogTitle>Sample CSV Format</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Your CSV file should have the following format:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
              {SAMPLE_CSV}
            </Typography>
          </Paper>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Notes:</strong>
            <ul>
              <li>Game ID is required if you want to update existing games</li>
              <li>Result Type can be: white_forfeit, black_forfeit, white_default, black_default, timeout, adjourned, double_forfeit, cancelled</li>
              <li>Reason and Notes are optional fields for additional context</li>
            </ul>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSampleDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};