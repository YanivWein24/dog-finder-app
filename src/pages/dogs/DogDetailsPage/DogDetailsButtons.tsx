import { useState, MouseEvent } from "react";
import { Link, To, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Box, Button, Typography } from "@mui/material";
import { IconArrowLeft, TablerIconsProps } from "@tabler/icons-react";
import { AppTexts } from "../../../consts/texts";
import { AppRoutes } from "../../../consts/routes";
import { useGetServerApi } from "../../../facades/ServerApi";
import { encryptData } from "../../../utils/encryptionUtils";
import { DogDetailsReturnType } from "../../../types/DogDetailsTypes";
import { DogType } from "../../../types/payload.types";
import { useAuthContext } from "../../../context/useAuthContext";
import { createStyleHook } from "../../../hooks/styleHooks";
import { useWindowSize } from "../../../hooks/useWindowSize";
import ReportSelectModal from "../../../components/Modals/ReportSelectModal";
import WhatsappIcon from "../../../assets/svg/whatsapp.svg";

interface DogDetailsButtonsStyle {
  isTablet: boolean;
  buttonDisabled: boolean;
}

const useDogDetailsButtonsStyles = createStyleHook(
  (theme, { isTablet, buttonDisabled }: DogDetailsButtonsStyle) => ({
    actionBtnWrapper: {
      display: "flex",
      flexDirection: {
        xs: "column-reverse",
        md: "row",
      },
      gap: { md: "2rem", xs: "12px" },
    },
    actionBtnStyle: {
      width: { xs: "85vw", md: "15rem" },
      maxWidth: "480px",
      height: { xs: "5vh", md: "5vh" },
    },
    buttonDisabledText: {
      color: "white",
      position: "absolute",
      bottom: isTablet ? "unset" : -23,
      top: isTablet ? -23 : "unset",
      fontSize: 14,
      width: "100%",
      textAlign: "center",
    },
    contactBtnStyle: {
      width: { xs: "85vw", md: "15rem" },
      maxWidth: "480px",
      height: { xs: "5vh", md: "5vh" },
      backgroundColor: "#E3F0FF",
      color: theme.palette.primary.main,
      cursor: buttonDisabled ? "not-allowed" : "pointer",
      opacity: buttonDisabled ? 0.6 : 1,
      "&:hover": { backgroundColor: "#cad6e4 !important" },
    },
  }),
);

const reportPossibleMatch = async (
  payload: {
    lastReportedId: number | null;
    possibleMatchId: number;
    selectedReportId?: number | null;
  },
  getServerApi: Function,
  // eslint-disable-next-line
): Promise<void> => {
  const { lastReportedId, possibleMatchId, selectedReportId } = payload;
  // `selectedReportId` is being passed in ReportSelectModal.tsx
  if (!lastReportedId && !selectedReportId)
    return console.error("User has no previous reports"); // eslint-disable-line

  const serverApi = await getServerApi();
  const response = await serverApi.addPossibleDogMatch({
    dogId: selectedReportId ?? lastReportedId,
    possibleMatchId,
  });
  // eslint-disable-next-line
  if (!response?.ok) console.error("Failed to report possible match");
};

interface DogDetailsButtonsProps {
  data: DogDetailsReturnType | null;
}

export const DogDetailsButtons = ({ data }: DogDetailsButtonsProps) => {
  const { whatsappButton, disabledButtonText, backButton, whatsappTexts } =
    AppTexts.dogDetails;

  const {
    state: { reports },
  } = useAuthContext();
  const { user, loginWithRedirect } = useAuth0();

  const userOppositeReports =
    reports?.filter((report) => report.type !== data?.type) ?? [];
  const noUserReports: boolean =
    !userOppositeReports || !userOppositeReports.length;

  const userReportsIds: number[] = !reports
    ? []
    : reports.map((report) => report.id);

  const dogIdFromUrl = Number(window.location.pathname.split("/dogs/")[1]);
  const reporterIsCurrentUser: boolean = userReportsIds.includes(dogIdFromUrl);

  // disable the button if the user has no reports, or the reporter is the same user,
  // or they have 1 report but its not from the opposite list,
  // we must also make sure to NOT disable the button when there's  no user, because we use that button
  // to authenticateWithRedirect in that case
  const buttonDisabled =
    !!user &&
    (noUserReports ||
      reporterIsCurrentUser ||
      !!(reports && reports.length === 1 && reports[0].type === data?.type));

  const getServerApi = useGetServerApi();
  const navigate = useNavigate();
  const { isTablet } = useWindowSize();
  const styles = useDogDetailsButtonsStyles({ isTablet, buttonDisabled });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  // if a user has multiple reports, they should choose the one that matches with the dog page
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const backButtonRedirectsToHome = window.location.href.includes("no-return");

  const lastReportedId: number | null = userOppositeReports
    ? userOppositeReports[userOppositeReports.length - 1]?.id
    : null;

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) =>
    (userOppositeReports?.length !== 1 || !user) && event.preventDefault();

  const handleCTAButton = (possibleMatchId: number | undefined) => {
    if (!userOppositeReports) return;
    if (!user) {
      encryptData("dog_id_to_redirect", `${dogIdFromUrl}`);
      loginWithRedirect({
        authorizationParams: {
          redirect_uri: `${window.location.href}/dogs/redirect`,
        },
      });
    }
    if (userOppositeReports?.length > 1) {
      setIsModalOpen(true);
      return;
    }
    if (possibleMatchId)
      reportPossibleMatch({ lastReportedId, possibleMatchId }, getServerApi);
  };

  const getWhatsappMessage = () => {
    // Split the URL and keep only the IDs
    const dogIds = window.location.href
      .split("/")
      .filter((segment) => segment !== "" && Number(segment));
    const dogPage: string = `${window.location.origin}/dogs/${dogIds[0]}`;
    const userReportedDogPage: string | null =
      selectedReportId || lastReportedId
        ? `${window.location.origin}/dogs/${selectedReportId ?? lastReportedId}`
        : null;

    const { lost, lost2, lost3, found, found2, found3 } = whatsappTexts;

    const messages = {
      lost: `${lost}${`%0A%0A${lost2}%0A${userReportedDogPage}`}%0A%0A${lost3}%0A${dogPage}`,
      found: `${found}%0A%0A${found2}%0A${dogPage}%0A%0A${found3}%0A${userReportedDogPage}`,
    };
    return messages[data?.type ?? DogType.FOUND];
  };

  const contactNumber = data?.contactPhone
    ? `${
        data?.contactPhone[0] === "0"
          ? `+972${data?.contactPhone.slice(1)}`
          : data?.contactPhone
      }`.replace(/-/g, "")
    : "";

  const whatsappLink = `https://wa.me/${contactNumber}/?text=${getWhatsappMessage()}`;

  const buttonDisabledText =
    disabledButtonText[
      !user
        ? "noUser"
        : reporterIsCurrentUser
          ? "reporterIsCurrentUser"
          : data?.type ?? "lost"
    ];

  const commonIconProps: TablerIconsProps = {
    style: { marginRight: "0.5rem" },
    stroke: 1.5,
  };

  return (
    <Box sx={styles.actionBtnWrapper}>
      <ReportSelectModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        selectedReportId={selectedReportId}
        setSelectedReportId={setSelectedReportId}
        confirmFunction={reportPossibleMatch}
        getWhatsappMessage={getWhatsappMessage}
        possibleMatch={data}
        contactNumber={contactNumber}
      />
      <Button
        size="large"
        variant="contained"
        sx={styles.actionBtnStyle}
        onClick={() =>
          navigate(backButtonRedirectsToHome ? AppRoutes.root : (-1 as To))
        }
      >
        <IconArrowLeft {...commonIconProps} />
        {backButton}
      </Button>
      <Box position="relative">
        {(reporterIsCurrentUser || (noUserReports && data?.type)) && (
          <Typography sx={styles.buttonDisabledText}>
            {buttonDisabledText}
          </Typography>
        )}
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <Link
          to={!user || buttonDisabled ? "#" : whatsappLink}
          onClick={handleLinkClick}
          aria-disabled={buttonDisabled}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            size="large"
            variant="contained"
            sx={styles.contactBtnStyle}
            disableRipple={buttonDisabled}
            disableFocusRipple={buttonDisabled}
            disableTouchRipple={buttonDisabled}
            onClick={() => handleCTAButton(data?.id)}
          >
            <img
              src={WhatsappIcon}
              alt="Whatsapp"
              style={{ marginRight: "4px" }}
            />
            {whatsappButton}
          </Button>
        </Link>
      </Box>
    </Box>
  );
};
