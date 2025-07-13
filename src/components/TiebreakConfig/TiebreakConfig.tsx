import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Button,
  ButtonGroup,
  Paper,
  Chip,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  ListItemButton,
} from '@mui/material';
import {
  DragIndicator,
  Delete,
  Add,
  ArrowUpward,
  ArrowDownward,
  RestartAlt,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { TiebreakType } from '../../dto/bindings';

interface TiebreakConfigProps {
  tiebreaks: TiebreakType[];
  onChange: (tiebreaks: TiebreakType[]) => void;
  useFideDefaults?: boolean;
  onFideDefaultsChange?: (use: boolean) => void;
}

const TIEBREAK_INFO: Record<TiebreakType, { name: string; description: string }> = {
  buchholz_full: {
    name: 'Buchholz',
    description: 'Sum of all opponents\' scores',
  },
  buchholz_cut_1: {
    name: 'Buchholz Cut-1',
    description: 'Sum of opponents\' scores excluding the lowest',
  },
  buchholz_cut_2: {
    name: 'Buchholz Cut-2',
    description: 'Sum of opponents\' scores excluding highest and lowest',
  },
  buchholz_median: {
    name: 'Median Buchholz',
    description: 'Median of opponents\' scores',
  },
  sonneborn_berger: {
    name: 'Sonneborn-Berger',
    description: 'Sum of defeated opponents\' scores + half of drawn opponents\' scores',
  },
  progressive_score: {
    name: 'Progressive Score',
    description: 'Cumulative score after each round',
  },
  cumulative_score: {
    name: 'Cumulative Score',
    description: 'Sum of scores up to each round',
  },
  direct_encounter: {
    name: 'Direct Encounter',
    description: 'Head-to-head result between tied players',
  },
  average_rating_of_opponents: {
    name: 'Average Rating of Opponents (ARO)',
    description: 'Average rating of all opponents',
  },
  tournament_performance_rating: {
    name: 'Tournament Performance Rating (TPR)',
    description: 'Performance rating based on results and opponents\' ratings',
  },
  number_of_wins: {
    name: 'Number of Wins',
    description: 'Total number of games won',
  },
  number_of_games_with_black: {
    name: 'Games with Black',
    description: 'Number of games played with black pieces',
  },
  number_of_wins_with_black: {
    name: 'Wins with Black',
    description: 'Number of games won with black pieces',
  },
  koya_system: {
    name: 'Koya System',
    description: 'Points against opponents who scored 50% or more',
  },
  aroc_cut_1: {
    name: 'AROC Cut-1',
    description: 'Average rating of opponents excluding the lowest',
  },
  aroc_cut_2: {
    name: 'AROC Cut-2',
    description: 'Average rating of opponents excluding highest and lowest',
  },
  match_points: {
    name: 'Match Points',
    description: 'Points from match results (team events)',
  },
  game_points: {
    name: 'Game Points',
    description: 'Points from individual games (team events)',
  },
  board_points: {
    name: 'Board Points',
    description: 'Points by board position (team events)',
  },
};

const FIDE_DEFAULT_TIEBREAKS: TiebreakType[] = [
  'buchholz_full',
  'buchholz_cut_1',
  'number_of_wins',
  'direct_encounter',
];

const TiebreakConfig: React.FC<TiebreakConfigProps> = ({
  tiebreaks,
  onChange,
  useFideDefaults = true,
  onFideDefaultsChange,
}) => {
  const { t } = useTranslation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const availableTiebreaks = Object.keys(TIEBREAK_INFO).filter(
    (tb) => !tiebreaks.includes(tb as TiebreakType)
  ) as TiebreakType[];

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newTiebreaks = [...tiebreaks];
    const [removed] = newTiebreaks.splice(draggedIndex, 1);
    newTiebreaks.splice(dropIndex, 0, removed);
    onChange(newTiebreaks);
    setDraggedIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newTiebreaks = [...tiebreaks];
    [newTiebreaks[index - 1], newTiebreaks[index]] = [newTiebreaks[index], newTiebreaks[index - 1]];
    onChange(newTiebreaks);
  };

  const handleMoveDown = (index: number) => {
    if (index === tiebreaks.length - 1) return;
    const newTiebreaks = [...tiebreaks];
    [newTiebreaks[index], newTiebreaks[index + 1]] = [newTiebreaks[index + 1], newTiebreaks[index]];
    onChange(newTiebreaks);
  };

  const handleRemove = (index: number) => {
    const newTiebreaks = tiebreaks.filter((_, i) => i !== index);
    onChange(newTiebreaks);
  };

  const handleAdd = (tiebreak: TiebreakType) => {
    onChange([...tiebreaks, tiebreak]);
    setAddDialogOpen(false);
  };

  const handleReset = () => {
    onChange(FIDE_DEFAULT_TIEBREAKS);
    if (onFideDefaultsChange) {
      onFideDefaultsChange(true);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{t('tiebreakOrder')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useFideDefaults}
                onChange={(e) => onFideDefaultsChange?.(e.target.checked)}
                size="small"
              />
            }
            label={t('useFideDefaults')}
          />
          <Button
            startIcon={<RestartAlt />}
            size="small"
            onClick={handleReset}
          >
            {t('resetToDefaults')}
          </Button>
        </Box>
      </Box>

      {tiebreaks.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('noTiebreaksConfigured')}
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <List>
            {tiebreaks.map((tiebreak, index) => (
              <ListItem
                key={`${tiebreak}-${index}`}
                draggable
                onDragStart={handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(index)}
                sx={{
                  cursor: 'move',
                  '&:hover': { bgcolor: 'action.hover' },
                  borderBottom: index < tiebreaks.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                }}
              >
                <ListItemIcon>
                  <DragIndicator />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={index + 1} size="small" color="primary" />
                      <Typography>{TIEBREAK_INFO[tiebreak].name}</Typography>
                    </Box>
                  }
                  secondary={TIEBREAK_INFO[tiebreak].description}
                />
                <ListItemSecondaryAction>
                  <ButtonGroup size="small">
                    <IconButton
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      size="small"
                    >
                      <ArrowUpward />
                    </IconButton>
                    <IconButton
                      onClick={() => handleMoveDown(index)}
                      disabled={index === tiebreaks.length - 1}
                      size="small"
                    >
                      <ArrowDownward />
                    </IconButton>
                    <IconButton
                      onClick={() => handleRemove(index)}
                      size="small"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </ButtonGroup>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Button
        variant="outlined"
        startIcon={<Add />}
        onClick={() => setAddDialogOpen(true)}
        disabled={availableTiebreaks.length === 0}
      >
        {t('addTiebreak')}
      </Button>

      {/* Add Tiebreak Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        fullWidth
      >
        <DialogTitle>{t('selectTiebreak')}</DialogTitle>
        <DialogContent>
          <List>
            {availableTiebreaks.map((tiebreak) => (
              <ListItemButton
                key={tiebreak}
                onClick={() => handleAdd(tiebreak)}
                sx={{ '&:hover': { bgcolor: 'action.hover' } }}
              >
                <ListItemText
                  primary={TIEBREAK_INFO[tiebreak].name}
                  secondary={TIEBREAK_INFO[tiebreak].description}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{t('cancel')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TiebreakConfig;