import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import { Box, SelectChangeEvent, Typography } from "@mui/material";
import useSWR from "swr";
import usePageTitle from "../../hooks/usePageTitle";
import { usePagination } from "../../hooks/usePagination";
import { createStyleHook } from "../../hooks/styleHooks";
import { AppTexts } from "../../consts/texts";
import { AppRoutes } from "../../consts/routes";
import { useGetServerApi } from "../../facades/ServerApi";
import { DogResult } from "../../types/payload.types";
import { PageContainer } from "../../components/pageComponents/PageContainer/PageContainer";
import { PageTitle } from "../../components/pageComponents/PageTitle/PageTitle";
import { ResultsGrid } from "../../components/resultsComponents/ResultsGrid";
import { SelectInputField } from "../../components/pageComponents/SelectInput/SelectInput";
import { ErrorLoadingDogs } from "../../components/resultsComponents/ErrorLoadingDogs";
import { LoadingSpinnerWithText } from "../../components/common/LoadingSpinnerWithText";
import { Pagination } from "../../components/pageComponents/Pagination/Pagination";

const usePageStyles = createStyleHook(() => ({
  pageWrapper: {
    height: "100%",
    width: "90%",
    maxWidth: 1400,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    px: { sm: 4 },
  },
  responseContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    width: "100%",
  },
  selectorFlex: { display: "flex", flexDirection: "column", gap: 1 },
  typography: {
    color: "white",
    width: "max-content",
    ml: "auto",
    fontSize: 18,
  },
}));

export const AllReportsPage = withAuthenticationRequired(() => {
  usePageTitle(AppTexts.allReportsPage.title);
  const getServerApi = useGetServerApi();
  const styles = usePageStyles();
  const navigate = useNavigate();
  const { dogType } = useParams();

  type SelectOptions = "found" | "lost" | "all";
  const [selectedType, setSelectedType] = useState<SelectOptions>(
    (dogType as SelectOptions) ?? "all",
  );
  const [unauthorizedError, setUnauthorizedError] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [possibleMatchesCount, setPossibleMatchesCount] = useState<
    number | null
  >(null);

  const fetcher = async () => {
    const serverApi = await getServerApi();
    const type = ["found", "lost"].includes(selectedType) ? selectedType : "";
    const page_size = 12; // eslint-disable-line
    // we need to send the payload without the type in order to fetch ALL reports
    const payload = type ? { type, page, page_size } : { page, page_size };
    try {
      const response = await serverApi.getAllReportedDogs(payload);
      if (response.status === 403) return setUnauthorizedError(true);
      const json = await response.json();
      return {
        results: json?.data?.results || [],
        pagination: json?.data?.pagination,
      };
    } catch (error) {
      console.error(error); // eslint-disable-line
      throw new Error("Failed to fetch reports");
    }
  };

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR([`${selectedType}-reports-page-${page}`], fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    const fetchPossibleMatchesCount = async () => {
      const serverApi = await getServerApi();
      try {
        const MatchesResponse = await serverApi.getPossibleMatchesCount();
        if (MatchesResponse.status === 200) {
          const json = await MatchesResponse.json();
          setPossibleMatchesCount(json);
        }
      } catch (err) {
        console.error(err); // eslint-disable-line
        throw new Error("Failed to fetch possible matches count");
      }
    };

    if (possibleMatchesCount === null) fetchPossibleMatchesCount();
  }, [possibleMatchesCount, getServerApi]);

  const sortResults = () => {
    // create 2 arrays for lost and found dogs.
    // then loop over each dog in the results and push it to the matching array
    const initValue = { foundDogs: [], lostDogs: [] };
    if (!response?.results) return initValue;
    return response?.results.reduce(
      (
        result: { foundDogs: DogResult[]; lostDogs: DogResult[] },
        dog: DogResult,
      ) => {
        // @ts-expect-error
        const { images, id, type } = dog;
        const imageBase64 = images[0]?.base64Image;
        const dogId = id;
        const modifiedDog = { ...dog, imageBase64, dogId };
        if (type === "found") {
          result.foundDogs.push(modifiedDog);
        } else if (type === "lost") {
          result.lostDogs.push(modifiedDog);
        }
        return result;
      },
      initValue,
    );
  };

  const { foundDogs, lostDogs } = sortResults();

  const getFilteredReports = () => {
    const reportsArrays = {
      lost: lostDogs,
      found: foundDogs,
      all: [...foundDogs, ...lostDogs],
    };
    return reportsArrays[selectedType];
  };

  const filteredReports: DogResult[] = getFilteredReports();
  const itemsPerPage = response?.pagination?.page_size ?? 12;
  const paginatedReports = usePagination(filteredReports ?? [], itemsPerPage);
  const pagesCount: number =
    Math.ceil((response?.pagination?.total as number) / itemsPerPage) ?? 0;

  const handlePagination = (
    event: React.ChangeEvent<unknown> | SelectChangeEvent<any>,
    value: number | string,
  ) => {
    const newValue = typeof value === "number" ? value : 1;
    setPage(newValue);
    paginatedReports.jump(newValue);
    window.scroll({ top: 0 });
  };

  const changeSelectedReports = (event: SelectChangeEvent<any>) => {
    const { value } = event.target;
    if (selectedType !== value) {
      setSelectedType(value);
      navigate(`/all-reports/${value}`);
      handlePagination(event, value);
    }
  };

  return (
    <PageContainer>
      <Box sx={styles.pageWrapper}>
        <PageTitle text={AppTexts.allReportsPage.title} />
        {isLoading && (
          <LoadingSpinnerWithText title={AppTexts.allReportsPage.loading} />
        )}
        {!isLoading && error && !unauthorizedError && (
          <ErrorLoadingDogs refresh={mutate} />
        )}
        {unauthorizedError && (
          <ErrorLoadingDogs text={AppTexts.allReportsPage.unauthorized} />
        )}
        {!isLoading && !error && !unauthorizedError && (
          <Box sx={styles.responseContainer}>
            <Box sx={styles.selectorFlex}>
              <SelectInputField
                options={AppTexts.allReportsPage.select}
                label={AppTexts.allReportsPage.selectLabel}
                onChange={changeSelectedReports}
                value={selectedType}
                notCentered
              />
              {response?.pagination && (
                <Typography sx={styles.typography}>
                  <span style={{ textDecoration: "underline" }}>
                    {AppTexts.allReportsPage.numberOfReports}
                  </span>{" "}
                  {`${response?.pagination?.total}`}
                </Typography>
              )}
              <Link
                to={AppRoutes.dogs.allMatches}
                style={{ textDecoration: "none" }}
              >
                <Typography sx={styles.typography}>
                  <span style={{ textDecoration: "underline" }}>
                    {AppTexts.allReportsPage.numberOfMatches}
                  </span>{" "}
                  {`${possibleMatchesCount ?? "טוען"}`}
                </Typography>
              </Link>
            </Box>
            <ResultsGrid
              results={paginatedReports.currentData() as DogResult[]}
              allReportsPage
              getUpdatedReports={mutate}
            />
            {filteredReports.length && (
              <Pagination
                count={pagesCount}
                page={page}
                onChange={handlePagination}
              />
            )}
          </Box>
        )}
      </Box>
    </PageContainer>
  );
});
