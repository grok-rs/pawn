import { AppBar, Box, Toolbar, Typography } from '@mui/material';
// import { window } from "@tauri-apps/api";
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <AppBar position="fixed" sx={{ backgroundColor: '#3A3D91', width: '100%' }}>
      <Toolbar>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexGrow: 1,
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" component="div" sx={{ marginLeft: 1 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              Pawn
            </Link>
          </Typography>
          {/* <button
            onClick={async () => {
              console.log("close");
              await window.getCurrentWindow().destroy();
            }}
          >
            X
          </button> */}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
