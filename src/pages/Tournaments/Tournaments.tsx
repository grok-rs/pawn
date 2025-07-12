import { useEffect, useState } from "react";
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
} from "@mui/material";
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  EmojiEvents,
  Schedule,
  CheckCircle,
  PlayArrow,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../../components/BaseLayout/BaseLayout";
import TournamentList from "../../components/TournamentList/TournamentList";
import {
  isDraftTournament,
  isFinishedTournament,
  isOngoingTournament,
} from "../../utils";
import { APP_ROUTES } from "../../constants/appRoutes";

import type { Tournament } from "../../dto/bindings";
import { commands } from "../../dto/bindings";

const TournamentsPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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
        console.error("Failed to fetch tournaments:", error);
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
      case "ongoing":
        filtered = filtered.filter(isOngoingTournament);
        break;
      case "draft":
        filtered = filtered.filter(isDraftTournament);
        break;
      case "finished":
        filtered = filtered.filter(isFinishedTournament);
        break;
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
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

  const StatCard = ({ title, value, icon, color }: any) => (
    <Card
      sx={{
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: color + '20',
              color: color,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <BaseLayout>
      <Box>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight={700}>
              Tournaments
            </Typography>
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
              New Tournament
            </Button>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3 }}>
              {loading ? (
                <Skeleton variant="rounded" height={100} />
              ) : (
                <StatCard
                  title="Total Tournaments"
                  value={stats.total}
                  icon={<EmojiEvents />}
                  color={theme.palette.primary.main}
                />
              )}
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3 }}>
              {loading ? (
                <Skeleton variant="rounded" height={100} />
              ) : (
                <StatCard
                  title="Ongoing"
                  value={stats.ongoing}
                  icon={<PlayArrow />}
                  color={theme.palette.success.main}
                />
              )}
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3 }}>
              {loading ? (
                <Skeleton variant="rounded" height={100} />
              ) : (
                <StatCard
                  title="Not Started"
                  value={stats.draft}
                  icon={<Schedule />}
                  color={theme.palette.warning.main}
                />
              )}
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3 }}>
              {loading ? (
                <Skeleton variant="rounded" height={100} />
              ) : (
                <StatCard
                  title="Finished"
                  value={stats.finished}
                  icon={<CheckCircle />}
                  color={theme.palette.info.main}
                />
              )}
            </Grid>
          </Grid>

          {/* Search and Filter Bar */}
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              backgroundColor: 'background.paper',
            }}
          >
            <TextField
              placeholder="Search tournaments..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label="All"
                onClick={() => setFilter('all')}
                color={filter === 'all' ? 'primary' : 'default'}
                variant={filter === 'all' ? 'filled' : 'outlined'}
              />
              <Chip
                label="Ongoing"
                onClick={() => setFilter('ongoing')}
                color={filter === 'ongoing' ? 'success' : 'default'}
                variant={filter === 'ongoing' ? 'filled' : 'outlined'}
              />
              <Chip
                label="Not Started"
                onClick={() => setFilter('draft')}
                color={filter === 'draft' ? 'warning' : 'default'}
                variant={filter === 'draft' ? 'filled' : 'outlined'}
              />
              <Chip
                label="Finished"
                onClick={() => setFilter('finished')}
                color={filter === 'finished' ? 'info' : 'default'}
                variant={filter === 'finished' ? 'filled' : 'outlined'}
              />
            </Box>
            <IconButton onClick={handleFilterClick}>
              <FilterList />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleFilterClose}
            >
              <MenuItem onClick={() => handleFilterSelect('all')}>All Status</MenuItem>
              <MenuItem onClick={() => handleFilterSelect('ongoing')}>Ongoing Only</MenuItem>
              <MenuItem onClick={() => handleFilterSelect('draft')}>Not Started Only</MenuItem>
              <MenuItem onClick={() => handleFilterSelect('finished')}>Finished Only</MenuItem>
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
          <TournamentList tournaments={filteredTournaments} />
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
            <EmojiEvents sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
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
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(APP_ROUTES.NEW_TOURNAMENT)}
              >
                Create Tournament
              </Button>
            )}
          </Paper>
        )}
      </Box>
    </BaseLayout>
  );
};

export default TournamentsPage;
