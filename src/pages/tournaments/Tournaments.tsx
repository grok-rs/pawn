import type { Tournament } from '@dto/bindings';
import { commands } from '@dto/bindings';
import { Add, EmojiEvents, Search } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  InputAdornment,
  Paper,
  Skeleton,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { APP_ROUTES } from '@shared/config/routes';
import BaseLayout from '@shared/layouts/BaseLayout';
import {
  groupTournamentsByStatus,
  isDraftTournament,
  isFinishedTournament,
  isOngoingTournament,
} from '@shared/lib/tournamentUtils';
import TournamentList from '@widgets/tournament-list/TournamentList';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type FilterStatus = 'all' | 'ongoing' | 'draft' | 'finished';

const TournamentsPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
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

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await commands.getTournaments();
      setTournaments(data);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const filteredTournaments = useMemo(() => {
    let filtered = tournaments;

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

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.location.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [filter, searchQuery, tournaments]);

  const grouped = useMemo(
    () => groupTournamentsByStatus(filteredTournaments),
    [filteredTournaments]
  );

  const handleDeleteClick = useCallback(
    (id: number) => {
      const tournament = tournaments.find(t => t.id === id);
      if (tournament) {
        setTournamentToDelete(tournament);
        setDeleteDialogOpen(true);
      }
    },
    [tournaments]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!tournamentToDelete) return;
    try {
      await commands.deleteTournament(tournamentToDelete.id);
      await fetchTournaments();
    } catch (_error) {}
    setDeleteDialogOpen(false);
    setTournamentToDelete(null);
  }, [tournamentToDelete, fetchTournaments]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setTournamentToDelete(null);
  }, []);

  const handlePopulateSampleTournaments = useCallback(async () => {
    setPopulatingTournaments(true);
    try {
      await commands.populateMockTournaments();
      await fetchTournaments();
    } catch (_error) {}
    setPopulatingTournaments(false);
  }, [fetchTournaments]);

  const handleNavigateToNewTournament = useCallback(() => {
    navigate(APP_ROUTES.NEW_TOURNAMENT);
  }, [navigate]);

  const filterPills: Array<{
    key: FilterStatus;
    label: string;
    count: number;
    color: 'primary' | 'success' | 'warning' | 'info';
  }> = [
    { key: 'all', label: t('all'), count: stats.total, color: 'primary' },
    {
      key: 'ongoing',
      label: t('ongoing'),
      count: stats.ongoing,
      color: 'success',
    },
    {
      key: 'draft',
      label: t('notStarted'),
      count: stats.draft,
      color: 'warning',
    },
    {
      key: 'finished',
      label: t('finished'),
      count: stats.finished,
      color: 'info',
    },
  ];

  const renderSectionHeader = (label: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3, mb: 1.5 }}>
      <Typography
        variant="overline"
        sx={{
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  );

  const hasResults = filteredTournaments.length > 0;
  const showGrouped = filter === 'all';

  return (
    <BaseLayout>
      <Box>
        {/* Page header */}
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
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleNavigateToNewTournament}
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

        {/* Search + Filter pills */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            flexWrap: 'wrap',
          }}
        >
          <TextField
            placeholder={t('searchTournaments')}
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            sx={{
              width: '280px',
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: '1.25rem' }} />
                </InputAdornment>
              ),
            }}
          />
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            {filterPills.map(pill => (
              <Chip
                key={pill.key}
                label={`${pill.label} ${pill.count}`}
                onClick={() => setFilter(pill.key)}
                color={filter === pill.key ? pill.color : 'default'}
                variant={filter === pill.key ? 'filled' : 'outlined'}
                clickable
              />
            ))}
          </Box>
        </Box>

        {/* Tournament sections */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['skeleton-1', 'skeleton-2', 'skeleton-3'].map(id => (
              <Skeleton key={id} variant="rounded" height={120} />
            ))}
          </Box>
        ) : hasResults ? (
          showGrouped ? (
            <>
              {grouped.ongoing.length > 0 && (
                <>
                  {renderSectionHeader(t('tournamentSections.activeNow'))}
                  <TournamentList
                    tournaments={grouped.ongoing}
                    onDelete={handleDeleteClick}
                    variant="featured"
                  />
                </>
              )}
              {grouped.draft.length > 0 && (
                <>
                  {renderSectionHeader(t('tournamentSections.draft'))}
                  <TournamentList
                    tournaments={grouped.draft}
                    onDelete={handleDeleteClick}
                    variant="compact"
                  />
                </>
              )}
              {grouped.finished.length > 0 && (
                <>
                  {renderSectionHeader(t('tournamentSections.completed'))}
                  <TournamentList
                    tournaments={grouped.finished}
                    onDelete={handleDeleteClick}
                    variant="compact"
                  />
                </>
              )}
            </>
          ) : (
            <TournamentList
              tournaments={filteredTournaments}
              onDelete={handleDeleteClick}
              variant={filter === 'ongoing' ? 'featured' : 'compact'}
            />
          )
        ) : (
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
                  onClick={handleNavigateToNewTournament}
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
