import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Alert,
  TextField,
  Grid2 as Grid,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  Category,
  Person,
  Groups,
  EmojiEvents,
  Flag,
} from '@mui/icons-material';
import { commands } from '../../dto/bindings';
import type { 
  PlayerCategory, 
  CreatePlayerCategory, 
  Player, 
  PlayerCategoryAssignment,
  AssignPlayerToCategory 
} from '../../dto/bindings';

interface PlayerCategoryManagementProps {
  tournamentId: number;
  players: Player[];
  onCategoriesUpdated: () => void;
}

const categorySchema = yup.object({
  name: yup.string().required('Category name is required'),
  description: yup.string().nullable(),
  min_rating: yup.number().nullable().min(0, 'Minimum rating must be positive'),
  max_rating: yup.number().nullable().min(0, 'Maximum rating must be positive'),
  min_age: yup.number().nullable().min(0, 'Minimum age must be positive'),
  max_age: yup.number().nullable().min(0, 'Maximum age must be positive'),
  gender_restriction: yup.string().nullable().oneOf(['M', 'F', '', null], 'Invalid gender restriction'),
});

type CategoryFormData = yup.InferType<typeof categorySchema>;

const PlayerCategoryManagement: React.FC<PlayerCategoryManagementProps> = ({
  tournamentId,
  players,
  onCategoriesUpdated,
}) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<PlayerCategory[]>([]);
  const [assignments, setAssignments] = useState<Map<number, PlayerCategoryAssignment[]>>(new Map());
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PlayerCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      min_rating: null,
      max_rating: null,
      min_age: null,
      max_age: null,
      gender_restriction: '',
    },
  });

  useEffect(() => {
    fetchCategories();
  }, [tournamentId]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const categoriesData = await commands.getTournamentCategories(tournamentId);
      setCategories(categoriesData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError(t('failedToLoadCategories'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    console.log('Create category button clicked');
    setEditingCategory(null);
    reset({
      name: '',
      description: '',
      min_rating: null,
      max_rating: null,
      min_age: null,
      max_age: null,
      gender_restriction: '',
    });
    setCategoryFormOpen(true);
  };

  const handleEditCategory = (category: PlayerCategory) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      min_rating: category.min_rating,
      max_rating: category.max_rating,
      min_age: category.min_age,
      max_age: category.max_age,
      gender_restriction: category.gender_restriction || '',
    });
    setCategoryFormOpen(true);
  };

  const onSubmitCategory = async (data: CategoryFormData) => {
    console.log('Form submitted with data:', data);
    setLoading(true);
    try {
      const categoryData: CreatePlayerCategory = {
        tournament_id: tournamentId,
        name: data.name,
        description: data.description || null,
        min_rating: data.min_rating,
        max_rating: data.max_rating,
        min_age: data.min_age,
        max_age: data.max_age,
        gender_restriction: data.gender_restriction && data.gender_restriction !== '' ? data.gender_restriction : null,
      };

      console.log('Creating category with data:', categoryData);

      if (editingCategory) {
        // Update existing category (would need update command)
        console.log('Update category not implemented yet');
      } else {
        const result = await commands.createPlayerCategory(categoryData);
        console.log('Category created successfully:', result);
      }

      setCategoryFormOpen(false);
      fetchCategories();
      onCategoriesUpdated();
      setError(null);
    } catch (err) {
      console.error('Failed to save category:', err);
      setError(t('failedToSaveCategory'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm(t('confirmDeleteCategory'))) {
      return;
    }
    
    setLoading(true);
    try {
      await commands.deletePlayerCategory(categoryId);
      fetchCategories();
      onCategoriesUpdated();
      setError(null);
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError(t('failedToDeleteCategory'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlayer = async (playerId: number, categoryId: number) => {
    try {
      const assignmentData: AssignPlayerToCategory = {
        player_id: playerId,
        category_id: categoryId,
      };
      await commands.assignPlayerToCategory(assignmentData);
      fetchCategories(); // Refresh to get updated assignments
      setError(null);
    } catch (err) {
      console.error('Failed to assign player to category:', err);
      setError(t('failedToAssignPlayer'));
    }
  };

  const getEligiblePlayers = (category: PlayerCategory): Player[] => {
    return players.filter(player => {
      // Check rating range
      if (category.min_rating && player.rating && player.rating < category.min_rating) {
        return false;
      }
      if (category.max_rating && player.rating && player.rating > category.max_rating) {
        return false;
      }

      // Check gender restriction
      if (category.gender_restriction && player.gender !== category.gender_restriction) {
        return false;
      }

      // Check age range (would need birth_date calculation)
      if (category.min_age || category.max_age) {
        if (!player.birth_date) return false;
        const age = new Date().getFullYear() - new Date(player.birth_date).getFullYear();
        if (category.min_age && age < category.min_age) return false;
        if (category.max_age && age > category.max_age) return false;
      }

      return true;
    });
  };

  const formatCategoryRules = (category: PlayerCategory): string[] => {
    const rules: string[] = [];
    
    if (category.min_rating || category.max_rating) {
      if (category.min_rating && category.max_rating) {
        rules.push(`Rating: ${category.min_rating}-${category.max_rating}`);
      } else if (category.min_rating) {
        rules.push(`Rating: ${category.min_rating}+`);
      } else if (category.max_rating) {
        rules.push(`Rating: <${category.max_rating}`);
      }
    }

    if (category.min_age || category.max_age) {
      if (category.min_age && category.max_age) {
        rules.push(`Age: ${category.min_age}-${category.max_age}`);
      } else if (category.min_age) {
        rules.push(`Age: ${category.min_age}+`);
      } else if (category.max_age) {
        rules.push(`Age: <${category.max_age}`);
      }
    }

    if (category.gender_restriction) {
      rules.push(`${t('gender')}: ${t(`gender.${category.gender_restriction}`)}`);
    }

    return rules;
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2" color="text.primary" sx={{ fontWeight: 600 }}>
          {t('playerCategories')} ({categories.length} {t('categories')})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateCategory}
        >
          {t('createCategory')}
        </Button>
      </Box>

      {/* Categories List */}
      {categories.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Category sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('noCategoriesCreated')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('createCategoriesDescription')}
          </Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={handleCreateCategory}>
            {t('createFirstCategory')}
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {categories.map((category) => {
            const eligiblePlayers = getEligiblePlayers(category);
            const rules = formatCategoryRules(category);
            
            return (
              <Card key={category.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" component="h3">
                        {category.name}
                      </Typography>
                      {category.description && (
                        <Typography variant="body2" color="text.secondary">
                          {category.description}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" onClick={() => handleEditCategory(category)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteCategory(category.id)}>
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Category Rules */}
                  {rules.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('eligibilityRules')}:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {rules.map((rule, index) => (
                          <Chip key={index} label={rule} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Eligible Players */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Groups />
                        <Typography variant="subtitle2">
                          {t('eligiblePlayers')} ({eligiblePlayers.length})
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {eligiblePlayers.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {t('noEligiblePlayers')}
                        </Typography>
                      ) : (
                        <List dense>
                          {eligiblePlayers.map((player) => (
                            <ListItem key={player.id}>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Person fontSize="small" />
                                    <Typography variant="body2">{player.name}</Typography>
                                    {player.title && (
                                      <Chip label={t(`title.${player.title}`, player.title)} size="small" color="secondary" />
                                    )}
                                    {player.rating && (
                                      <Chip label={player.rating} size="small" color="primary" variant="outlined" />
                                    )}
                                    {player.country_code && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Flag fontSize="small" />
                                        <Typography variant="caption">{t(`country.${player.country_code}`, player.country_code)}</Typography>
                                      </Box>
                                    )}
                                  </Box>
                                }
                              />
                              <ListItemSecondaryAction>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleAssignPlayer(player.id, category.id)}
                                >
                                  {t('assign')}
                                </Button>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Category Form Dialog */}
      <Dialog open={categoryFormOpen} onClose={() => setCategoryFormOpen(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleSubmit(onSubmitCategory)}>
          <DialogTitle>
            {editingCategory ? t('editCategory') : t('createNewCategory')}
          </DialogTitle>
          <DialogContent dividers>
            {Object.keys(errors).length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Validation errors: {JSON.stringify(errors)}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid size={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('categoryName')}
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      required
                    />
                  )}
                />
              </Grid>

              <Grid size={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('description')}
                      multiline
                      rows={2}
                      value={field.value || ''}
                    />
                  )}
                />
              </Grid>

              <Grid size={6}>
                <Controller
                  name="min_rating"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('minimumRating')}
                      type="number"
                      error={!!errors.min_rating}
                      helperText={errors.min_rating?.message}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  )}
                />
              </Grid>

              <Grid size={6}>
                <Controller
                  name="max_rating"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('maximumRating')}
                      type="number"
                      error={!!errors.max_rating}
                      helperText={errors.max_rating?.message}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  )}
                />
              </Grid>

              <Grid size={6}>
                <Controller
                  name="min_age"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('minimumAge')}
                      type="number"
                      error={!!errors.min_age}
                      helperText={errors.min_age?.message}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  )}
                />
              </Grid>

              <Grid size={6}>
                <Controller
                  name="max_age"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('maximumAge')}
                      type="number"
                      error={!!errors.max_age}
                      helperText={errors.max_age?.message}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  )}
                />
              </Grid>

              <Grid size={12}>
                <Controller
                  name="gender_restriction"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label={t('genderRestriction')}
                      value={field.value || ''}
                    >
                      <MenuItem value="">{t('noRestriction')}</MenuItem>
                      <MenuItem value="M">{t('maleOnly')}</MenuItem>
                      <MenuItem value="F">{t('femaleOnly')}</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => setCategoryFormOpen(false)} disabled={loading}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || isSubmitting}
            >
              {loading || isSubmitting ? 'Creating...' : (editingCategory ? t('updateCategory') : t('createCategory'))}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default PlayerCategoryManagement;