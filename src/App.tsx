import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
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
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <OfflineProvider>
            <LanguageProvider>
              <SearchProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <DashboardLayout />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<div className="page-transition"><DashboardPage /></div>} />
                        <Route path="products" element={<div className="page-transition"><ProductsStorePage /></div>} />
                        <Route path="products-sold" element={<div className="page-transition"><ProductsSoldPage /></div>} />
                        <Route path="products-restored" element={<div className="page-transition"><ProductsRestoredPage /></div>} />
                        <Route path="profile" element={<div className="page-transition"><ProfilePage /></div>} />
                        <Route path="reports" element={<div className="page-transition"><ReportsPage /></div>} />
                        <Route path="trash" element={<div className="page-transition"><TrashPage /></div>} />
                        <Route path="manage-branch" element={<div className="page-transition"><ManageBranchPage /></div>} />
                        <Route path="manage-employees" element={<div className="page-transition"><ManageEmployeesPage /></div>} />
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </SearchProvider>
            </LanguageProvider>
          </OfflineProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
