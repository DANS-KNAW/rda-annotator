import { useEffect, useState } from "react";
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

// Simple storage watcher - no messages needed
function PendingAnnotationWatcher() {
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const checkForPendingAnnotation = async () => {
      const pendingData = await storage.getItem("session:pendingAnnotation");

      if (pendingData && isActive) {
        console.log(
          "[PendingAnnotationWatcher] Found pending annotation",
          pendingData
        );

        sessionStorage.setItem(
          "pendingAnnotation",
          JSON.stringify(pendingData)
        );
        window.dispatchEvent(new Event("pendingAnnotationUpdated"));

        await storage.removeItem("session:pendingAnnotation");

        // Navigate to create page
        navigate("/create");
      }
    };

    checkForPendingAnnotation();

    const unwatch = storage.watch("session:pendingAnnotation", (newValue) => {
      if (newValue && isActive) {
        console.log(
          "[PendingAnnotationWatcher] Storage changed, new pending annotation"
        );
        checkForPendingAnnotation();
      }
    });

    return () => {
      isActive = false;
      unwatch();
    };
  }, [navigate]);

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
        <BrowserRouter basename="/sidebar.html">
          <AuthenticationProvider>
            <PendingAnnotationWatcher />
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<IndexRoute />} />
                <Route path="/introduction" element={<Introduction />} />
                <Route path="/annotations" element={<Annotations />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/create" element={<Create />} />
              </Route>
            </Routes>
          </AuthenticationProvider>
        </BrowserRouter>
      )}
    </div>
  );
}
