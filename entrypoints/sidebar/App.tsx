import { useEffect, useState, useRef } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useNavigate,
} from "react-router";
import Layout from "@/components/Layout.tsx";
import Introduction from "@/views/Introduction.tsx";
import Annotations from "@/views/Annotations";
import { storage } from "#imports";
import AuthenticationProvider from "@/context/authentication.provider";
import { AnchorStatusProvider } from "@/context/anchor-status.context";
import {
  PendingAnnotationProvider,
  usePendingAnnotation,
} from "@/context/pending-annotation.context";
import Settings from "@/views/Settings";
import Create from "@/views/Create";
import Alert from "@/components/Alert.tsx";
import { isVersionGreaterOrEqual } from "@/utils/version-comparison";

function IndexRoute() {
  const [initialPath, setInitialPath] = useState<null | string>(null);

  useEffect(() => {
    (async () => {
      const shown = await storage.getItem<boolean>("local:intro-shown");
      setInitialPath(shown ? "/annotations" : "/introduction");
    })();
  }, []);

  if (initialPath === null) return null;

  return <Navigate to={initialPath} replace />;
}

function NavigateOnPendingAnnotation() {
  const navigate = useNavigate();
  const { pendingAnnotation, isReady } = usePendingAnnotation();
  const lastNavigatedTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      isReady &&
      pendingAnnotation &&
      pendingAnnotation.timestamp !== lastNavigatedTimestampRef.current
    ) {
      if (import.meta.env.DEV) {
        console.log(
          "[NavigateOnPendingAnnotation] Navigating to /create for timestamp:",
          pendingAnnotation.timestamp
        );
      }
      lastNavigatedTimestampRef.current = pendingAnnotation.timestamp;
      navigate("/create");
    }
  }, [isReady, pendingAnnotation, navigate]);

  return null;
}

export default function App() {
  const [upToDate, setUpToDate] = useState(true);
  const [minimumVersion, setMinimumVersion] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          import.meta.env.WXT_API_ENDPOINT + "/annotator/min-version"
        );
        const data = await response.json();
        const result = isVersionGreaterOrEqual(
          import.meta.env.WXT_ANNOTATOR_VERSION,
          data.minVersion
        );

        if (result) {
          setUpToDate(true);
          setMinimumVersion(import.meta.env.WXT_ANNOTATOR_VERSION);
        } else {
          setUpToDate(false);
          setMinimumVersion(data.minVersion);
        }
      } catch (error) {}
    })();
  }, []);

  return (
    <div className="h-screen w-full bg-gray-100 font-roboto">
      {!upToDate && (
        <div className="absolute inset-0 h-screen w-full flex justify-center items-center bg-gray-100 z-[9999]">
          <Alert
            title="OUTDATED"
            messages={[
              `The version ${
                import.meta.env.WXT_ANNOTATOR_VERSION
              } of the RDA Annotator is outdated.`,
              `Please update to the latest version (minimum required version is ${minimumVersion}).`,
              <a
                href={`${import.meta.env.WXT_KNOWLEDGE_BASE_URL}/annotator`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rda-500 underline"
              >
                Download from {import.meta.env.WXT_KNOWLEDGE_BASE_URL}/annotator
              </a>,
            ]}
          />
        </div>
      )}
      {upToDate && (
        <PendingAnnotationProvider>
          <BrowserRouter basename="/sidebar.html">
            <AuthenticationProvider>
              <AnchorStatusProvider>
                <NavigateOnPendingAnnotation />
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<IndexRoute />} />
                    <Route path="/introduction" element={<Introduction />} />
                    <Route path="/annotations" element={<Annotations />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/create" element={<Create />} />
                  </Route>
                </Routes>
              </AnchorStatusProvider>
            </AuthenticationProvider>
          </BrowserRouter>
        </PendingAnnotationProvider>
      )}
    </div>
  );
}
