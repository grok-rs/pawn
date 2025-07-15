import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Visibility,
  Save,
} from '@mui/icons-material';
import { commands } from '../../dto/bindings';
import type {
  BulkImportRequest,
  BulkImportResult,
  BulkImportPlayer,
} from '../../dto/bindings';

interface BulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tournamentId: number;
}

const BulkImportDialog: React.FC<BulkImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
  tournamentId,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [csvData, setCsvData] = useState<BulkImportPlayer[]>([]);
  const [validationResult, setValidationResult] =
    useState<BulkImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    t('uploadFile'),
    t('validateData'),
    t('reviewResults'),
    t('importPlayers'),
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const csv = e.target?.result as string;
        const players = parseCSV(csv);
        setCsvData(players);
        setActiveStep(1);
        setError(null);
      } catch {
        setError(t('failedToParseCSV'));
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string): BulkImportPlayer[] => {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length < 2)
      throw new Error('CSV must have header and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const players: BulkImportPlayer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;

      const player: BulkImportPlayer = {
        name: '',
        rating: null,
        country_code: null,
        title: null,
        birth_date: null,
        gender: null,
        email: null,
        phone: null,
        club: null,
      };

      headers.forEach((header, index) => {
        const value = values[index];
        if (!value) return;

        switch (header) {
          case 'name':
          case 'player_name':
          case 'full_name':
            player.name = value;
            break;
          case 'rating':
          case 'elo':
          case 'fide_rating':
            player.rating = parseInt(value) || null;
            break;
          case 'country':
          case 'country_code':
          case 'federation':
            player.country_code = value.toUpperCase();
            break;
          case 'title':
          case 'chess_title':
            player.title = value.toUpperCase();
            break;
          case 'birth_date':
          case 'date_of_birth':
          case 'dob':
            player.birth_date = value;
            break;
          case 'gender':
          case 'sex':
            player.gender = value.toUpperCase();
            break;
          case 'email':
          case 'email_address':
            player.email = value;
            break;
          case 'phone':
          case 'phone_number':
          case 'mobile':
            player.phone = value;
            break;
          case 'club':
          case 'team':
          case 'organization':
            player.club = value;
            break;
        }
      });

      if (player.name) {
        players.push(player);
      }
    }

    return players;
  };

  const handleValidate = async () => {
    setLoading(true);
    try {
      const request: BulkImportRequest = {
        tournament_id: tournamentId,
        players: csvData,
        validate_only: true,
      };
      const result = await commands.validateBulkImport(request);
      setValidationResult(result);
      setActiveStep(2);
      setError(null);
    } catch (err) {
      console.error('Validation failed:', err);
      setError(t('validationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult) return;

    setLoading(true);
    try {
      const request: BulkImportRequest = {
        tournament_id: tournamentId,
        players: csvData,
        validate_only: false,
      };
      await commands.bulkImportPlayers(request);
      setActiveStep(3);
      onSuccess();
      setError(null);
    } catch (err) {
      console.error('Import failed:', err);
      setError(t('importFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setActiveStep(0);
      setCsvData([]);
      setValidationResult(null);
      setError(null);
    }
  };

  const getValidationSummary = () => {
    if (!validationResult) return null;

    const { success_count, error_count, validations } = validationResult;
    const warnings = validations.filter(v => v.warnings.length > 0).length;

    return {
      total: validations.length,
      valid: success_count,
      errors: error_count,
      warnings: warnings,
    };
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      sx={{ '& .MuiDialog-paper': { maxWidth: '1000px' } }}
    >
      <DialogTitle>{t('bulkImportPlayers')}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: Upload File */}
        {activeStep === 0 && (
          <Box>
            <Typography gutterBottom>{t('uploadCSVInstructions')}</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {t('csvFormatExample')}: name, rating, country_code, title,
                email, phone
              </Typography>
            </Alert>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUpload
                sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}
              />
              <Typography variant="h6" gutterBottom>
                {t('clickToUploadCSV')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('supportedFormats')}: CSV (.csv)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </Box>
          </Box>
        )}

        {/* Step 1: Validate Data */}
        {activeStep === 1 && (
          <Box>
            <Typography gutterBottom>
              {t('csvDataPreview')} ({csvData.length} {t('players')})
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 400, mb: 2 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('name')}</TableCell>
                    <TableCell>{t('rating')}</TableCell>
                    <TableCell>{t('country')}</TableCell>
                    <TableCell>{t('title')}</TableCell>
                    <TableCell>{t('email')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvData.slice(0, 10).map((player, index) => (
                    <TableRow key={index}>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.rating || '-'}</TableCell>
                      <TableCell>{player.country_code || '-'}</TableCell>
                      <TableCell>{player.title || '-'}</TableCell>
                      <TableCell>{player.email || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {csvData.length > 10 && (
              <Typography variant="body2" color="text.secondary">
                {t('showingFirst10Players')}
              </Typography>
            )}
          </Box>
        )}

        {/* Step 2: Review Results */}
        {activeStep === 2 && validationResult && (
          <Box>
            <Typography gutterBottom>{t('validationResults')}</Typography>

            {(() => {
              const summary = getValidationSummary();
              return (
                summary && (
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Chip
                      icon={<CheckCircle />}
                      label={`${summary.valid} ${t('valid')}`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      icon={<ErrorIcon />}
                      label={`${summary.errors} ${t('errors')}`}
                      color="error"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Warning />}
                      label={`${summary.warnings} ${t('warnings')}`}
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                )
              );
            })()}

            {validationResult.validations.some(
              v => v.errors.length > 0 || v.warnings.length > 0
            ) && (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('player')}</TableCell>
                      <TableCell>{t('status')}</TableCell>
                      <TableCell>{t('issues')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validationResult.validations
                      .filter(v => v.errors.length > 0 || v.warnings.length > 0)
                      .map((validation, index) => (
                        <TableRow key={index}>
                          <TableCell>{validation.player_data.name}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={
                                validation.errors.length > 0
                                  ? 'error'
                                  : 'warning'
                              }
                              label={
                                validation.errors.length > 0
                                  ? t('error')
                                  : t('warning')
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <List dense>
                              {validation.errors.map((error, i) => (
                                <ListItem key={i} sx={{ py: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 24 }}>
                                    <ErrorIcon color="error" fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText primary={error} />
                                </ListItem>
                              ))}
                              {validation.warnings.map((warning, i) => (
                                <ListItem key={i} sx={{ py: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 24 }}>
                                    <Warning color="warning" fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText primary={warning} />
                                </ListItem>
                              ))}
                            </List>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Step 3: Import Complete */}
        {activeStep === 3 && (
          <Box textAlign="center" sx={{ py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {t('importCompleted')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {validationResult?.success_count}{' '}
              {t('playersImportedSuccessfully')}
            </Typography>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {activeStep === 3 ? t('close') : t('cancel')}
        </Button>
        {activeStep === 1 && (
          <Button
            onClick={handleValidate}
            variant="contained"
            disabled={loading || csvData.length === 0}
            startIcon={<Visibility />}
          >
            {t('validateData')}
          </Button>
        )}
        {activeStep === 2 &&
          validationResult &&
          validationResult.success_count > 0 && (
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={loading}
              startIcon={<Save />}
            >
              {t('importPlayers')} ({validationResult.success_count})
            </Button>
          )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkImportDialog;
