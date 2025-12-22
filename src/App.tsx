
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SearchProvider } from "@/contexts/SearchContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsStorePage from "@/pages/ProductsStorePage";
import ProductsSoldPage from "@/pages/ProductsSoldPage";
import ProductsRestoredPage from "@/pages/ProductsRestoredPage";
import ProfilePage from "@/pages/ProfilePage";
import ReportsPage from "@/pages/ReportsPage";
import TrashPage from "@/pages/TrashPage";
import ManageBranchPage from "@/pages/ManageBranchPage";
import ManageEmployeesPage from "@/pages/ManageEmployeesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <SearchProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="products" element={<ProductsStorePage />} />
                  <Route path="products-sold" element={<ProductsSoldPage />} />
                  <Route path="products-restored" element={<ProductsRestoredPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="trash" element={<TrashPage />} />
                  <Route path="manage-branch" element={<ManageBranchPage />} />
                  <Route path="manage-employees" element={<ManageEmployeesPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </SearchProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
