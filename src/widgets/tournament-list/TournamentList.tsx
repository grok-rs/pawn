import type { Tournament } from '@dto/bindings';
import { Box } from '@mui/material';
import TournamentListItem from './TournamentListItem';

type TournamentListProps = {
  tournaments: Tournament[];
  onDelete?: (id: number) => void;
  variant?: 'featured' | 'compact';
};

const TournamentList = ({
  tournaments,
  onDelete,
  variant = 'featured',
}: TournamentListProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: variant === 'compact' ? 1 : 2,
      }}
    >
      {tournaments.map(tournament => (
        <TournamentListItem
          key={tournament.id}
          tournament={tournament}
          onDelete={onDelete}
          variant={variant}
        />
      ))}
    </Box>
  );
};

export default TournamentList;
