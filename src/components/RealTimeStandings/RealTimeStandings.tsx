import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Chip,
  CircularProgress,
  Button,
  Switch,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import {
  Refresh,
  WifiOff,
  Wifi,
  Schedule,
  TrendingUp,
  ClearAll,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import StandingsTable from '../StandingsTable';
import { useRealTimeStandings } from '../../hooks/useRealTimeStandings';
import type { TiebreakBreakdown } from '@dto/bindings';

interface RealTimeStandingsProps {
  tournamentId: number;
  onTiebreakBreakdown?: (
    playerId: number,
    tiebreakType: string
  ) => Promise<TiebreakBreakdown>;
  onPlayerClick?: (playerId: number) => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  onPrint?: () => void;
}

const RealTimeStandings: React.FC<RealTimeStandingsProps> = ({
  tournamentId,
  onTiebreakBreakdown,
  onPlayerClick,
  onExportCsv,
  onExportPdf,
  onPrint,
}) => {
  const { t } = useTranslation();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    standings,
    loading,
    error,
    lastUpdated,
    isConnected,
    forceRefresh,
    clearCache,
    retryConnection,
  } = useRealTimeStandings({
    tournamentId,
    autoRefresh,
    refreshInterval: 30000, // 30 seconds
    onError: error => {
      console.error('Real-time standings error:', error);
    },
    onUpdate: standings => {
      // Standings updated
      setSuccessMessage(t('standingsUpdated'));
      setShowSuccessMessage(true);
    },
  });

  const handleForceRefresh = useCallback(async () => {
    await forceRefresh();
    setSuccessMessage(t('standingsRefreshed'));
    setShowSuccessMessage(true);
  }, [forceRefresh, t]);

  const handleClearCache = useCallback(async () => {
    await clearCache();
    setSuccessMessage(t('cacheCleared'));
    setShowSuccessMessage(true);
  }, [clearCache, t]);

  const getConnectionStatus = () => {
    if (loading) {
      return {
        icon: <CircularProgress size={16} />,
        label: t('updating'),
        color: 'info' as const,
      };
    }

    if (error) {
      return {
        icon: <Warning />,
        label: t('error'),
        color: 'error' as const,
      };
    }

    if (isConnected) {
      return {
        icon: <Wifi />,
        label: t('connected'),
        color: 'success' as const,
      };
    }

    return {
      icon: <WifiOff />,
      label: t('disconnected'),
      color: 'warning' as const,
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with controls */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeft: 4,
          borderLeftColor: connectionStatus.color + '.main',
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <TrendingUp color="primary" />
            <Typography variant="h6">{t('realTimeStandings')}</Typography>
          </Box>

          {lastUpdated && (
            <Tooltip title={lastUpdated.toLocaleString()}>
              <Chip
                icon={<Schedule />}
                label={formatDistanceToNow(lastUpdated, { addSuffix: true })}
                size="small"
                color="default"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label={t('autoRefresh')}
          />

          <Tooltip title={connectionStatus.label}>
            <Chip
              icon={connectionStatus.icon}
              label={connectionStatus.label}
              size="small"
              color={connectionStatus.color}
              variant="outlined"
            />
          </Tooltip>

          <Tooltip title={t('forceRefresh')}>
            <IconButton
              onClick={handleForceRefresh}
              disabled={loading}
              size="small"
              color="primary"
            >
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('clearCache')}>
            <IconButton
              onClick={handleClearCache}
              disabled={loading}
              size="small"
              color="default"
            >
              <ClearAll />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={retryConnection}>
              {t('retry')}
            </Button>
          }
        >
          <AlertTitle>{t('connectionError')}</AlertTitle>
          {error.message}
        </Alert>
      )}

      {/* No Connection Warning */}
      {!isConnected && !error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>{t('noRealTimeConnection')}</AlertTitle>
          {t('fallingBackToPolling')}
        </Alert>
      )}

      {/* Standings Table */}
      <Box sx={{ flexGrow: 1 }}>
        {standings ? (
          <StandingsTable
            standings={standings.standings}
            loading={loading}
            onPlayerClick={onPlayerClick}
            onTiebreakBreakdown={onTiebreakBreakdown}
            onExportCsv={onExportCsv}
            onExportPdf={onExportPdf}
            onPrint={onPrint}
          />
        ) : (
          <Paper
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {loading ? (
              <>
                <CircularProgress />
                <Typography variant="body1">{t('loadingStandings')}</Typography>
              </>
            ) : (
              <>
                <Typography variant="h6" color="text.secondary">
                  {t('noStandingsAvailable')}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleForceRefresh}
                >
                  {t('loadStandings')}
                </Button>
              </>
            )}
          </Paper>
        )}
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccessMessage(false)}
          severity="success"
          variant="filled"
          icon={<CheckCircle />}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RealTimeStandings;
