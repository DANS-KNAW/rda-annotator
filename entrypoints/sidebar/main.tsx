import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter, Route, Routes } from "react-router";

ReactDOM.createRoot(document.getElementById("sidebar")!).render(
  <React.StrictMode>
    <BrowserRouter basename="/sidebar.html">
      <Routes>
        <Route index element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
