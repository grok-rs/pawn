import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
} from '@mui/material';
import {
  EmojiEvents,
  LocationOn,
  CalendarToday,
  Person,
  Timer,
  ViewModule,
  Numbers,
  CompareArrows,
  Settings,
  Check,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { TournamentFormValues } from '../NewTournamentForm/types';

interface TournamentPreviewProps {
  formData: TournamentFormValues;
  timeControlTemplates?: Array<{ id: number; name: string; description?: string }>;
}

const TournamentPreview: React.FC<TournamentPreviewProps> = ({ 
  formData, 
  timeControlTemplates = [] 
}) => {
  const { t } = useTranslation();

  const selectedTimeControl = timeControlTemplates.find(
    template => template.id === formData.timeControlTemplate
  );

  const formatDate = (date: Date | null) => {
    if (!date) return t('form.placeholders.notSet');
    return date.toLocaleDateString();
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      rapid: t('tournament.types.rapid'),
      classical: t('tournament.types.classic'),
      blitz: t('tournament.types.blitz'),
    };
    return typeMap[type] || type;
  };

  const getPairingSystemLabel = (system: string) => {
    const systemMap: Record<string, string> = {
      swiss: t('tournament.types.swiss'),
      roundRobin: t('tournament.types.roundRobin'),
      knockout: t('tournament.types.knockout'),
      elimination: t('tournament.types.elimination'),
    };
    return systemMap[system] || system;
  };

  const getPolicyLabel = (policy: string, type: 'draw' | 'phone' | 'entry') => {
    const policyMaps = {
      draw: {
        allowed: t('tournament.drawOffers.allowed'),
        restricted: t('tournament.drawOffers.restricted'),
        prohibited: t('tournament.drawOffers.prohibited'),
      },
      phone: {
        allowed: t('tournament.mobilePhone.allowed'),
        silent_only: t('tournament.mobilePhone.silentOnly'),
        prohibited: t('tournament.mobilePhone.prohibited'),
      },
      entry: {
        allowed: t('tournament.lateEntry.allowed'),
        restricted: t('tournament.lateEntry.restricted'),
        prohibited: t('tournament.lateEntry.prohibited'),
      },
    };
    return policyMaps[type][policy as keyof typeof policyMaps[typeof type]] || policy;
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
        {t('form.preview.title')}
      </Typography>
      
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EmojiEvents color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  {t('form.sections.basicInformation')}
                </Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <EmojiEvents fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('tournament.configuration.name')}
                    secondary={formData.name || t('form.placeholders.notSet')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocationOn fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('tournament.configuration.location')}
                    secondary={`${formData.city || ''}, ${formData.country || ''}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('tournament.configuration.dates')}
                    secondary={`${formatDate(formData.startDate)} - ${formatDate(formData.endDate)}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Person fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('tournament.configuration.mainReferee')}
                    secondary={formData.mainReferee || t('form.placeholders.notSet')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Tournament Format */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ViewModule color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  {t('form.sections.tournamentFormat')}
                </Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Timer fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('tournament.configuration.type')}
                    secondary={
                      <Chip 
                        label={getTypeLabel(formData.type)} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <ViewModule fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('tournament.configuration.tournamentType')}
                    secondary={
                      <Chip 
                        label={getPairingSystemLabel(formData.pairingSystem)} 
                        size="small" 
                        color="secondary" 
                        variant="outlined" 
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Numbers fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('tournament.configuration.numberOfRounds')}
                    secondary={formData.rounds}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Timer fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('tournament.configuration.timeControlTemplate')}
                    secondary={selectedTimeControl?.name || t('form.placeholders.notSet')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Advanced Rules */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Settings color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  {t('form.sections.advancedRules')}
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('tournament.configuration.forfeitTime')}
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {formData.forfeitTimeMinutes} {t('tournament.timeUnits.minutes.short')}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('tournament.configuration.drawOffersPolicy')}
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {getPolicyLabel(formData.drawOffersPolicy, 'draw')}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('tournament.configuration.mobilePhonePolicy')}
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {getPolicyLabel(formData.mobilePhonePolicy, 'phone')}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('tournament.configuration.lateEntryPolicy')}
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {getPolicyLabel(formData.lateEntryPolicy, 'entry')}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {(formData.organizerName || formData.organizerEmail || formData.arbiterNotes) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    {formData.organizerName && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.configuration.organizerName')}
                        </Typography>
                        <Typography variant="body2">
                          {formData.organizerName}
                        </Typography>
                      </Grid>
                    )}
                    {formData.organizerEmail && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.configuration.organizerEmail')}
                        </Typography>
                        <Typography variant="body2">
                          {formData.organizerEmail}
                        </Typography>
                      </Grid>
                    )}
                    {formData.arbiterNotes && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.configuration.arbiterNotes')}
                        </Typography>
                        <Typography variant="body2">
                          {formData.arbiterNotes}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'primary.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Check color="primary" />
              <Typography variant="h6" fontWeight={600} color="primary">
                {t('form.preview.readyToCreate')}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t('form.preview.confirmMessage')}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TournamentPreview;