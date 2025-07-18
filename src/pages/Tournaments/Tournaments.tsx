import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Grid2 as Grid,
  useTheme,
  Paper,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  EmojiEvents,
  Schedule,
  CheckCircle,
  PlayArrow,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BaseLayout from '../../components/BaseLayout/BaseLayout';
import TournamentList from '../../components/TournamentList/TournamentList';
import {
  isDraftTournament,
  isFinishedTournament,
  isOngoingTournament,
} from '../../utils';
import { APP_ROUTES } from '../../constants/appRoutes';

import type { Tournament } from '../../dto/bindings';
import { commands } from '../../dto/bindings';

const TournamentsPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>(
    []
  );
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] =
    useState<Tournament | null>(null);
  const [populatingTournaments, setPopulatingTournaments] = useState(false);

  const stats = {
    total: tournaments.length,
    ongoing: tournaments.filter(isOngoingTournament).length,
    draft: tournaments.filter(isDraftTournament).length,
    finished: tournaments.filter(isFinishedTournament).length,
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await commands.getTournaments();
        setTournaments(data);
        setFilteredTournaments(data);
      } catch (error) {
        console.error('Failed to fetch tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  useEffect(() => {
    let filtered = tournaments;

    // Apply status filter
    switch (filter) {
      case 'ongoing':
        filtered = filtered.filter(isOngoingTournament);
        break;
      case 'draft':
        filtered = filtered.filter(isDraftTournament);
        break;
      case 'finished':
        filtered = filtered.filter(isFinishedTournament);
        break;
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTournaments(filtered);
  }, [filter, searchQuery, tournaments]);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleFilterSelect = (newFilter: string) => {
    setFilter(newFilter);
    handleFilterClose();
  };

  const handleDeleteClick = (id: number) => {
    const tournament = tournaments.find(t => t.id === id);
    if (tournament) {
      setTournamentToDelete(tournament);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!tournamentToDelete) return;

    try {
      await commands.deleteTournament(tournamentToDelete.id);
      // Refresh the tournaments list
      const data = await commands.getTournaments();
      setTournaments(data);
      setFilteredTournaments(data);
    } catch (error) {
      console.error('Failed to delete tournament:', error);
    }
    setDeleteDialogOpen(false);
    setTournamentToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTournamentToDelete(null);
  };

  const handlePopulateSampleTournaments = async () => {
    setPopulatingTournaments(true);
    try {
      await commands.populateMockTournaments();
      // Refresh the tournaments list
      const data = await commands.getTournaments();
      setTournaments(data);
      setFilteredTournaments(data);
    } catch (error) {
      console.error('Failed to populate sample tournaments:', error);
    }
    setPopulatingTournaments(false);
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <Card
      sx={{
        transition: 'all 0.3s ease',
        height: '100%',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent
        sx={{
          p: { mobile: 2, tablet: 3 },
          height: '100%',
          display: 'flex',
          flexDirection: { mobile: 'row', tablet: 'column' },
          alignItems: { mobile: 'center', tablet: 'flex-start' },
          gap: { mobile: 2, tablet: 1.5 },
        }}
      >
        <Box
          sx={{
            p: { mobile: 1.5, tablet: 2 },
            borderRadius: 2,
            backgroundColor: color + '20',
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: { mobile: 'auto', tablet: '56px' },
            minHeight: { mobile: 'auto', tablet: '56px' },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, textAlign: { mobile: 'left', tablet: 'left' } }}>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              fontSize: { mobile: '1.75rem', tablet: '2rem', laptop: '2.5rem' },
              mb: 0.5,
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: { mobile: '0.875rem', tablet: '1rem' },
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <BaseLayout>
      <Box>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ color: theme.palette.text.primary }}
            >
              {t('tournaments')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(APP_ROUTES.NEW_TOURNAMENT)}
                sx={{
                  backgroundColor: theme.palette.secondary.main,
                  color: theme.palette.secondary.contrastText,
                  '&:hover': {
                    backgroundColor: theme.palette.secondary.dark,
                  },
                }}
              >
                {t('newTournament')}
              </Button>
            </Box>
          </Box>

          {/* Stats Cards - Optimized for Tablet Layout */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3, desktop: 3 }}>
              {loading ? (
                <Skeleton variant="rounded" height={120} />
              ) : (
                <StatCard
                  title={t('totalTournaments')}
                  value={stats.total}
                  icon={<EmojiEvents />}
                  color={theme.palette.primary.main}
                />
              )}
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3, desktop: 3 }}>
              {loading ? (
                <Skeleton variant="rounded" height={120} />
              ) : (
                <StatCard
                  title={t('ongoing')}
                  value={stats.ongoing}
                  icon={<PlayArrow />}
                  color={theme.palette.success.main}
                />
              )}
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3, desktop: 3 }}>
              {loading ? (
                <Skeleton variant="rounded" height={120} />
              ) : (
                <StatCard
                  title={t('notStarted')}
                  value={stats.draft}
                  icon={<Schedule />}
                  color={theme.palette.warning.main}
                />
              )}
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3, desktop: 3 }}>
              {loading ? (
                <Skeleton variant="rounded" height={120} />
              ) : (
                <StatCard
                  title={t('finished')}
                  value={stats.finished}
                  icon={<CheckCircle />}
                  color={theme.palette.info.main}
                />
              )}
            </Grid>
          </Grid>

          {/* Search and Filter Bar - Enhanced for Tablet */}
          <Paper
            sx={{
              p: { mobile: 2, tablet: 3 },
              display: 'flex',
              flexDirection: { mobile: 'column', tablet: 'row' },
              gap: { mobile: 2, tablet: 3 },
              alignItems: { mobile: 'stretch', tablet: 'center' },
              backgroundColor: 'background.paper',
            }}
          >
            <TextField
              placeholder={t('searchTournaments')}
              variant="outlined"
              size="medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{
                flex: 1,
                minWidth: { tablet: '300px' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Box
              sx={{
                display: 'flex',
                gap: { mobile: 1, tablet: 1.5 },
                flexWrap: 'wrap',
                justifyContent: { mobile: 'center', tablet: 'flex-start' },
              }}
            >
              <Chip
                label={t('all')}
                onClick={() => setFilter('all')}
                color={filter === 'all' ? 'primary' : 'default'}
                variant={filter === 'all' ? 'filled' : 'outlined'}
                clickable
              />
              <Chip
                label={t('ongoing')}
                onClick={() => setFilter('ongoing')}
                color={filter === 'ongoing' ? 'success' : 'default'}
                variant={filter === 'ongoing' ? 'filled' : 'outlined'}
                clickable
              />
              <Chip
                label={t('notStarted')}
                onClick={() => setFilter('draft')}
                color={filter === 'draft' ? 'warning' : 'default'}
                variant={filter === 'draft' ? 'filled' : 'outlined'}
                clickable
              />
              <Chip
                label={t('finished')}
                onClick={() => setFilter('finished')}
                color={filter === 'finished' ? 'info' : 'default'}
                variant={filter === 'finished' ? 'filled' : 'outlined'}
                clickable
              />
            </Box>
            <IconButton
              onClick={handleFilterClick}
              sx={{
                minHeight: '44px',
                minWidth: '44px',
                alignSelf: { mobile: 'center', tablet: 'auto' },
              }}
            >
              <FilterList />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleFilterClose}
            >
              <MenuItem onClick={() => handleFilterSelect('all')}>
                {t('all')}
              </MenuItem>
              <MenuItem onClick={() => handleFilterSelect('ongoing')}>
                {t('ongoing')}
              </MenuItem>
              <MenuItem onClick={() => handleFilterSelect('draft')}>
                {t('notStarted')}
              </MenuItem>
              <MenuItem onClick={() => handleFilterSelect('finished')}>
                {t('finished')}
              </MenuItem>
            </Menu>
          </Paper>
        </Box>

        {/* Tournament List */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </Box>
        ) : (
          <TournamentList
            tournaments={filteredTournaments}
            onDelete={handleDeleteClick}
          />
        )}

        {/* Empty State */}
        {!loading && filteredTournaments.length === 0 && (
          <Paper
            sx={{
              p: 8,
              textAlign: 'center',
              backgroundColor: 'background.paper',
            }}
          >
            <EmojiEvents
              sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              No tournaments found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchQuery
                ? `No tournaments match "${searchQuery}"`
                : filter !== 'all'
                  ? `No ${filter} tournaments`
                  : 'Get started by creating your first tournament'}
            </Typography>
            {filter === 'all' && !searchQuery && (
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate(APP_ROUTES.NEW_TOURNAMENT)}
                >
                  Create Tournament
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EmojiEvents />}
                  onClick={handlePopulateSampleTournaments}
                  disabled={populatingTournaments}
                >
                  {populatingTournaments
                    ? 'Adding Sample Tournaments...'
                    : 'Add Sample Tournaments'}
                </Button>
              </Box>
            )}
          </Paper>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          {t('confirmDeleteTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {t('confirmDeleteMessage')} "{tournamentToDelete?.name}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </BaseLayout>
  );
};

export default TournamentsPage;
