import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid2 as Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
} from '@mui/material';
import { Save, Preview, RestartAlt } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { commands as _commands } from '@dto/bindings';

// Team tournament configuration interfaces
interface TeamTournamentConfig {
  id?: number;
  tournament_id: number;
  tournament_format: string; // 'swiss', 'round_robin', 'knockout', 'scheveningen'
  team_size: number;
  boards_per_team: number;
  allow_reserve_players: boolean;
  max_reserve_players: number;
  pairing_system: string; // 'dutch', 'accelerated', 'manual'
  scoring_system: string; // 'match_points', 'board_points', 'olympic', 'custom'
  match_points_win: number;
  match_points_draw: number;
  match_points_loss: number;
  board_weight_system: string; // 'equal', 'weighted', 'board_order'
  tiebreak_criteria: string[];
  allow_board_substitution: boolean;
  substitution_deadline: string; // 'before_round', 'before_match', 'anytime'
  default_result_unplayed: string; // 'forfeit', 'draw', 'zero'
  require_lineup_submission: boolean;
  lineup_submission_deadline: number; // minutes before round
  enable_live_ratings: boolean;
  performance_rating_calculation: boolean;
  team_captain_privileges: string[]; // 'lineup_changes', 'result_disputes', 'match_requests'
  automatic_board_assignment: boolean;
  rating_based_board_order: boolean;
  cross_table_format: string; // 'standard', 'detailed', 'compact'
  export_formats: string[];
  created_at?: string;
  updated_at?: string;
}

interface TeamTournamentConfigProps {
  tournamentId: number;
  initialConfig?: TeamTournamentConfig;
  onConfigChange?: (config: TeamTournamentConfig) => void;
  onSave?: (config: TeamTournamentConfig) => void;
}

const TOURNAMENT_FORMATS = [
  { value: 'swiss', label: 'Swiss System' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'knockout', label: 'Knockout' },
  { value: 'scheveningen', label: 'Scheveningen' },
];

const SCORING_SYSTEMS = [
  { value: 'match_points', label: 'Match Points' },
  { value: 'board_points', label: 'Board Points' },
  { value: 'olympic', label: 'Olympic System' },
  { value: 'custom', label: 'Custom Scoring' },
];

const TIEBREAK_OPTIONS = [
  { value: 'match_points', label: 'Match Points' },
  { value: 'board_points', label: 'Board Points' },
  { value: 'direct_encounter', label: 'Direct Encounter' },
  { value: 'buchholz', label: 'Buchholz' },
  { value: 'sonneborn_berger', label: 'Sonneborn-Berger' },
  { value: 'average_rating', label: 'Average Rating' },
  { value: 'performance_rating', label: 'Performance Rating' },
  { value: 'wins', label: 'Number of Wins' },
  { value: 'board_count', label: 'Board Count' },
];

const CAPTAIN_PRIVILEGES = [
  { value: 'lineup_changes', label: 'Lineup Changes' },
  { value: 'result_disputes', label: 'Result Disputes' },
  { value: 'match_requests', label: 'Match Requests' },
  { value: 'substitutions', label: 'Player Substitutions' },
];

const TeamTournamentConfigComponent: React.FC<TeamTournamentConfigProps> = ({
  tournamentId,
  initialConfig,
  onConfigChange,
  onSave,
}) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<TeamTournamentConfig>({
    tournament_id: tournamentId,
    tournament_format: 'swiss',
    team_size: 4,
    boards_per_team: 4,
    allow_reserve_players: true,
    max_reserve_players: 2,
    pairing_system: 'dutch',
    scoring_system: 'match_points',
    match_points_win: 2.0,
    match_points_draw: 1.0,
    match_points_loss: 0.0,
    board_weight_system: 'equal',
    tiebreak_criteria: ['match_points', 'board_points', 'direct_encounter'],
    allow_board_substitution: true,
    substitution_deadline: 'before_round',
    default_result_unplayed: 'forfeit',
    require_lineup_submission: false,
    lineup_submission_deadline: 30,
    enable_live_ratings: true,
    performance_rating_calculation: true,
    team_captain_privileges: ['lineup_changes', 'result_disputes'],
    automatic_board_assignment: true,
    rating_based_board_order: true,
    cross_table_format: 'standard',
    export_formats: ['pdf', 'csv', 'html'],
  });

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Load existing configuration
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  // Notify parent of changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config);
    }
  }, [config, onConfigChange]);

  const handleConfigChange = useCallback(
    (
      field: keyof TeamTournamentConfig,
      value: string | number | boolean | string[]
    ) => {
      setConfig(prev => ({ ...prev, [field]: value }));

      // Clear validation error for this field
      if (validationErrors[field]) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [validationErrors]
  );

  const handleTiebreakChange = (criteria: string[]) => {
    setConfig(prev => ({ ...prev, tiebreak_criteria: criteria }));
  };

  const handleCaptainPrivilegesChange = (privileges: string[]) => {
    setConfig(prev => ({ ...prev, team_captain_privileges: privileges }));
  };

  const validateConfig = (): boolean => {
    const errors: Record<string, string> = {};

    if (config.team_size < 1 || config.team_size > 10) {
      errors.team_size = 'Team size must be between 1 and 10';
    }

    if (
      config.boards_per_team < 1 ||
      config.boards_per_team > config.team_size
    ) {
      errors.boards_per_team =
        'Boards per team must be between 1 and team size';
    }

    if (config.allow_reserve_players && config.max_reserve_players < 0) {
      errors.max_reserve_players = 'Maximum reserve players cannot be negative';
    }

    if (
      config.match_points_win < 0 ||
      config.match_points_draw < 0 ||
      config.match_points_loss < 0
    ) {
      errors.match_points = 'Match points cannot be negative';
    }

    if (
      config.match_points_win <= config.match_points_draw ||
      config.match_points_draw <= config.match_points_loss
    ) {
      errors.match_points =
        'Win points must be greater than draw points, and draw points must be greater than loss points';
    }

    if (config.tiebreak_criteria.length === 0) {
      errors.tiebreak_criteria =
        'At least one tiebreak criterion must be selected';
    }

    if (
      config.require_lineup_submission &&
      config.lineup_submission_deadline < 0
    ) {
      errors.lineup_submission_deadline =
        'Lineup submission deadline cannot be negative';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: Use real API call once bindings are regenerated
      // const savedConfig = await commands.saveTeamTournamentSettings(config);

      if (onSave) {
        onSave(config);
      }

      setError(null);
    } catch (err) {
      console.error('Error saving team tournament configuration:', err);
      setError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (validateConfig()) {
      setPreviewDialogOpen(true);
    }
  };

  const handleReset = () => {
    setConfig({
      tournament_id: tournamentId,
      tournament_format: 'swiss',
      team_size: 4,
      boards_per_team: 4,
      allow_reserve_players: true,
      max_reserve_players: 2,
      pairing_system: 'dutch',
      scoring_system: 'match_points',
      match_points_win: 2.0,
      match_points_draw: 1.0,
      match_points_loss: 0.0,
      board_weight_system: 'equal',
      tiebreak_criteria: ['match_points', 'board_points', 'direct_encounter'],
      allow_board_substitution: true,
      substitution_deadline: 'before_round',
      default_result_unplayed: 'forfeit',
      require_lineup_submission: false,
      lineup_submission_deadline: 30,
      enable_live_ratings: true,
      performance_rating_calculation: true,
      team_captain_privileges: ['lineup_changes', 'result_disputes'],
      automatic_board_assignment: true,
      rating_based_board_order: true,
      cross_table_format: 'standard',
      export_formats: ['pdf', 'csv', 'html'],
    });
    setValidationErrors({});
    setActiveStep(0);
  };

  const steps = [
    {
      label: 'Basic Settings',
      content: (
        <Grid container spacing={3}>
          <Grid size={{ mobile: 12, tablet: 6 }}>
            <FormControl fullWidth error={!!validationErrors.tournament_format}>
              <InputLabel>Tournament Format</InputLabel>
              <Select
                value={config.tournament_format}
                onChange={e =>
                  handleConfigChange('tournament_format', e.target.value)
                }
                label="Tournament Format"
              >
                {TOURNAMENT_FORMATS.map(format => (
                  <MenuItem key={format.value} value={format.value}>
                    {format.label}
                  </MenuItem>
                ))}
              </Select>
              {validationErrors.tournament_format && (
                <FormHelperText>
                  {validationErrors.tournament_format}
                </FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid size={{ mobile: 12, tablet: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Team Size"
              value={config.team_size}
              onChange={e =>
                handleConfigChange('team_size', Number(e.target.value))
              }
              inputProps={{ min: 1, max: 10 }}
              error={!!validationErrors.team_size}
              helperText={
                validationErrors.team_size || 'Total number of players per team'
              }
            />
          </Grid>
          <Grid size={{ mobile: 12, tablet: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Boards per Team"
              value={config.boards_per_team}
              onChange={e =>
                handleConfigChange('boards_per_team', Number(e.target.value))
              }
              inputProps={{ min: 1, max: config.team_size }}
              error={!!validationErrors.boards_per_team}
              helperText={
                validationErrors.boards_per_team ||
                'Number of boards that play simultaneously'
              }
            />
          </Grid>
          <Grid size={{ mobile: 12, tablet: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.allow_reserve_players}
                  onChange={e =>
                    handleConfigChange(
                      'allow_reserve_players',
                      e.target.checked
                    )
                  }
                />
              }
              label="Allow Reserve Players"
            />
            {config.allow_reserve_players && (
              <TextField
                fullWidth
                type="number"
                label="Maximum Reserve Players"
                value={config.max_reserve_players}
                onChange={e =>
                  handleConfigChange(
                    'max_reserve_players',
                    Number(e.target.value)
                  )
                }
                inputProps={{ min: 0, max: 5 }}
                error={!!validationErrors.max_reserve_players}
                helperText={validationErrors.max_reserve_players}
                sx={{ mt: 2 }}
              />
            )}
          </Grid>
        </Grid>
      ),
    },
    {
      label: 'Scoring System',
      content: (
        <Grid container spacing={3}>
          <Grid size={{ mobile: 12 }}>
            <FormControl fullWidth>
              <InputLabel>Scoring System</InputLabel>
              <Select
                value={config.scoring_system}
                onChange={e =>
                  handleConfigChange('scoring_system', e.target.value)
                }
                label="Scoring System"
              >
                {SCORING_SYSTEMS.map(system => (
                  <MenuItem key={system.value} value={system.value}>
                    {system.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {config.scoring_system === 'match_points' && (
            <>
              <Grid size={{ mobile: 12, tablet: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Points for Win"
                  value={config.match_points_win}
                  onChange={e =>
                    handleConfigChange(
                      'match_points_win',
                      Number(e.target.value)
                    )
                  }
                  inputProps={{ min: 0, max: 10, step: 0.5 }}
                  error={!!validationErrors.match_points}
                />
              </Grid>
              <Grid size={{ mobile: 12, tablet: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Points for Draw"
                  value={config.match_points_draw}
                  onChange={e =>
                    handleConfigChange(
                      'match_points_draw',
                      Number(e.target.value)
                    )
                  }
                  inputProps={{ min: 0, max: 10, step: 0.5 }}
                  error={!!validationErrors.match_points}
                />
              </Grid>
              <Grid size={{ mobile: 12, tablet: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Points for Loss"
                  value={config.match_points_loss}
                  onChange={e =>
                    handleConfigChange(
                      'match_points_loss',
                      Number(e.target.value)
                    )
                  }
                  inputProps={{ min: 0, max: 10, step: 0.5 }}
                  error={!!validationErrors.match_points}
                  helperText={validationErrors.match_points}
                />
              </Grid>
            </>
          )}

          <Grid size={{ mobile: 12 }}>
            <Typography variant="h6" gutterBottom>
              Tiebreak Criteria
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select and order the tiebreak criteria (drag to reorder)
            </Typography>
            {TIEBREAK_OPTIONS.map(option => (
              <FormControlLabel
                key={option.value}
                control={
                  <Switch
                    checked={config.tiebreak_criteria.includes(option.value)}
                    onChange={e => {
                      const newCriteria = e.target.checked
                        ? [...config.tiebreak_criteria, option.value]
                        : config.tiebreak_criteria.filter(
                            c => c !== option.value
                          );
                      handleTiebreakChange(newCriteria);
                    }}
                  />
                }
                label={option.label}
              />
            ))}
            {validationErrors.tiebreak_criteria && (
              <FormHelperText error>
                {validationErrors.tiebreak_criteria}
              </FormHelperText>
            )}
          </Grid>
        </Grid>
      ),
    },
    {
      label: 'Team Management',
      content: (
        <Grid container spacing={3}>
          <Grid size={{ mobile: 12 }}>
            <Typography variant="h6" gutterBottom>
              Team Captain Privileges
            </Typography>
            {CAPTAIN_PRIVILEGES.map(privilege => (
              <FormControlLabel
                key={privilege.value}
                control={
                  <Switch
                    checked={config.team_captain_privileges.includes(
                      privilege.value
                    )}
                    onChange={e => {
                      const newPrivileges = e.target.checked
                        ? [...config.team_captain_privileges, privilege.value]
                        : config.team_captain_privileges.filter(
                            p => p !== privilege.value
                          );
                      handleCaptainPrivilegesChange(newPrivileges);
                    }}
                  />
                }
                label={privilege.label}
              />
            ))}
          </Grid>

          <Grid size={{ mobile: 12, tablet: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.allow_board_substitution}
                  onChange={e =>
                    handleConfigChange(
                      'allow_board_substitution',
                      e.target.checked
                    )
                  }
                />
              }
              label="Allow Board Substitution"
            />
          </Grid>

          <Grid size={{ mobile: 12, tablet: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.require_lineup_submission}
                  onChange={e =>
                    handleConfigChange(
                      'require_lineup_submission',
                      e.target.checked
                    )
                  }
                />
              }
              label="Require Lineup Submission"
            />
            {config.require_lineup_submission && (
              <TextField
                fullWidth
                type="number"
                label="Submission Deadline (minutes before round)"
                value={config.lineup_submission_deadline}
                onChange={e =>
                  handleConfigChange(
                    'lineup_submission_deadline',
                    Number(e.target.value)
                  )
                }
                inputProps={{ min: 0, max: 120 }}
                error={!!validationErrors.lineup_submission_deadline}
                helperText={validationErrors.lineup_submission_deadline}
                sx={{ mt: 2 }}
              />
            )}
          </Grid>

          <Grid size={{ mobile: 12, tablet: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.automatic_board_assignment}
                  onChange={e =>
                    handleConfigChange(
                      'automatic_board_assignment',
                      e.target.checked
                    )
                  }
                />
              }
              label="Automatic Board Assignment"
            />
          </Grid>

          <Grid size={{ mobile: 12, tablet: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.rating_based_board_order}
                  onChange={e =>
                    handleConfigChange(
                      'rating_based_board_order',
                      e.target.checked
                    )
                  }
                />
              }
              label="Rating-Based Board Order"
            />
          </Grid>
        </Grid>
      ),
    },
    {
      label: 'Advanced Settings',
      content: (
        <Grid container spacing={3}>
          <Grid size={{ mobile: 12, tablet: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enable_live_ratings}
                  onChange={e =>
                    handleConfigChange('enable_live_ratings', e.target.checked)
                  }
                />
              }
              label="Enable Live Ratings"
            />
          </Grid>

          <Grid size={{ mobile: 12, tablet: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.performance_rating_calculation}
                  onChange={e =>
                    handleConfigChange(
                      'performance_rating_calculation',
                      e.target.checked
                    )
                  }
                />
              }
              label="Performance Rating Calculation"
            />
          </Grid>

          <Grid size={{ mobile: 12 }}>
            <FormControl fullWidth>
              <InputLabel>Cross Table Format</InputLabel>
              <Select
                value={config.cross_table_format}
                onChange={e =>
                  handleConfigChange('cross_table_format', e.target.value)
                }
                label="Cross Table Format"
              >
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="detailed">Detailed</MenuItem>
                <MenuItem value="compact">Compact</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      ),
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          {t('tournament.teams.configuration')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RestartAlt />}
            onClick={handleReset}
          >
            {t('common.reset')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Preview />}
            onClick={handlePreview}
          >
            {t('common.preview')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : t('common.save')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                onClick={() => setActiveStep(index)}
                sx={{ cursor: 'pointer' }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Box sx={{ mt: 2, mb: 3 }}>{step.content}</Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(index + 1)}
                    disabled={index === steps.length - 1}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  {index > 0 && (
                    <Button onClick={() => setActiveStep(index - 1)}>
                      Back
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>{t('tournament.teams.configurationPreview')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={{ mobile: 12, tablet: 6 }}>
              <Typography variant="h6" gutterBottom>
                Basic Settings
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Tournament Format"
                    secondary={config.tournament_format}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Team Size"
                    secondary={config.team_size}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Boards per Team"
                    secondary={config.boards_per_team}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Reserve Players"
                    secondary={
                      config.allow_reserve_players
                        ? `Max ${config.max_reserve_players}`
                        : 'Not allowed'
                    }
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6 }}>
              <Typography variant="h6" gutterBottom>
                Scoring System
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Scoring System"
                    secondary={config.scoring_system}
                  />
                </ListItem>
                {config.scoring_system === 'match_points' && (
                  <>
                    <ListItem>
                      <ListItemText
                        primary="Win/Draw/Loss Points"
                        secondary={`${config.match_points_win}/${config.match_points_draw}/${config.match_points_loss}`}
                      />
                    </ListItem>
                  </>
                )}
                <ListItem>
                  <ListItemText
                    primary="Tiebreak Criteria"
                    secondary={config.tiebreak_criteria.join(', ')}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamTournamentConfigComponent;
