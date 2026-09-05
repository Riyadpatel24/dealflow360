import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import AdminCustomers from "./pages/AdminCustomers";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPolicies from "./pages/AdminPolicies";
import AdminProducts from "./pages/AdminProducts";
import AdminUsers from "./pages/AdminUsers";

import Approvals from "./pages/Approvals";
import DealHealth from "./pages/DealHealth";
import Fulfillment from "./pages/Fulfillment";
import QuotationDetail from "./pages/QuotationDetail";
import Quotations from "./pages/Quotations";
import SalesDashboard from "./pages/SalesDashboard";


import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerQuotations from "./pages/CustomerQuotations";

import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>

      {/* =====================
          PUBLIC
      ===================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />


      {/* =====================
          ADMIN
      ===================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          />
        }
      >
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/users"
          element={<AdminUsers />}
        />

        <Route
          path="/admin/customers"
          element={<AdminCustomers />}
        />

        <Route
          path="/admin/products"
          element={<AdminProducts />}
        />

        <Route
          path="/admin/policies"
          element={<AdminPolicies />}
        />
      </Route>


      {/* =====================
          SALES
      ===================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["SALES"]}
          />
        }
      >
        <Route
          path="/sales"
          element={<SalesDashboard />}
        />

        <Route
          path="/sales/quotations"
          element={<Quotations />}
        />

        <Route
          path="/sales/quotations/:quotationId"
          element={<QuotationDetail />}
        />

        <Route
          path="/sales/approvals"
          element={<Approvals />}
        />

        <Route
          path="/sales/fulfillment"
          element={<Fulfillment />}
        />

        <Route
          path="/sales/fulfillment/:quotationId"
          element={<Fulfillment />}
        />

        <Route
          path="/sales/deal-health"
          element={<DealHealth />}
        />
      </Route>


      {/* =====================
          CUSTOMER
      ===================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["CUSTOMER"]}
          />
        }
      >
        <Route
          path="/customer"
          element={<CustomerDashboard />}
        />

        <Route
          path="/customer/quotations"
          element={<CustomerQuotations />}
        />
      </Route>


      {/* =====================
          FALLBACK
      ===================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}