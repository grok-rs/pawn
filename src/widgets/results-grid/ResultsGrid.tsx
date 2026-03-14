import type { GameResult } from '@dto/bindings';
import {
  FlashOn as BulkIcon,
  Clear as ClearIcon,
  Computer as ComputerIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  PhoneAndroid as PhoneIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CsvImportDialog } from './CsvImportDialog';
import { MobileResultEntry } from './MobileResultEntry';
import { useResultsGrid } from './useResultsGrid';

interface ResultsGridProps {
  tournamentId: number;
  roundNumber?: number;
  games: GameResult[];
  onResultsUpdated?: () => void;
  readOnly?: boolean;
}

export function ResultsGrid({
  tournamentId,
  roundNumber,
  games,
  onResultsUpdated,
  readOnly = false,
}: ResultsGridProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('md'));

  const RESULT_OPTIONS = [
    { value: '1-0', label: t('gameResults.results.whiteWins'), standard: true },
    { value: '0-1', label: t('gameResults.results.blackWins'), standard: true },
    { value: '1/2-1/2', label: t('gameResults.results.draw'), standard: true },
    { value: '*', label: t('gameResults.results.ongoing'), standard: true },
    {
      value: '0-1F',
      label: t('gameResults.results.whiteForfeit'),
      standard: false,
    },
    {
      value: '1-0F',
      label: t('gameResults.results.blackForfeit'),
      standard: false,
    },
    {
      value: '0-1D',
      label: t('gameResults.results.whiteDefault'),
      standard: false,
    },
    {
      value: '1-0D',
      label: t('gameResults.results.blackDefault'),
      standard: false,
    },
    {
      value: 'ADJ',
      label: t('gameResults.results.adjourned'),
      standard: false,
    },
    {
      value: '0-1T',
      label: t('gameResults.results.whiteTimeout'),
      standard: false,
    },
    {
      value: '1-0T',
      label: t('gameResults.results.blackTimeout'),
      standard: false,
    },
    {
      value: '0-0',
      label: t('gameResults.results.doubleForfeit'),
      standard: false,
    },
    {
      value: 'CANC',
      label: t('gameResults.results.cancelled'),
      standard: false,
    },
  ];

  const {
    resultEntries,
    selectedAuditGame,
    auditTrail,
    isAuditDialogOpen,
    isSaving,
    selectedGameIndex,
    keyboardShortcutsEnabled,
    showKeyboardHelp,
    showMobileView,
    bulkMenuAnchor,
    showCsvImport,
    tableRef,
    modifiedCount,
    hasErrors,
    setIsAuditDialogOpen,
    setSelectedGameIndex,
    setKeyboardShortcutsEnabled,
    setShowKeyboardHelp,
    setShowMobileView,
    setBulkMenuAnchor,
    setShowCsvImport,
    updateResultEntry,
    handleResultChange,
    handleResultTypeChange,
    batchValidate,
    handleSaveAll,
    handleBulkOperation,
    handleShowAuditTrail,
  } = useResultsGrid(tournamentId, games, onResultsUpdated, readOnly);

  // Show mobile view if enabled or on mobile screen
  if (showMobileView || (isMobileScreen && !readOnly)) {
    return (
      <MobileResultEntry
        tournamentId={tournamentId}
        games={games}
        onResultsUpdated={onResultsUpdated}
        onClose={() => setShowMobileView(false)}
      />
    );
  }

  return (
    <Box>
      <Grid container spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
        <Grid>
          <Typography variant="h6" color="primary" fontWeight={600}>
            {t('gameResults.title')}{' '}
            {roundNumber
              ? `- ${t('gameResults.roundTitle', { roundNumber })}`
              : ''}
          </Typography>
        </Grid>
        {!readOnly && (
          <>
            <Grid>
              <Button
                variant="outlined"
                onClick={batchValidate}
                disabled={modifiedCount === 0}
              >
                {t('gameResults.buttons.validateAll')} ({modifiedCount})
              </Button>
            </Grid>
            <Grid>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveAll}
                disabled={modifiedCount === 0 || isSaving}
                color={hasErrors ? 'error' : 'primary'}
              >
                {t('gameResults.buttons.saveAll')} ({modifiedCount})
              </Button>
            </Grid>
            <Grid>
              <Button
                variant="outlined"
                startIcon={<BulkIcon />}
                endIcon={<ExpandMoreIcon />}
                onClick={e => setBulkMenuAnchor(e.currentTarget)}
                disabled={games.length === 0}
              >
                {t('gameResults.buttons.bulkOperations')}
              </Button>
              <Menu
                anchorEl={bulkMenuAnchor}
                open={Boolean(bulkMenuAnchor)}
                onClose={() => setBulkMenuAnchor(null)}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
              >
                <MenuItem
                  onClick={() => handleBulkOperation('all_draws')}
                  disabled={games.length === 0}
                >
                  <ListItemIcon>
                    <BulkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('gameResults.bulk.setAllDraws')}
                    secondary={t('gameResults.bulk.setAllDrawsDesc')}
                  />
                </MenuItem>
                <MenuItem
                  onClick={() => handleBulkOperation('all_ongoing')}
                  disabled={games.length === 0}
                >
                  <ListItemIcon>
                    <BulkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('gameResults.bulk.setAllOngoing')}
                    secondary={t('gameResults.bulk.setAllOngoingDesc')}
                  />
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setBulkMenuAnchor(null);
                    setShowCsvImport(true);
                  }}
                >
                  <ListItemIcon>
                    <UploadIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('gameResults.bulk.importCsv')}
                    secondary={t('gameResults.bulk.importCsvDesc')}
                  />
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => handleBulkOperation('reset_modified')}
                  disabled={modifiedCount === 0}
                >
                  <ListItemIcon>
                    <ClearIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('gameResults.bulk.resetChanges')}
                    secondary={t('gameResults.bulk.resetChangesDesc', {
                      count: modifiedCount,
                    })}
                  />
                </MenuItem>
              </Menu>
            </Grid>
            <Grid>
              <Button
                variant="outlined"
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                size="small"
              >
                {t('gameResults.buttons.shortcuts')} (Ctrl+?)
              </Button>
            </Grid>
            <Grid>
              <FormControl>
                <Button
                  variant={keyboardShortcutsEnabled ? 'contained' : 'outlined'}
                  onClick={() =>
                    setKeyboardShortcutsEnabled(!keyboardShortcutsEnabled)
                  }
                  size="small"
                  color={keyboardShortcutsEnabled ? 'primary' : 'inherit'}
                >
                  {keyboardShortcutsEnabled
                    ? t('gameResults.buttons.shortcutsOn')
                    : t('gameResults.buttons.shortcutsOff')}
                </Button>
              </FormControl>
            </Grid>
            <Grid>
              <Button
                variant={showMobileView ? 'contained' : 'outlined'}
                onClick={() => setShowMobileView(!showMobileView)}
                size="small"
                startIcon={showMobileView ? <PhoneIcon /> : <ComputerIcon />}
                color={showMobileView ? 'primary' : 'inherit'}
              >
                {showMobileView
                  ? t('gameResults.buttons.mobile')
                  : t('gameResults.buttons.desktop')}
              </Button>
            </Grid>
          </>
        )}
      </Grid>

      {hasErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('gameResults.messages.validationFailed')}
        </Alert>
      )}

      {showKeyboardHelp && !readOnly && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('gameResults.shortcuts.title')}
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('gameResults.shortcuts.resultEntry')}
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>1</strong> - {t('gameResults.shortcuts.whiteWins')}
                  <br />
                  <strong>0</strong> - {t('gameResults.shortcuts.blackWins')}
                  <br />
                  <strong>=</strong> - {t('gameResults.shortcuts.draw')}
                  <br />
                  <strong>*</strong> - {t('gameResults.shortcuts.ongoing')}
                  <br />
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('gameResults.shortcuts.specialResults')}
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>F</strong> - {t('gameResults.shortcuts.forfeit')}
                  <br />
                  <strong>D</strong> - {t('gameResults.shortcuts.default')}
                  <br />
                  <strong>T</strong> - {t('gameResults.shortcuts.timeout')}
                  <br />
                  <strong>A</strong> - {t('gameResults.shortcuts.adjourned')}
                  <br />
                  <strong>X</strong> -{' '}
                  {t('gameResults.shortcuts.doubleForfeit')}
                  <br />
                  <strong>C</strong> - {t('gameResults.shortcuts.cancelled')}
                  <br />
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('gameResults.shortcuts.navigation')}
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>↑/↓</strong> -{' '}
                  {t('gameResults.shortcuts.navigateGames')}
                  <br />
                  <strong>Ctrl+S</strong> - {t('gameResults.shortcuts.saveAll')}
                  <br />
                  <strong>Ctrl+Enter</strong> -{' '}
                  {t('gameResults.shortcuts.validateAll')}
                  <br />
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Paper} ref={tableRef}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('gameResults.headers.board')}</TableCell>
              <TableCell>{t('gameResults.headers.white')}</TableCell>
              <TableCell>{t('gameResults.headers.black')}</TableCell>
              <TableCell>{t('gameResults.headers.result')}</TableCell>
              {!readOnly && (
                <TableCell>{t('gameResults.headers.type')}</TableCell>
              )}
              {!readOnly && (
                <TableCell>{t('gameResults.headers.reasonNotes')}</TableCell>
              )}
              <TableCell>{t('gameResults.headers.status')}</TableCell>
              <TableCell>{t('gameResults.headers.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {games.map((gameResult, index) => {
              const entry = resultEntries.get(gameResult.game.id);
              if (!entry) return null;

              const isSelected =
                !readOnly &&
                keyboardShortcutsEnabled &&
                index === selectedGameIndex;

              return (
                <TableRow
                  key={gameResult.game.id}
                  sx={{
                    backgroundColor: isSelected ? 'primary.main' : 'inherit',
                    color: isSelected ? 'primary.contrastText' : 'inherit',
                    '&:hover': {
                      backgroundColor: isSelected ? 'primary.dark' : 'grey.100',
                    },
                    cursor: !readOnly ? 'pointer' : 'default',
                  }}
                  onClick={() => !readOnly && setSelectedGameIndex(index)}
                >
                  <TableCell sx={{ color: 'inherit' }}>{index + 1}</TableCell>
                  <TableCell sx={{ color: 'inherit' }}>
                    {gameResult.white_player.name}
                  </TableCell>
                  <TableCell sx={{ color: 'inherit' }}>
                    {gameResult.black_player.name}
                  </TableCell>

                  <TableCell sx={{ color: 'inherit' }}>
                    {readOnly ? (
                      entry.result
                    ) : (
                      <FormControl size="small" fullWidth>
                        <Select
                          value={entry.result}
                          onChange={e =>
                            handleResultChange(
                              gameResult.game.id,
                              e.target.value
                            )
                          }
                          sx={{
                            '& .MuiSelect-select': {
                              color: isSelected
                                ? 'primary.contrastText'
                                : 'inherit',
                            },
                          }}
                        >
                          {RESULT_OPTIONS.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </TableCell>

                  {!readOnly && (
                    <TableCell sx={{ color: 'inherit' }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={entry.resultType || ''}
                          onChange={e =>
                            handleResultTypeChange(
                              gameResult.game.id,
                              e.target.value
                            )
                          }
                          displayEmpty
                          sx={{
                            '& .MuiSelect-select': {
                              color: isSelected
                                ? 'primary.contrastText'
                                : 'inherit',
                            },
                          }}
                        >
                          <MenuItem value="">
                            {t('gameResults.types.standard')}
                          </MenuItem>
                          <MenuItem value="white_forfeit">
                            {t('gameResults.types.whiteForfeit')}
                          </MenuItem>
                          <MenuItem value="black_forfeit">
                            {t('gameResults.types.blackForfeit')}
                          </MenuItem>
                          <MenuItem value="white_default">
                            {t('gameResults.types.whiteDefault')}
                          </MenuItem>
                          <MenuItem value="black_default">
                            {t('gameResults.types.blackDefault')}
                          </MenuItem>
                          <MenuItem value="timeout">
                            {t('gameResults.types.timeout')}
                          </MenuItem>
                          <MenuItem value="adjourned">
                            {t('gameResults.types.adjourned')}
                          </MenuItem>
                          <MenuItem value="double_forfeit">
                            {t('gameResults.types.doubleForfeit')}
                          </MenuItem>
                          <MenuItem value="cancelled">
                            {t('gameResults.types.cancelled')}
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}

                  {!readOnly && (
                    <TableCell sx={{ color: 'inherit' }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder={t('gameResults.placeholders.reasonNotes')}
                        value={entry.resultReason || ''}
                        onChange={e =>
                          updateResultEntry(gameResult.game.id, {
                            resultReason: e.target.value,
                          })
                        }
                        sx={{
                          '& .MuiInputBase-input': {
                            color: isSelected
                              ? 'primary.contrastText'
                              : 'inherit',
                          },
                        }}
                      />
                    </TableCell>
                  )}

                  <TableCell sx={{ color: 'inherit' }}>
                    <Box display="flex" gap={1} alignItems="center">
                      {entry.isModified && (
                        <Chip
                          label={t('gameResults.status.modified')}
                          size="small"
                          color="warning"
                        />
                      )}
                      {entry.requiresApproval && (
                        <Chip
                          label={t('gameResults.status.needsApproval')}
                          size="small"
                          color="error"
                        />
                      )}
                      {entry.validation?.errors &&
                        entry.validation.errors.length > 0 && (
                          <Tooltip title={entry.validation.errors.join(', ')}>
                            <WarningIcon color="error" />
                          </Tooltip>
                        )}
                      {entry.validation?.warnings &&
                        entry.validation.warnings.length > 0 && (
                          <Tooltip title={entry.validation.warnings.join(', ')}>
                            <WarningIcon color="warning" />
                          </Tooltip>
                        )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ color: 'inherit' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleShowAuditTrail(gameResult.game.id)}
                      title={t('gameResults.tooltips.auditTrail')}
                      sx={{
                        color: isSelected ? 'primary.contrastText' : 'inherit',
                      }}
                    >
                      <HistoryIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Audit Trail Dialog */}
      <Dialog
        open={isAuditDialogOpen}
        onClose={() => setIsAuditDialogOpen(false)}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>
          {t('gameResults.audit.title', { gameId: selectedAuditGame })}
        </DialogTitle>
        <DialogContent>
          {auditTrail.length === 0 ? (
            <Typography>{t('gameResults.audit.noData')}</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('gameResults.audit.headers.date')}</TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.oldResult')}
                    </TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.newResult')}
                    </TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.changedBy')}
                    </TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.reason')}
                    </TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.approved')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditTrail.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.changed_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {record.old_result || t('gameResults.audit.na')}
                      </TableCell>
                      <TableCell>{record.new_result}</TableCell>
                      <TableCell>
                        {record.changed_by || t('gameResults.audit.system')}
                      </TableCell>
                      <TableCell>{record.reason || ''}</TableCell>
                      <TableCell>
                        {record.approved ? (
                          <Chip
                            label={t('gameResults.audit.approved')}
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label={t('gameResults.audit.pending')}
                            color="warning"
                            size="small"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAuditDialogOpen(false)}>
            {t('gameResults.buttons.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
      <CsvImportDialog
        open={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        tournamentId={tournamentId}
        onImportComplete={() => {
          setShowCsvImport(false);
          onResultsUpdated?.();
        }}
      />
    </Box>
  );
}
