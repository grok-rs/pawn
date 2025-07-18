import FileUploadIcon from '@mui/icons-material/FileUpload';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

const ImportTournamentButton = () => {
  const { t } = useTranslation();

  const handleImport = () => {
    // Importing tournaments
    // Add your import logic here
  };

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<FileUploadIcon />}
      onClick={handleImport}
      sx={{
        backgroundColor: '#3A3D91', // Keep your custom color
        fontSize: '1.2rem', // Increase font size
        padding: '12px 24px', // Increase padding for a bigger button
        textTransform: 'none', // Keep text case as is
      }}
    >
      {t('importTournaments')}
    </Button>
  );
};

export default ImportTournamentButton;
