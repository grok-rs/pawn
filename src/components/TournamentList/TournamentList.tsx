import { Box } from "@mui/material";

import TournamentListItem from "./TournamentListItem";
import { Tournament } from "@dto/bindings";

type TournamentListProps = {
  tournaments: Tournament[];
  onDelete?: (id: number) => void;
};

const TournamentList = ({ tournaments, onDelete }: TournamentListProps) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {tournaments.map((tournament) => (
        <TournamentListItem key={tournament.id} tournament={tournament} onDelete={onDelete} />
      ))}
    </Box>
  );
};

export default TournamentList;
