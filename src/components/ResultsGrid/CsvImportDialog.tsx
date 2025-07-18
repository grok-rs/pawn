import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Visibility as PreviewIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Help as HelpIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { commands } from '@dto/bindings';
import type { CsvResultImport, CsvImportResult } from '@dto/bindings';

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  tournamentId: number;
  onImportComplete?: () => void;
}

const SAMPLE_CSV = `board,white,black,result,type,reason
1,John Smith,Jane Doe,1-0,,
2,Alice Johnson,Bob Wilson,1/2-1/2,,
3,Charlie Brown,Diana Prince,0-1,,
4,Edward Kim,Fiona Green,1-0,white_forfeit,Time forfeit`;

const steps = ['Upload CSV', 'Preview & Validate', 'Import Results'];

export const CsvImportDialog: React.FC<CsvImportDialogProps> = ({
  open,
  onClose,
  tournamentId,
  onImportComplete,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [csvContent, setCsvContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] =
    useState<CsvImportResult | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(
    null
  );
  const [showHelp, setShowHelp] = useState(false);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = e => {
          const content = e.target?.result as string;
          setCsvContent(content);
          setActiveStep(1);
        };
        reader.readAsText(file);
      }
    },
    []
  );

  const handleValidate = useCallback(async () => {
    if (!csvContent.trim()) return;

    setIsLoading(true);
    try {
      const result = await commands.importResultsCsv({
        tournament_id: tournamentId,
        csv_content: csvContent,
        validate_only: true,
        changed_by: 'current_user',
      });

      setValidationResult(result);
      if (result.success || result.valid_rows > 0) {
        setActiveStep(2);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationResult({
        success: false,
        total_rows: 0,
        valid_rows: 0,
        processed_rows: 0,
        errors: [
          {
            row_number: 0,
            field: null,
            message: `Validation failed: ${error}`,
            row_data: '',
          },
        ],
        warnings: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [csvContent, tournamentId]);

  const handleImport = useCallback(async () => {
    if (!csvContent.trim()) return;

    setIsLoading(true);
    try {
      const result = await commands.importResultsCsv({
        tournament_id: tournamentId,
        csv_content: csvContent,
        validate_only: false,
        changed_by: 'current_user',
      });

      setImportResult(result);

      if (result.success && onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        total_rows: 0,
        valid_rows: 0,
        processed_rows: 0,
        errors: [
          {
            row_number: 0,
            field: null,
            message: `Import failed: ${error}`,
            row_data: '',
          },
        ],
        warnings: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [csvContent, tournamentId, onImportComplete]);

  const handleClose = useCallback(() => {
    setActiveStep(0);
    setCsvContent('');
    setValidationResult(null);
    setImportResult(null);
    setShowHelp(false);
    onClose();
  }, [onClose]);

  const handleUseSample = useCallback(() => {
    setCsvContent(SAMPLE_CSV);
    setActiveStep(1);
  }, []);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              Upload a CSV file containing game results. The CSV should have
              columns for board numbers, player names, and results.
            </Typography>

            <Box my={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    fullWidth
                    size="large"
                    sx={{ height: 60 }}
                  >
                    Upload CSV File
                    <input
                      type="file"
                      hidden
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    onClick={handleUseSample}
                    startIcon={<PreviewIcon />}
                    fullWidth
                    size="large"
                    sx={{ height: 60 }}
                  >
                    Use Sample Data
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  CSV Format Requirements
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>Required columns:</strong>
                  <ul>
                    <li>
                      <strong>result</strong> - Game result (1-0, 0-1, 1/2-1/2,
                      *)
                    </li>
                  </ul>
                  <strong>Optional columns:</strong>
                  <ul>
                    <li>
                      <strong>board</strong> - Board number (for matching games)
                    </li>
                    <li>
                      <strong>white</strong> - White player name
                    </li>
                    <li>
                      <strong>black</strong> - Black player name
                    </li>
                    <li>
                      <strong>type</strong> - Result type (forfeit, default,
                      etc.)
                    </li>
                    <li>
                      <strong>reason</strong> - Additional notes
                    </li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            {csvContent && (
              <Box mt={2}>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={csvContent}
                  onChange={e => setCsvContent(e.target.value)}
                  label="CSV Content"
                  variant="outlined"
                />
                <Box mt={2} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={handleValidate}
                    startIcon={<PreviewIcon />}
                    disabled={!csvContent.trim()}
                  >
                    Validate & Preview
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              Review the validation results before importing.
            </Typography>

            {isLoading && <LinearProgress sx={{ my: 2 }} />}

            {validationResult && (
              <Box>
                <Grid container spacing={2} my={2}>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {validationResult.total_rows}
                        </Typography>
                        <Typography variant="body2">Total Rows</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {validationResult.valid_rows}
                        </Typography>
                        <Typography variant="body2">Valid Rows</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="error.main">
                          {validationResult.errors.length}
                        </Typography>
                        <Typography variant="body2">Errors</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main">
                          {validationResult.warnings.length}
                        </Typography>
                        <Typography variant="body2">Warnings</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {validationResult.errors.length > 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Validation Errors ({validationResult.errors.length})
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Row</TableCell>
                            <TableCell>Field</TableCell>
                            <TableCell>Message</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {validationResult.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>{error.row_number}</TableCell>
                              <TableCell>{error.field || '-'}</TableCell>
                              <TableCell>{error.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Alert>
                )}

                {validationResult.warnings.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Warnings ({validationResult.warnings.length})
                    </Typography>
                    {validationResult.warnings.map((warning, index) => (
                      <Typography key={index} variant="body2">
                        • {warning}
                      </Typography>
                    ))}
                  </Alert>
                )}

                {validationResult.success || validationResult.valid_rows > 0 ? (
                  <Alert severity="success">
                    Ready to import {validationResult.valid_rows} valid rows
                  </Alert>
                ) : (
                  <Alert severity="error">
                    Cannot proceed with import due to validation errors
                  </Alert>
                )}
              </Box>
            )}

            <Box mt={2} display="flex" justifyContent="space-between">
              <Button onClick={() => setActiveStep(0)}>Back</Button>
              <Button
                variant="contained"
                onClick={handleValidate}
                disabled={isLoading || !csvContent.trim()}
                startIcon={<PreviewIcon />}
              >
                Re-validate
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              Import the validated results into the tournament.
            </Typography>

            {isLoading && <LinearProgress sx={{ my: 2 }} />}

            {importResult && (
              <Box my={2}>
                <Alert
                  severity={importResult.success ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                  icon={importResult.success ? <SuccessIcon /> : <ErrorIcon />}
                >
                  <Typography variant="subtitle2">
                    {importResult.success
                      ? `Successfully imported ${importResult.processed_rows} results`
                      : `Import failed with ${importResult.errors.length} errors`}
                  </Typography>
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {importResult.total_rows}
                        </Typography>
                        <Typography variant="body2">Total Rows</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {importResult.processed_rows}
                        </Typography>
                        <Typography variant="body2">Imported</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="error.main">
                          {importResult.errors.length}
                        </Typography>
                        <Typography variant="body2">Errors</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main">
                          {importResult.warnings.length}
                        </Typography>
                        <Typography variant="body2">Warnings</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {importResult.errors.length > 0 && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Import Errors ({importResult.errors.length})
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Row</TableCell>
                            <TableCell>Message</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {importResult.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>{error.row_number}</TableCell>
                              <TableCell>{error.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Alert>
                )}
              </Box>
            )}

            <Box mt={2} display="flex" justifyContent="space-between">
              <Button onClick={() => setActiveStep(1)}>Back</Button>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={
                  isLoading ||
                  !validationResult?.success ||
                  validationResult?.valid_rows === 0 ||
                  importResult?.success
                }
                startIcon={<SaveIcon />}
              >
                Import Results
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          CSV Import Results
          <Box>
            <Tooltip title="Show help">
              <IconButton onClick={() => setShowHelp(!showHelp)}>
                <HelpIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {showHelp && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              CSV Import Help
            </Typography>
            <Typography variant="body2" component="div">
              • CSV files should have a header row with column names
              <br />
              • Board numbers are used to match games (board 1 = first game)
              <br />
              • Player names can be used for matching when board numbers are not
              available
              <br />
              • Results can be in various formats: 1-0, 0-1, 1/2-1/2, *, draw,
              white, black, etc.
              <br />• Special result types include forfeit, default, timeout,
              adjourned, cancelled
            </Typography>
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {importResult?.success ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
