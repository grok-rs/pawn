import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Alert,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  SwapHoriz,
  Person,
  PersonOff,
  Cancel,
  CheckCircle,
} from '@mui/icons-material';
import type { Pairing, Player } from '../../dto/bindings';

interface PairingsDisplayProps {
  open: boolean;
  pairings: Pairing[];
  roundNumber: number;
  onClose: () => void;
  onConfirm: (pairings: Pairing[]) => void;
  loading?: boolean;
}

const PairingsDisplay: React.FC<PairingsDisplayProps> = ({
  open,
  pairings,
  roundNumber,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [editedPairings, setEditedPairings] = useState<Pairing[]>(pairings);

  const handleSwapColors = (index: number) => {
    const newPairings = [...editedPairings];
    const pairing = newPairings[index];
    
    if (pairing.black_player) {
      // Swap white and black players
      const temp = pairing.white_player;
      pairing.white_player = pairing.black_player;
      pairing.black_player = temp;
      setEditedPairings(newPairings);
    }
  };

  const getPlayerRatingDisplay = (player: Player | null) => {
    if (!player) return null;
    return player.rating ? `(${player.rating})` : '(Unrated)';
  };

  const getPlayerCountryFlag = (player: Player | null) => {
    if (!player || !player.country_code) return null;
    return (
      <Chip
        label={player.country_code}
        size="small"
        variant="outlined"
        sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
      />
    );
  };

  const getTotalGames = () => {
    return editedPairings.filter(p => p.black_player !== null).length;
  };

  const getTotalByes = () => {
    return editedPairings.filter(p => p.black_player === null).length;
  };

  const renderPlayerCell = (player: Player | null, isWhite: boolean = true) => {
    if (!player) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.300' }}>
            <PersonOff fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="body2" color="text.secondary">
              BYE
            </Typography>
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar 
          sx={{ 
            width: 32, 
            height: 32, 
            bgcolor: isWhite ? 'grey.100' : 'grey.800',
            color: isWhite ? 'grey.800' : 'grey.100',
            border: '2px solid',
            borderColor: isWhite ? 'grey.300' : 'grey.600',
          }}
        >
          <Person fontSize="small" />
        </Avatar>
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {player.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getPlayerRatingDisplay(player)}
            {getPlayerCountryFlag(player)}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth
      PaperProps={{
        sx: { height: '80vh', maxWidth: 'lg', margin: 'auto' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Round {roundNumber} Pairings
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              icon={<CheckCircle />}
              label={`${getTotalGames()} Games`}
              color="primary"
              variant="outlined"
            />
            {getTotalByes() > 0 && (
              <Chip
                icon={<PersonOff />}
                label={`${getTotalByes()} Byes`}
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {editedPairings.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No pairings generated. This might happen when there are insufficient players or all players have already played each other.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Board
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>
                    White Player
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, width: 60 }}>
                    vs
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>
                    Black Player
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, width: 120 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editedPairings.map((pairing, index) => (
                  <TableRow key={index} hover>
                    <TableCell align="center">
                      <Chip
                        label={pairing.board_number}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      {renderPlayerCell(pairing.white_player, true)}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="h6" color="text.secondary">
                        vs
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {renderPlayerCell(pairing.black_player, false)}
                    </TableCell>
                    <TableCell align="center">
                      {pairing.black_player && (
                        <Tooltip title="Swap colors">
                          <IconButton
                            size="small"
                            onClick={() => handleSwapColors(index)}
                            color="primary"
                          >
                            <SwapHoriz />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {editedPairings.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              <strong>Summary:</strong> {getTotalGames()} games will be created
              {getTotalByes() > 0 && `, ${getTotalByes()} players will receive byes`}.
              You can swap colors by clicking the swap button next to each pairing.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={onClose}
          disabled={loading}
          startIcon={<Cancel />}
        >
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(editedPairings)}
          variant="contained"
          disabled={loading || editedPairings.length === 0}
          startIcon={<CheckCircle />}
        >
          {loading ? 'Creating Games...' : 'Confirm Pairings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PairingsDisplay;