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

// Tiebreak information is now localized through translation keys

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

  const allTiebreakTypes: TiebreakType[] = [
    'buchholz_full',
    'buchholz_cut_1',
    'buchholz_cut_2',
    'buchholz_median',
    'sonneborn_berger',
    'progressive_score',
    'cumulative_score',
    'direct_encounter',
    'average_rating_of_opponents',
    'tournament_performance_rating',
    'number_of_wins',
    'number_of_games_with_black',
    'number_of_wins_with_black',
    'koya_system',
    'aroc_cut_1',
    'aroc_cut_2',
    'match_points',
    'game_points',
    'board_points',
  ];

  const availableTiebreaks = allTiebreakTypes.filter(
    tb => !tiebreaks.includes(tb)
  );

  const getTiebreakName = (tiebreak: TiebreakType): string => {
    return t(`tiebreaks.${tiebreak}.name`);
  };

  const getTiebreakDescription = (tiebreak: TiebreakType): string => {
    return t(`tiebreaks.${tiebreak}.description`);
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newTiebreaks = [...tiebreaks];
    const [removed] = newTiebreaks.splice(draggedIndex, 1);
    newTiebreaks.splice(dropIndex, 0, removed);
    onChange(newTiebreaks);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newTiebreaks = [...tiebreaks];
    [newTiebreaks[index - 1], newTiebreaks[index]] = [
      newTiebreaks[index],
      newTiebreaks[index - 1],
    ];
    onChange(newTiebreaks);
  };

  const handleMoveDown = (index: number) => {
    if (index === tiebreaks.length - 1) return;
    const newTiebreaks = [...tiebreaks];
    [newTiebreaks[index], newTiebreaks[index + 1]] = [
      newTiebreaks[index + 1],
      newTiebreaks[index],
    ];
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">{t('tiebreakOrder')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useFideDefaults}
                onChange={e => onFideDefaultsChange?.(e.target.checked)}
                size="small"
              />
            }
            label={t('useFideDefaults')}
          />
          <Button startIcon={<RestartAlt />} size="small" onClick={handleReset}>
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
                onDragEnter={handleDragEnter}
                onDrop={handleDrop(index)}
                onDragEnd={handleDragEnd}
                sx={{
                  cursor: 'move',
                  '&:hover': { bgcolor: 'action.hover' },
                  borderBottom: index < tiebreaks.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  opacity: draggedIndex === index ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                <ListItemIcon>
                  <DragIndicator />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={index + 1} size="small" color="primary" />
                      <Typography>{getTiebreakName(tiebreak)}</Typography>
                    </Box>
                  }
                  secondary={getTiebreakDescription(tiebreak)}
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
            {availableTiebreaks.map(tiebreak => (
              <ListItemButton
                key={tiebreak}
                onClick={() => handleAdd(tiebreak)}
                sx={{ '&:hover': { bgcolor: 'action.hover' } }}
              >
                <ListItemText
                  primary={getTiebreakName(tiebreak)}
                  secondary={getTiebreakDescription(tiebreak)}
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
