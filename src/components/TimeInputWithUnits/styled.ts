import styled from "@emotion/styled";
import { TextField } from "@mui/material";

export const StyledTextField = styled(TextField)(() => ({
  '& .MuiInputBase-adornedEnd': {
    paddingRight: 0, 
  },
}));