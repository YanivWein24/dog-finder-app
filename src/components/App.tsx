import { Box, ThemeProvider } from "@mui/material";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { createStyleHook } from "../hooks/styleHooks";
import { theme } from "../theme/theme";
import { routesWithElements } from "../consts/routes";

const useAppStyles = createStyleHook(() => {
  return {
    root: {
      width: "100%",
      minHeight: "100vh",
      overflowX: "hidden",
      backgroundColor: theme.palette.background.default,
    },
  };
});

export const App = () => {
  const styles = useAppStyles();

  return (
    <ThemeProvider theme={theme}>
      <Box sx={styles.root}>
        <BrowserRouter>
          <Routes>
            {routesWithElements.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.element {...route.props} />}
              />
            ))}
            {/* //! path without an element */}
            {/* <Route path={"/dog-finder/dogs/report"} /> */}
          </Routes>
        </BrowserRouter>
      </Box>
    </ThemeProvider>
  );
};
