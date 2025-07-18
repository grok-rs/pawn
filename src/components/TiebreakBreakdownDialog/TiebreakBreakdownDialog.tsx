import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Close,
  Calculate,
  TrendingUp,
  TrendingDown,
  Remove,
  PersonOutline,
  StarsOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { TiebreakBreakdown } from '@dto/bindings';

interface TiebreakBreakdownDialogProps {
  open: boolean;
  onClose: () => void;
  breakdown: TiebreakBreakdown | null;
  playerName: string;
}

const TiebreakBreakdownDialog: React.FC<TiebreakBreakdownDialogProps> = ({
  open,
  onClose,
  breakdown,
  playerName,
}) => {
  const { t } = useTranslation();

  if (!breakdown) {
    return null;
  }

  const getResultIcon = (result: string | null) => {
    if (!result) return <Remove sx={{ fontSize: 16 }} />;

    switch (result) {
      case '1-0':
      case '0-1':
        return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
      case '1/2-1/2':
        return <Remove sx={{ fontSize: 16, color: 'warning.main' }} />;
      default:
        return <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />;
    }
  };

  const getResultLabel = (result: string | null) => {
    if (!result) return '-';

    switch (result) {
      case '1-0':
        return t('win');
      case '0-1':
        return t('loss');
      case '1/2-1/2':
        return t('draw');
      default:
        return result;
    }
  };

  const getTiebreakIcon = (tiebreakType: string) => {
    switch (tiebreakType) {
      case 'tournament_performance_rating':
        return <StarsOutlined />;
      case 'average_rating_of_opponents':
        return <PersonOutline />;
      default:
        return <Calculate />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            {getTiebreakIcon(breakdown.tiebreak_type)}
            <Box>
              <Typography variant="h6" component="div">
                {t(`tiebreaks.${breakdown.tiebreak_type}.name`)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('tiebreakBreakdownFor', { playerName })}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={breakdown.display_value}
              color="primary"
              variant="outlined"
              size="large"
              sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}
            />
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">{breakdown.explanation}</Typography>
          </Alert>
        </Box>

        {/* Calculation Steps */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Calculate fontSize="small" />
            {t('calculationSteps')}
          </Typography>

          <Stepper orientation="vertical" sx={{ pl: 2 }}>
            {breakdown.calculation_details.map((step, index) => (
              <Step
                key={index}
                active={true}
                completed={index < breakdown.calculation_details.length - 1}
              >
                <StepLabel
                  StepIconProps={{
                    sx: { fontSize: '1.2rem' },
                  }}
                >
                  <Typography variant="body1" fontWeight={500}>
                    {step.description}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Box sx={{ pl: 2, pb: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {step.calculation}
                    </Typography>
                    {step.intermediate_result !== breakdown.value && (
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{ mt: 0.5 }}
                      >
                        {t('intermediateResult')}:{' '}
                        {step.intermediate_result.toFixed(1)}
                      </Typography>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Opponents Involved */}
        {breakdown.opponents_involved.length > 0 && (
          <Box>
            <Typography
              variant="h6"
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PersonOutline fontSize="small" />
              {t('opponentsInvolved')} ({breakdown.opponents_involved.length})
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('opponent')}</TableCell>
                    <TableCell align="center">{t('rating')}</TableCell>
                    <TableCell align="center">{t('gameResult')}</TableCell>
                    <TableCell align="center">{t('contribution')}</TableCell>
                    <TableCell>{t('explanation')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breakdown.opponents_involved.map((opponent, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {opponent.opponent_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {opponent.opponent_rating ? (
                          <Chip
                            label={opponent.opponent_rating}
                            size="small"
                            variant="outlined"
                            color="default"
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            {t('unrated')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={getResultLabel(opponent.game_result)}>
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            gap={0.5}
                          >
                            {getResultIcon(opponent.game_result)}
                            <Typography variant="body2" sx={{ minWidth: 40 }}>
                              {opponent.game_result || '-'}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          color="primary"
                        >
                          {opponent.contribution_value.toFixed(1)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {opponent.explanation}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Final Result */}
        <Box
          sx={{
            textAlign: 'center',
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
          }}
        >
          <Typography variant="h6" color="primary">
            {t('finalResult')}: {breakdown.display_value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(`tiebreaks.${breakdown.tiebreak_type}.name`)}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TiebreakBreakdownDialog;
