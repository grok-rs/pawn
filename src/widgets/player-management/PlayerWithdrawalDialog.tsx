import type { Player } from '@dto/bindings';
import { commands } from '@dto/bindings';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  // Schedule,
  ExitToApp,
  // Warning,
  Info,
  Pause,
  Person,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  // Divider,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as yup from 'yup';

interface PlayerWithdrawalDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  player: Player | null;
}

const withdrawalSchema = yup.object({
  action: yup
    .string()
    .required('Please select an action')
    .oneOf(['withdraw', 'bye', 'reactivate']),
  reason: yup
    .string()
    .when('action', ([action], schema) =>
      action === 'withdraw'
        ? schema.required('Reason is required for withdrawal')
        : schema.nullable()
    ),
  notes: yup.string().nullable(),
});

type WithdrawalFormData = yup.InferType<typeof withdrawalSchema>;

function PlayerWithdrawalDialog({
  open,
  onClose,
  onSuccess,
  player,
}: PlayerWithdrawalDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(withdrawalSchema),
    defaultValues: {
      action: '',
      reason: '',
      notes: '',
    },
  });

  const selectedAction = watch('action');

  const onSubmit = async (data: WithdrawalFormData) => {
    if (!player) return;

    setLoading(true);
    setError(null);

    try {
      switch (data.action) {
        case 'withdraw':
          await commands.withdrawPlayer(player.id);
          break;
        case 'bye':
          await commands.requestPlayerBye(player.id);
          break;
        case 'reactivate':
          await commands.updatePlayerStatus(player.id, 'active');
          break;
      }

      onSuccess();
    } catch (_err) {
      setError(t('failedToUpdatePlayerStatus'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError(null);
      reset();
    }
  };

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'withdraw':
        return {
          title: t('withdrawPlayer'),
          description: t('withdrawPlayerDescription'),
          consequences: [
            t('playerRemovedFromPairings'),
            t('noFutureRounds'),
            t('currentResultsKept'),
            t('cannotReenter'),
          ],
          icon: <ExitToApp color="error" />,
          color: 'error' as const,
        };
      case 'bye':
        return {
          title: t('requestBye'),
          description: t('requestByeDescription'),
          consequences: [
            t('skipNextRound'),
            t('temporaryRemoval'),
            t('canReturnLater'),
            t('zeroPointsForRound'),
          ],
          icon: <Pause color="warning" />,
          color: 'warning' as const,
        };
      case 'reactivate':
        return {
          title: t('reactivatePlayer'),
          description: t('reactivatePlayerDescription'),
          consequences: [
            t('returnToActivePlayers'),
            t('includedInPairings'),
            t('previousResultsKept'),
          ],
          icon: <Person color="success" />,
          color: 'success' as const,
        };
      default:
        return null;
    }
  };

  const actionInfo = selectedAction
    ? getActionDescription(selectedAction)
    : null;
  const canReactivate =
    player && ['withdrawn', 'bye_requested'].includes(player.status);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth={false} fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person />
          {t('managePlayerStatus')}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {player && (
          <>
            {/* Player Info */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {player.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {player.rating && (
                    <Typography variant="body2" color="text.secondary">
                      {t('rating')}: {player.rating}
                    </Typography>
                  )}
                  {player.country_code && (
                    <Typography variant="body2" color="text.secondary">
                      {t('country.label')}:{' '}
                      {t(`country.${player.country_code}`, player.country_code)}
                    </Typography>
                  )}
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {t('currentStatus')}:{' '}
                  {t(`playerStatus.${player.status}`, player.status)}
                </Typography>
              </CardContent>
            </Card>

            {/* Action Selection */}
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <FormLabel component="legend">{t('selectAction')}</FormLabel>
                <Controller
                  name="action"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup {...field}>
                      <FormControlLabel
                        value="withdraw"
                        control={<Radio />}
                        label={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <ExitToApp fontSize="small" color="error" />
                            {t('withdrawFromTournament')}
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="bye"
                        control={<Radio />}
                        label={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Pause fontSize="small" color="warning" />
                            {t('requestByeNextRound')}
                          </Box>
                        }
                      />
                      {canReactivate && (
                        <FormControlLabel
                          value="reactivate"
                          control={<Radio />}
                          label={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Person fontSize="small" color="success" />
                              {t('reactivatePlayer')}
                            </Box>
                          }
                        />
                      )}
                    </RadioGroup>
                  )}
                />
                {errors.action && (
                  <Typography variant="caption" color="error">
                    {errors.action.message}
                  </Typography>
                )}
              </FormControl>

              {/* Action Info */}
              {actionInfo && (
                <Alert severity={actionInfo.color} sx={{ mb: 3 }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
                  >
                    {actionInfo.icon}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        {actionInfo.title}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {actionInfo.description}
                      </Typography>
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ mt: 1 }}
                      >
                        {t('consequences')}:
                      </Typography>
                      <List dense sx={{ mt: 0 }}>
                        {actionInfo.consequences.map(consequence => (
                          <ListItem key={consequence} sx={{ py: 0, pl: 0 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <Info fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>
                              <Typography variant="caption">
                                {consequence}
                              </Typography>
                            </ListItemText>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                </Alert>
              )}

              {/* Reason (required for withdrawal) */}
              {selectedAction === 'withdraw' && (
                <Controller
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('reasonForWithdrawal')}
                      multiline
                      rows={2}
                      error={!!errors.reason}
                      helperText={errors.reason?.message}
                      required
                      sx={{ mb: 2 }}
                      value={field.value || ''}
                    />
                  )}
                />
              )}

              {/* Optional Notes */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('additionalNotes')}
                    multiline
                    rows={2}
                    placeholder={t('optionalNotesPlaceholder')}
                    value={field.value || ''}
                  />
                )}
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={loading || !selectedAction}
          color={actionInfo?.color || 'primary'}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {actionInfo?.title || t('confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PlayerWithdrawalDialog;
