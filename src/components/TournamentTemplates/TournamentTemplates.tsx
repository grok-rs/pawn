import React, { useState, useEffect } from 'react';
import {
  Box,
  // Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid2 as Grid,
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
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Alert,
  // Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  // Save,
  Visibility,
  Public,
  Lock,
  // ContentCopy,
  Timer,
  EmojiEvents,
  Close,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Mock types for demonstration
interface TournamentTemplate {
  id: number;
  name: string;
  description?: string;
  tournament_type: string;
  time_type: string;
  default_rounds: number;
  time_control_template_id?: number;
  tiebreak_order: string[];
  forfeit_time_minutes: number;
  draw_offers_allowed: boolean;
  mobile_phone_policy: string;
  late_entry_allowed: boolean;
  is_public: boolean;
  created_by?: string;
  created_at: string;
}

interface TournamentTemplatesProps {
  onSelectTemplate?: (template: TournamentTemplate) => void;
  showSelection?: boolean;
}

const TOURNAMENT_TYPES = [
  {
    value: 'swiss',
    label: 'tournament.types.swiss',
    description: 'tournament.types.swiss.description',
  },
  {
    value: 'roundRobin',
    label: 'tournament.types.roundRobin',
    description: 'tournament.types.roundRobin.description',
  },
  {
    value: 'knockout',
    label: 'tournament.types.knockout',
    description: 'tournament.types.knockout.description',
  },
  {
    value: 'elimination',
    label: 'tournament.types.elimination',
    description: 'tournament.types.elimination.description',
  },
  {
    value: 'scheveningen',
    label: 'tournament.types.scheveningen',
    description: 'tournament.types.scheveningen.description',
  },
];

const TIME_TYPES = [
  { value: 'classical', label: 'tournament.types.classic' },
  { value: 'rapid', label: 'tournament.types.rapid' },
  { value: 'blitz', label: 'tournament.types.blitz' },
];

const MOBILE_PHONE_POLICIES = [
  { value: 'allowed', label: 'tournament.mobilePhone.allowed' },
  { value: 'silent_only', label: 'tournament.mobilePhone.silentOnly' },
  { value: 'prohibited', label: 'tournament.mobilePhone.prohibited' },
];

function TournamentTemplates({
  onSelectTemplate,
  showSelection = false,
}: TournamentTemplatesProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<TournamentTemplate[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TournamentTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tournament_type: 'swiss',
    time_type: 'rapid',
    default_rounds: 9,
    forfeit_time_minutes: 30,
    draw_offers_allowed: true,
    mobile_phone_policy: 'prohibited',
    late_entry_allowed: true,
    is_public: false,
  });

  // Mock data for demonstration
  useEffect(() => {
    setTemplates([
      {
        id: 1,
        name: 'FIDE Swiss Tournament',
        description: 'Standard FIDE-compliant Swiss tournament settings',
        tournament_type: 'swiss',
        time_type: 'classical',
        default_rounds: 9,
        tiebreak_order: [
          'buchholz_full',
          'buchholz_cut_1',
          'number_of_wins',
          'direct_encounter',
        ],
        forfeit_time_minutes: 30,
        draw_offers_allowed: true,
        mobile_phone_policy: 'prohibited',
        late_entry_allowed: false,
        is_public: true,
        created_by: 'System',
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Rapid Tournament',
        description: 'Fast-paced rapid tournament for quick games',
        tournament_type: 'swiss',
        time_type: 'rapid',
        default_rounds: 7,
        tiebreak_order: ['buchholz_full', 'direct_encounter', 'number_of_wins'],
        forfeit_time_minutes: 15,
        draw_offers_allowed: true,
        mobile_phone_policy: 'silent_only',
        late_entry_allowed: true,
        is_public: true,
        created_by: 'System',
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Knockout Championship',
        description: 'Single elimination knockout tournament',
        tournament_type: 'knockout',
        time_type: 'classical',
        default_rounds: 4,
        tiebreak_order: ['direct_encounter'],
        forfeit_time_minutes: 30,
        draw_offers_allowed: false,
        mobile_phone_policy: 'prohibited',
        late_entry_allowed: false,
        is_public: true,
        created_by: 'System',
        created_at: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleCreateTemplate = () => {
    const newTemplate: TournamentTemplate = {
      id: templates.length + 1,
      ...formData,
      tiebreak_order: ['buchholz_full', 'buchholz_cut_1', 'number_of_wins'],
      created_by: 'Current User',
      created_at: new Date().toISOString(),
    };

    setTemplates([...templates, newTemplate]);
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;

    const updatedTemplates = templates.map(template =>
      template.id === selectedTemplate.id
        ? { ...template, ...formData }
        : template
    );

    setTemplates(updatedTemplates);
    setEditDialogOpen(false);
    setSelectedTemplate(null);
    resetForm();
  };

  const handleDeleteTemplate = (templateId: number) => {
    setTemplates(templates.filter(template => template.id !== templateId));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tournament_type: 'swiss',
      time_type: 'rapid',
      default_rounds: 9,
      forfeit_time_minutes: 30,
      draw_offers_allowed: true,
      mobile_phone_policy: 'prohibited',
      late_entry_allowed: true,
      is_public: false,
    });
  };

  const openEditDialog = (template: TournamentTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      tournament_type: template.tournament_type,
      time_type: template.time_type,
      default_rounds: template.default_rounds,
      forfeit_time_minutes: template.forfeit_time_minutes,
      draw_offers_allowed: template.draw_offers_allowed,
      mobile_phone_policy: template.mobile_phone_policy,
      late_entry_allowed: template.late_entry_allowed,
      is_public: template.is_public,
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (template: TournamentTemplate) => {
    setSelectedTemplate(template);
    setViewDialogOpen(true);
  };

  const getTypeLabel = (
    type: string,
    types: Array<{ value: string; label: string; description?: string }>
  ) => {
    const typeObj = types.find(t => t.value === type);
    return typeObj ? t(typeObj.label) : type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
          flexDirection: { mobile: 'column', tablet: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {t('tournament.templates.title')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 600 }}
          >
            {t('tournament.templates.description')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            minWidth: 180,
            alignSelf: { mobile: 'stretch', tablet: 'flex-start' },
          }}
        >
          {t('tournament.templates.create')}
        </Button>
      </Box>

      {templates.length === 0 ? (
        <Alert severity="info">
          {t('tournament.templates.noTemplatesMessage')}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {templates.map(template => (
            <Grid
              size={{ mobile: 12, tablet: 6, desktop: 4 }}
              key={template.id}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                  },
                  border: '1px solid',
                  borderColor: 'divider',
                  minWidth: 0, // Prevent overflow
                  overflow: 'hidden',
                }}
              >
                <CardContent
                  sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden' }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        pr: 1,
                      }}
                      title={template.name}
                    >
                      {template.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {template.is_public ? (
                        <Tooltip title={t('tournament.templates.public')}>
                          <Public color="primary" fontSize="small" />
                        </Tooltip>
                      ) : (
                        <Tooltip title={t('tournament.templates.private')}>
                          <Lock color="action" fontSize="small" />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {template.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {template.description}
                    </Typography>
                  )}

                  <Box
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}
                  >
                    <Chip
                      icon={<EmojiEvents />}
                      label={getTypeLabel(
                        template.tournament_type,
                        TOURNAMENT_TYPES
                      )}
                      size="small"
                      color="primary"
                      variant="filled"
                    />
                    <Chip
                      icon={<Timer />}
                      label={getTypeLabel(template.time_type, TIME_TYPES)}
                      size="small"
                      color="secondary"
                      variant="filled"
                    />
                    <Chip
                      label={`${template.default_rounds} ${t('tournament.templates.rounds')}`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {t('tournament.templates.createdBy')}:{' '}
                    {template.created_by || t('common.unknown')} •{' '}
                    {formatDate(template.created_at)}
                  </Typography>
                </CardContent>
                <CardActions
                  sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}
                >
                  {showSelection && onSelectTemplate && (
                    <Button
                      size="small"
                      variant="contained"
                      fullWidth
                      onClick={() => onSelectTemplate(template)}
                      sx={{
                        minHeight: 36,
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t('tournament.templates.useTemplate')}
                    </Button>
                  )}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      width: '100%',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => openViewDialog(template)}
                      sx={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        fontSize: '0.75rem',
                        px: 1,
                      }}
                    >
                      {t('common.view')}
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => openEditDialog(template)}
                      sx={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        fontSize: '0.75rem',
                        px: 1,
                      }}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteTemplate(template.id)}
                      sx={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        fontSize: '0.75rem',
                        px: 1,
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          resetForm();
        }}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen
            ? t('tournament.templates.create')
            : t('tournament.templates.edit')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ mobile: 12 }}>
              <TextField
                fullWidth
                label={t('tournament.templates.name')}
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ mobile: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={t('tournament.templates.description')}
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6 }}>
              <FormControl fullWidth>
                <InputLabel>
                  {t('tournament.configuration.tournamentType')}
                </InputLabel>
                <Select
                  value={formData.tournament_type}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      tournament_type: e.target.value,
                    })
                  }
                  label={t('tournament.configuration.tournamentType')}
                >
                  {TOURNAMENT_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box>
                        <Typography>{t(type.label)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t(type.description)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('tournament.configuration.type')}</InputLabel>
                <Select
                  value={formData.time_type}
                  onChange={e =>
                    setFormData({ ...formData, time_type: e.target.value })
                  }
                  label={t('tournament.configuration.type')}
                >
                  {TIME_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {t(type.label)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6 }}>
              <TextField
                fullWidth
                type="number"
                label={t('tournament.configuration.numberOfRounds')}
                value={formData.default_rounds}
                onChange={e =>
                  setFormData({
                    ...formData,
                    default_rounds: Number(e.target.value),
                  })
                }
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6 }}>
              <TextField
                fullWidth
                type="number"
                label={t('tournament.configuration.forfeitTime')}
                value={formData.forfeit_time_minutes}
                onChange={e =>
                  setFormData({
                    ...formData,
                    forfeit_time_minutes: Number(e.target.value),
                  })
                }
                inputProps={{ min: 1, max: 120 }}
              />
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6 }}>
              <FormControl fullWidth>
                <InputLabel>
                  {t('tournament.configuration.mobilePhonePolicy')}
                </InputLabel>
                <Select
                  value={formData.mobile_phone_policy}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      mobile_phone_policy: e.target.value,
                    })
                  }
                  label={t('tournament.configuration.mobilePhonePolicy')}
                >
                  {MOBILE_PHONE_POLICIES.map(policy => (
                    <MenuItem key={policy.value} value={policy.value}>
                      {t(policy.label)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.draw_offers_allowed}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          draw_offers_allowed: e.target.checked,
                        })
                      }
                    />
                  }
                  label={t('tournament.configuration.drawOffersAllowed')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.late_entry_allowed}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          late_entry_allowed: e.target.checked,
                        })
                      }
                    />
                  }
                  label={t('tournament.configuration.lateEntryAllowed')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_public}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          is_public: e.target.checked,
                        })
                      }
                    />
                  }
                  label={t('tournament.templates.makePublic')}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              resetForm();
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={
              createDialogOpen ? handleCreateTemplate : handleUpdateTemplate
            }
            disabled={!formData.name.trim()}
            variant="contained"
          >
            {createDialogOpen ? t('common.create') : t('common.update')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Template Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {selectedTemplate?.name}
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              {selectedTemplate.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {selectedTemplate.description}
                </Typography>
              )}

              <List dense>
                <ListItem>
                  <ListItemText
                    primary={t('tournament.configuration.tournamentType')}
                    secondary={getTypeLabel(
                      selectedTemplate.tournament_type,
                      TOURNAMENT_TYPES
                    )}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={t('tournament.configuration.type')}
                    secondary={getTypeLabel(
                      selectedTemplate.time_type,
                      TIME_TYPES
                    )}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={t('tournament.configuration.numberOfRounds')}
                    secondary={selectedTemplate.default_rounds}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={t('tournament.configuration.forfeitTime')}
                    secondary={`${selectedTemplate.forfeit_time_minutes} ${t('tournament.timeUnits.minutes.short')}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={t('tournament.configuration.drawOffersAllowed')}
                    secondary={
                      selectedTemplate.draw_offers_allowed
                        ? t('common.yes')
                        : t('common.no')
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={t('tournament.configuration.lateEntryAllowed')}
                    secondary={
                      selectedTemplate.late_entry_allowed
                        ? t('common.yes')
                        : t('common.no')
                    }
                  />
                </ListItem>
              </List>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default TournamentTemplates;
