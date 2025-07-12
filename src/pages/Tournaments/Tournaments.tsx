import Grid from "@mui/material/Grid2";
import { useEffect, useState } from "react";
import BaseLayout from "../../components/BaseLayout/BaseLayout";
import TournamentList from "../../components/TournamentList/TournamentList";
import TournamentSidebar from "../../components/TournamentSidebar/TournamentSidebar";
import {
  isDraftTournament,
  isFinishedTournament,
  isOngoingTournament,
} from "../../utils";
import { ContainerBox, ContentGrid, SidebarGrid } from "./styled";

import type { Tournament } from "../../dto/bindings";
import { commands } from "../../dto/bindings";

const TournamentsPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>(
    [],
  );
  const [filter, setFilter] = useState("InProgress");

  useEffect(() => {
    const fetch = async () => {
      const data = await commands.getTournaments();
      console.log(data);
      // if (data.status === "ok") {
      //   console.log(data.data);
      setTournaments(data);
      setFilteredTournaments(data.filter(isOngoingTournament));
      // }
    };

    fetch();
  }, []);

  useEffect(() => {
    const filterTournaments = () => {
      switch (filter) {
        case "InProgress":
          setFilteredTournaments(tournaments.filter(isOngoingTournament));
          break;
        case "NotStarted":
          setFilteredTournaments(tournaments.filter(isDraftTournament));
          break;
        case "Finished":
          setFilteredTournaments(tournaments.filter(isFinishedTournament));
          break;
        default:
          setFilteredTournaments([]);
          break;
      }
    };

    filterTournaments();
  }, [filter, tournaments]);

  const handleFilterChange = (newFilter: any) => setFilter(newFilter);

  return (
    <BaseLayout>
      <ContainerBox>
        <Grid container spacing={2}>
          <SidebarGrid size={{ mobile: 12, laptop: 3, desktop: 3 }}>
            <TournamentSidebar
              tournaments={tournaments}
              onFilterChange={handleFilterChange}
            />
          </SidebarGrid>
          <ContentGrid size={{ mobile: 12, laptop: 9, desktop: 9 }}>
            <TournamentList tournaments={filteredTournaments} />
          </ContentGrid>
        </Grid>
      </ContainerBox>
    </BaseLayout>
  );
};

export default TournamentsPage;
