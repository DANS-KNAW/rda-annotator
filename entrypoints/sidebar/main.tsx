import "@/assets/tailwind.css";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
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

function IndexRoute() {
  const [initialPath, setInitialPath] = useState<null | string>(null);

  useEffect(() => {
    (async () => {
      const shown = await storage.getItem<boolean>("local:intro-shown");
      setInitialPath(shown ? "/annotations" : "/introduction");
    })();
  }, []);

  // while waiting, render nothing or a loader
  if (initialPath === null) return null;

  return <Navigate to={initialPath} replace />;
}

function MessageListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onMessage("createAnnotation", (message) => {
      sessionStorage.setItem("pendingAnnotation", JSON.stringify(message.data));
      window.dispatchEvent(new Event("pendingAnnotationUpdated"));
      navigate("/create");
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  return null;
}

ReactDOM.createRoot(document.getElementById("sidebar")!).render(
  <div className="h-screen w-full bg-gray-100 font-roboto">
    <React.StrictMode>
      <BrowserRouter basename="/sidebar.html">
        <AuthenticationProvider>
          <MessageListener />
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
    </React.StrictMode>
  </div>
);
