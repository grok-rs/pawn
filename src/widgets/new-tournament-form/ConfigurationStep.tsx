import type { TiebreakType, TimeControlTemplate } from '@dto/bindings';
import { commands } from '@dto/bindings';
import {
  CompareArrows,
  EmojiEvents,
  Gavel,
  Numbers,
  Person,
  PersonAdd,
  Phone,
  Schedule,
  Settings,
  Speed,
  Timer,
  ViewModule,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import CustomFormHelperText from '@shared/ui/FormHelperText';
import TimeInputWithUnits from '@shared/ui/TimeInputWithUnits';
import TiebreakConfig from '@widgets/standings-table/TiebreakConfig';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyledGrid } from './styled';
import type { TournamentFormValues } from './types';

const ConfigurationStep = () => {
  const { t } = useTranslation();
  const [tiebreaks, setTiebreaks] = useState<TiebreakType[]>([
    'buchholz_full',
    'buchholz_cut_1',
    'number_of_wins',
    'direct_encounter',
  ]);
  const [useFideDefaults, setUseFideDefaults] = useState(true);
  const [timeControlTemplates, setTimeControlTemplates] = useState<
    TimeControlTemplate[]
  >([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext<TournamentFormValues>();

  const timeUnitOptions = [
    { value: 'seconds', label: 'tournament.timeUnits.seconds.label' },
    { value: 'minutes', label: 'tournament.timeUnits.minutes.label' },
    { value: 'hours', label: 'tournament.timeUnits.hours.label' },
    { value: 'days', label: 'tournament.timeUnits.days.label' },
  ];

  const selectedPairingSystem = watch('pairingSystem');

  useEffect(() => {
    const loadTimeControlTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const templates = await commands.getTimeControlTemplates();
        setTimeControlTemplates(templates);
      } catch (_error) {
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTimeControlTemplates();
  }, []);

  return (
    <Box>
      <StyledGrid container spacing={3}>
        {/* Tournament Officials */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Person color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t('form.sections.tournamentOfficials')}
              </Typography>
            </Box>
            <TextField
              fullWidth
              label={t('tournament.configuration.mainReferee')}
              placeholder={t('form.placeholders.enterArbiterName')}
              {...register('mainReferee')}
              error={Boolean(errors.mainReferee)}
              helperText={
                <CustomFormHelperText errorMessage={errors.mainReferee} />
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>
        </StyledGrid>

        {/* Tournament Format */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EmojiEvents color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t('form.sections.tournamentFormat')}
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth error={Boolean(errors.type)}>
                  <InputLabel>{t('tournament.configuration.type')}</InputLabel>
                  <Select
                    defaultValue="rapid"
                    {...register('type', { required: true })}
                    label={t('tournament.configuration.type')}
                    startAdornment={
                      <InputAdornment position="start">
                        <Speed color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="rapid">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          width: '100%',
                        }}
                      >
                        <span>{t('tournament.types.rapid.label')}</span>
                        <Chip
                          label={t('tournament.types.rapid.timeRange')}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </MenuItem>
                    <MenuItem value="classical">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          width: '100%',
                        }}
                      >
                        <span>{t('tournament.types.classic')}</span>
                        <Chip
                          label={t('tournament.types.classical.timeRange')}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </MenuItem>
                    <MenuItem value="blitz">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          width: '100%',
                        }}
                      >
                        <span>{t('tournament.types.blitz.label')}</span>
                        <Chip
                          label={t('tournament.types.blitz.timeRange')}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </MenuItem>
                  </Select>
                  <CustomFormHelperText errorMessage={errors.type} />
                </FormControl>
              </StyledGrid>
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth error={Boolean(errors.pairingSystem)}>
                  <InputLabel>
                    {t('tournament.configuration.tournamentType')}
                  </InputLabel>
                  <Select
                    defaultValue="swiss"
                    {...register('pairingSystem', { required: true })}
                    label={t('tournament.configuration.tournamentType')}
                    startAdornment={
                      <InputAdornment position="start">
                        <ViewModule color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="swiss">
                      <Box>
                        <Typography>
                          {t('tournament.types.swiss.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.types.swiss.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="roundRobin">
                      <Box>
                        <Typography>
                          {t('tournament.types.roundRobin.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.types.roundRobin.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="knockout">
                      <Box>
                        <Typography>
                          {t('tournament.types.knockout.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.types.knockout.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="elimination">
                      <Box>
                        <Typography>
                          {t('tournament.types.elimination.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.types.elimination.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                  <CustomFormHelperText errorMessage={errors.pairingSystem} />
                </FormControl>
              </StyledGrid>
            </StyledGrid>
          </Paper>
        </StyledGrid>
        {/* Time Control Settings */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Timer color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t('form.sections.timeControlSettings')}
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <FormControl
                  fullWidth
                  error={Boolean(errors.timeControlTemplate)}
                >
                  <InputLabel>
                    {t('tournament.configuration.timeControlTemplate')}
                  </InputLabel>
                  <Select
                    {...register('timeControlTemplate')}
                    label={t('tournament.configuration.timeControlTemplate')}
                    disabled={loadingTemplates}
                    displayEmpty
                    startAdornment={
                      <InputAdornment position="start">
                        <Timer color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="">
                      <Typography
                        color="text.secondary"
                        sx={{ fontStyle: 'italic' }}
                      >
                        {loadingTemplates
                          ? 'Loading templates...'
                          : 'Select a time control template (optional)'}
                      </Typography>
                    </MenuItem>
                    {timeControlTemplates.map(template => (
                      <MenuItem key={template.id} value={template.id}>
                        <Box>
                          <Typography>{template.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.description ||
                              t(
                                `tournament.timeControl.${template.time_control_type}`
                              )}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <CustomFormHelperText
                    errorMessage={errors.timeControlTemplate}
                  />
                </FormControl>
              </StyledGrid>
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <TimeInputWithUnits
                  label={t('tournament.configuration.additionalTime')}
                  inputName="additionalTime"
                  unitName="additionalTimeUnit"
                  error={errors.additionalTime?.message}
                  defaultUnit="seconds"
                  unitOptions={timeUnitOptions}
                />
              </StyledGrid>
            </StyledGrid>
          </Paper>
        </StyledGrid>

        {/* Tournament Structure */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Numbers color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t('form.sections.tournamentStructure')}
              </Typography>
            </Box>
            <TextField
              fullWidth
              label={t('tournament.configuration.numberOfRounds')}
              type="number"
              {...register('rounds', { min: 1 })}
              error={Boolean(errors.rounds)}
              helperText={
                errors.rounds ? (
                  <CustomFormHelperText errorMessage={errors.rounds} />
                ) : selectedPairingSystem === 'swiss' ? (
                  t('form.helpers.swissRounds')
                ) : selectedPairingSystem === 'roundRobin' ? (
                  t('form.helpers.roundRobinRounds')
                ) : selectedPairingSystem === 'knockout' ||
                  selectedPairingSystem === 'elimination' ? (
                  t('form.helpers.knockoutRounds')
                ) : (
                  t('form.helpers.defaultRounds')
                )
              }
              slotProps={{
                input: {
                  inputProps: {
                    min: 1,
                    max: 99,
                  },
                  startAdornment: (
                    <InputAdornment position="start">
                      <Numbers color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Paper>
        </StyledGrid>

        {/* Tiebreak Settings */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CompareArrows color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t('tiebreakSettings')}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('tiebreakConfiguration')}
            </Typography>
            <TiebreakConfig
              tiebreaks={tiebreaks}
              onChange={setTiebreaks}
              useFideDefaults={useFideDefaults}
              onFideDefaultsChange={setUseFideDefaults}
            />
          </Paper>
        </StyledGrid>

        {/* Advanced Tournament Rules */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Settings color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t('form.sections.advancedRules.label')}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('form.sections.advancedRules.description')}
            </Typography>
            <StyledGrid container spacing={2}>
              {/* Forfeit Time */}
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={t('tournament.configuration.forfeitTime')}
                  type="number"
                  defaultValue={30}
                  {...register('forfeitTimeMinutes')}
                  error={Boolean(errors.forfeitTimeMinutes)}
                  helperText={
                    errors.forfeitTimeMinutes ? (
                      <CustomFormHelperText
                        errorMessage={errors.forfeitTimeMinutes}
                      />
                    ) : (
                      t('form.helpers.forfeitTime')
                    )
                  }
                  slotProps={{
                    input: {
                      inputProps: {
                        min: 1,
                        max: 120,
                      },
                      startAdornment: (
                        <InputAdornment position="start">
                          <Schedule color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          {t('tournament.timeUnits.minutes.short')}
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </StyledGrid>

              {/* Draw Offers Policy */}
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>
                    {t('tournament.configuration.drawOffersPolicy')}
                  </InputLabel>
                  <Select
                    defaultValue="allowed"
                    {...register('drawOffersPolicy')}
                    label={t('tournament.configuration.drawOffersPolicy')}
                    startAdornment={
                      <InputAdornment position="start">
                        <Gavel color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="allowed">
                      <Box>
                        <Typography>
                          {t('tournament.drawOffers.allowed.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.drawOffers.allowed.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="restricted">
                      <Box>
                        <Typography>
                          {t('tournament.drawOffers.restricted.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.drawOffers.restricted.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="prohibited">
                      <Box>
                        <Typography>
                          {t('tournament.drawOffers.prohibited.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.drawOffers.prohibited.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </StyledGrid>

              {/* Mobile Phone Policy */}
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>
                    {t('tournament.configuration.mobilePhonePolicy')}
                  </InputLabel>
                  <Select
                    defaultValue="prohibited"
                    {...register('mobilePhonePolicy')}
                    label={t('tournament.configuration.mobilePhonePolicy')}
                    startAdornment={
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="allowed">
                      <Box>
                        <Typography>
                          {t('tournament.mobilePhone.allowed.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.mobilePhone.allowed.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="silent_only">
                      <Box>
                        <Typography>
                          {t('tournament.mobilePhone.silentOnly.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.mobilePhone.silentOnly.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="prohibited">
                      <Box>
                        <Typography>
                          {t('tournament.mobilePhone.prohibited.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.mobilePhone.prohibited.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </StyledGrid>

              {/* Late Entry Policy */}
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>
                    {t('tournament.configuration.lateEntryPolicy')}
                  </InputLabel>
                  <Select
                    defaultValue="allowed"
                    {...register('lateEntryPolicy')}
                    label={t('tournament.configuration.lateEntryPolicy')}
                    startAdornment={
                      <InputAdornment position="start">
                        <PersonAdd color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="allowed">
                      <Box>
                        <Typography>
                          {t('tournament.lateEntry.allowed.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.lateEntry.allowed.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="restricted">
                      <Box>
                        <Typography>
                          {t('tournament.lateEntry.restricted.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.lateEntry.restricted.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="prohibited">
                      <Box>
                        <Typography>
                          {t('tournament.lateEntry.prohibited.label')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.lateEntry.prohibited.description')}
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </StyledGrid>

              {/* Organizer Information */}
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={t('tournament.configuration.organizerName')}
                  placeholder={t('form.placeholders.enterOrganizerName')}
                  {...register('organizerName')}
                  error={Boolean(errors.organizerName)}
                  helperText={
                    <CustomFormHelperText errorMessage={errors.organizerName} />
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </StyledGrid>

              <StyledGrid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={t('tournament.configuration.organizerEmail')}
                  placeholder={t('form.placeholders.enterOrganizerEmail')}
                  type="email"
                  {...register('organizerEmail')}
                  error={Boolean(errors.organizerEmail)}
                  helperText={
                    <CustomFormHelperText
                      errorMessage={errors.organizerEmail}
                    />
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">@</InputAdornment>
                    ),
                  }}
                />
              </StyledGrid>

              {/* Arbiter Notes */}
              <StyledGrid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t('tournament.configuration.arbiterNotes')}
                  placeholder={t('form.placeholders.enterArbiterNotes')}
                  {...register('arbiterNotes')}
                  error={Boolean(errors.arbiterNotes)}
                  helperText={
                    <CustomFormHelperText errorMessage={errors.arbiterNotes} />
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment
                        position="start"
                        sx={{ alignSelf: 'flex-start', mt: 1 }}
                      >
                        <Gavel color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </StyledGrid>
            </StyledGrid>
          </Paper>
        </StyledGrid>
      </StyledGrid>
    </Box>
  );
};

export default ConfigurationStep;
