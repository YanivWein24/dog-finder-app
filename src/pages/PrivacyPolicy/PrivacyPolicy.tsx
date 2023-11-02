import { Box, Typography } from "@mui/material";
import { createStyleHook } from "../../hooks/styleHooks";
import usePageTitle from "../../hooks/usePageTitle";
import { PageContainer } from "../../components/pageComponents/PageContainer/PageContainer";
import { PageTitle } from "../../components/pageComponents/PageTitle/PageTitle";
import { AppTexts } from "../../consts/texts";
import { description, lastUpdate, sections } from "./privacyPolicyText";

const usePrivacyPolicyStyles = createStyleHook(() => {
  return {
    sectionsContainer: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      my: 4,
    },
    section: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
    },
    typography: {
      color: "white",
      textAlign: "right",
      direction: "rtl",
      fontSize: 18,
    },
  };
});

export const PrivacyPolicy = () => {
  usePageTitle(AppTexts.privacyPolicy.tabTitle);
  const styles = usePrivacyPolicyStyles();

  return (
    <PageContainer>
      <Box maxWidth={1000} margin="0 auto">
        <PageTitle text={AppTexts.privacyPolicy.pageTitle} />
        <Typography sx={{ ...styles.typography, my: 6 }}>
          {description}
        </Typography>

        <Box sx={styles.sectionsContainer}>
          {sections.map((section) => (
            <Box key={section.title} sx={styles.section}>
              <Typography
                variant="h4"
                sx={{ ...styles.typography, fontSize: 34 }}
              >
                {section.title}
              </Typography>
              <Typography sx={styles.typography}>{section.text}</Typography>
            </Box>
          ))}
          <Typography sx={{ ...styles.typography, fontSize: 16, my: 2 }}>
            {lastUpdate}
          </Typography>
        </Box>
      </Box>
    </PageContainer>
  );
};
