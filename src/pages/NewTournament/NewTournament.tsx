import {
  Box,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  useTheme,
  Card,
  CardContent,
} from "@mui/material";
import {
  NavigateNext,
  EmojiEvents,
  FileUpload,
  Info,
  Settings,
  ContentCopy,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Grid from "@mui/material/Grid2";

import BaseLayout from "../../components/BaseLayout";
import ImportTournamentButton from "../../components/ImportTournamentButton";
import NewTournamentSetup from "../../components/NewTournamentForm/NewTournamentSetup";
import TournamentConfigurationExport from "../../components/TournamentConfigurationExport";
import TournamentTemplates from "../../components/TournamentTemplates";
import { APP_ROUTES } from "../../constants/appRoutes";

const NewTournamentPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
            {t("tournaments")}
          </Link>
          <Typography color="text.primary" fontWeight={500}>
            {t("newTournament")}
          </Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {t("createNewTournament")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("setupNewChessTournament")}
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
                    {t("importTournament")}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t("importTournamentDescription")}
                </Typography>
                <ImportTournamentButton />
              </CardContent>
            </Card>

            {/* Configuration Import/Export */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Settings color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    {t("tournament.configuration.title")}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t("tournament.configuration.description")}
                </Typography>
                <TournamentConfigurationExport />
              </CardContent>
            </Card>

            {/* Tournament Templates */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ContentCopy color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    {t("tournament.templates.title")}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t("tournament.templates.quickStart")}
                </Typography>
                <TournamentTemplates 
                  showSelection={true}
                  onSelectTemplate={(template) => {
                    // In a real implementation, this would populate the form with template data
                    console.log('Selected template:', template);
                  }}
                />
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Info color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    {t("quickTips")}
                  </Typography>
                </Box>
                <Box component="ul" sx={{ pl: 2, pr: 0, m: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    {t("quickTips.swiss")}
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    {t("quickTips.roundRobin")}
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    {t("quickTips.timeControls")}
                  </Typography>
                  <Typography component="li" variant="body2">
                    {t("quickTips.editLater")}
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
