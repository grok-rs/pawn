import { Box } from "@mui/material";
import Grid from "@mui/material/Grid2";

import BaseLayout from "../../components/BaseLayout";
import ImportTournamentButton from "../../components/ImportTournamentButton";
import NewTournamentSetup from "../../components/NewTournamentForm/NewTournamentSetup";

const NewTournamentPage = () => {
  return (
    <BaseLayout>
      <Box sx={{ padding: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ mobile: 12, laptop: 8, desktop: 8 }}>
            <NewTournamentSetup />
          </Grid>
          <Grid
            size={{ mobile: 12, laptop: 4, desktop: 4 }}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ImportTournamentButton />
          </Grid>
        </Grid>
      </Box>
    </BaseLayout>
  );
};

export default NewTournamentPage;
