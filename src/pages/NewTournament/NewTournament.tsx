import {
  Box,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  useTheme,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import {
  NavigateNext,
  EmojiEvents,
  Add,
  FileUpload,
  Info,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid2";

import BaseLayout from "../../components/BaseLayout";
import ImportTournamentButton from "../../components/ImportTournamentButton";
import NewTournamentSetup from "../../components/NewTournamentForm/NewTournamentSetup";
import { APP_ROUTES } from "../../constants/appRoutes";

const NewTournamentPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <BaseLayout>
      <Box>
        {/* Breadcrumbs */}
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 3 }}
        >
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => navigate(APP_ROUTES.TOURNAMENTS)}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <EmojiEvents fontSize="small" />
            Tournaments
          </Link>
          <Typography color="text.primary" fontWeight={500}>
            New Tournament
          </Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Create New Tournament
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Set up a new chess tournament with custom rules and configurations
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Main Form Section */}
          <Grid size={{ mobile: 12, laptop: 8 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                boxShadow: theme.shadows[2],
              }}
            >
              <NewTournamentSetup />
            </Paper>
          </Grid>

          {/* Side Options */}
          <Grid size={{ mobile: 12, laptop: 4 }}>
            {/* Import Option */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <FileUpload color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Import Tournament
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Have an existing tournament file? Import it directly to save time.
                </Typography>
                <ImportTournamentButton />
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Info color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Quick Tips
                  </Typography>
                </Box>
                <Box component="ul" sx={{ pl: 2, pr: 0, m: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Choose Swiss system for tournaments with many players
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Round-robin works best for smaller groups
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Set time controls based on your event duration
                  </Typography>
                  <Typography component="li" variant="body2">
                    You can always edit tournament details later
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </BaseLayout>
  );
};

export default NewTournamentPage;
