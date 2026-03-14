import type { Player } from '@dto/bindings';
import { commands } from '@dto/bindings';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function usePlayerManagement(
  players: Player[],
  onPlayersUpdated: () => void
) {
  const { t } = useTranslation();
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [lateEntryOpen, setLateEntryOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [ratingHistoryOpen, setRatingHistoryOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [managingPlayer, setManagingPlayer] = useState<Player | null>(null);
  const [ratingHistoryPlayer, setRatingHistoryPlayer] = useState<Player | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const filteredPlayers = players.filter(
    player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.country_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    playerId: number
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlayerId(playerId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPlayerId(null);
  };

  const handleEditPlayer = () => {
    const player = players.find(p => p.id === selectedPlayerId);
    if (player) {
      setEditingPlayer(player);
      setAddPlayerOpen(true);
    }
    handleMenuClose();
  };

  const handleDeletePlayer = async () => {
    if (!selectedPlayerId) return;

    setLoading(true);
    try {
      await commands.deletePlayer(selectedPlayerId);
      onPlayersUpdated();
      setError(null);
    } catch (_err) {
      setError(t('failedToDeletePlayer'));
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };

  const handleManagePlayerStatus = () => {
    const player = players.find(p => p.id === selectedPlayerId);
    if (player) {
      setManagingPlayer(player);
      setWithdrawalDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleViewRatingHistory = () => {
    const player = players.find(p => p.id === selectedPlayerId);
    if (player) {
      setRatingHistoryPlayer(player);
      setRatingHistoryOpen(true);
    }
    handleMenuClose();
  };

  const handleAddPlayerSuccess = () => {
    setAddPlayerOpen(false);
    setEditingPlayer(null);
    onPlayersUpdated();
    setError(null);
  };

  const handleBulkImportSuccess = () => {
    setBulkImportOpen(false);
    onPlayersUpdated();
    setError(null);
  };

  const clearError = () => setError(null);

  const closeAddPlayer = () => {
    setAddPlayerOpen(false);
    setEditingPlayer(null);
  };

  const closeWithdrawal = () => {
    setWithdrawalDialogOpen(false);
    setManagingPlayer(null);
  };

  const onWithdrawalSuccess = () => {
    setWithdrawalDialogOpen(false);
    setManagingPlayer(null);
    onPlayersUpdated();
  };

  const closeRatingHistory = () => {
    setRatingHistoryOpen(false);
    setRatingHistoryPlayer(null);
  };

  const onLateEntrySuccess = () => {
    setLateEntryOpen(false);
    onPlayersUpdated();
  };

  return {
    // State
    addPlayerOpen,
    bulkImportOpen,
    lateEntryOpen,
    withdrawalDialogOpen,
    ratingHistoryOpen,
    editingPlayer,
    managingPlayer,
    ratingHistoryPlayer,
    searchTerm,
    anchorEl,
    loading,
    error,
    tabValue,
    filteredPlayers,

    // Setters
    setAddPlayerOpen,
    setBulkImportOpen,
    setLateEntryOpen,
    setSearchTerm,
    clearError,

    // Actions
    handleTabChange,
    handleMenuClick,
    handleMenuClose,
    handleEditPlayer,
    handleDeletePlayer,
    handleManagePlayerStatus,
    handleViewRatingHistory,
    handleAddPlayerSuccess,
    handleBulkImportSuccess,
    closeAddPlayer,
    closeWithdrawal,
    onWithdrawalSuccess,
    closeRatingHistory,
    onLateEntrySuccess,
  };
}

export function getStatusColor(
  status: string
):
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning' {
  switch (status) {
    case 'active':
      return 'success';
    case 'withdrawn':
      return 'error';
    case 'bye_requested':
      return 'warning';
    case 'late_entry':
      return 'info';
    default:
      return 'default';
  }
}
