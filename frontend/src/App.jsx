import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminCustomers from "./pages/AdminCustomers";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPolicies from "./pages/AdminPolicies";
import AdminProducts from "./pages/AdminProducts";
import AdminUsers from "./pages/AdminUsers";
import Approvals from "./pages/Approvals";
import Billing from "./pages/Billing";
import DealHealth from "./pages/DealHealth";
import Fulfillment from "./pages/Fulfillment";
import QuotationDetail from "./pages/QuotationDetail";
import Quotations from "./pages/Quotations";
import SalesDashboard from "./pages/SalesDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerQuotations from "./pages/CustomerQuotations";
import CustomerQuotationDetail from "./pages/CustomerQuotationDetail";
import ProtectedRoute from "./auth/ProtectedRoute";

const SALES_WORKSPACE_ROLES = ["SALES", "SALES_MANAGER", "FINANCE"];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/customers" element={<AdminCustomers />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/policies" element={<AdminPolicies />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={SALES_WORKSPACE_ROLES} />}>
        <Route path="/sales" element={<SalesDashboard />} />
        <Route path="/sales/quotations" element={<Quotations />} />
        <Route path="/sales/quotations/:quotationId" element={<QuotationDetail />} />
        <Route path="/sales/approvals" element={<Approvals />} />
        <Route path="/sales/fulfillment" element={<Fulfillment />} />
        <Route path="/sales/fulfillment/:quotationId" element={<Fulfillment />} />
        <Route path="/sales/billing" element={<Billing />} />
        <Route path="/sales/deal-health" element={<DealHealth />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/customer/quotations" element={<CustomerQuotations />} />
        <Route path="/customer/quotations/:quotationId" element={<CustomerQuotationDetail />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
