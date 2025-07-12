import { Box, Container } from "@mui/material";
import { ReactNode } from "react";

import Header from "../Header";

type BaseLayoutProps = {
  children: ReactNode;
};

const BaseLayout = ({ children }: BaseLayoutProps) => {
  return (
    <Box>
      <Header />
      <Container sx={{ marginTop: 12 }}>{children}</Container>
    </Box>
  );
};

export default BaseLayout;
