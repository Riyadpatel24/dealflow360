import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";

import "./index.css";
import "./theme.css";
import "./styles/profile.css";
import "./styles/responsive.css";
import "./styles/palette.css";
import "./styles/profile-fix.css";
import "./styles/account-responsive.css";
import "./styles/profile-layout.css";
import "./styles/profile-spacing.css";
import "./styles/brand.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
