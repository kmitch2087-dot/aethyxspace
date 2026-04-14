import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AdminRoute from "@/components/AdminRoute";
import ClientRoute from "@/components/ClientRoute";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Portfolio from "./pages/Portfolio";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import PaymentSuccess from "./pages/PaymentSuccess";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import MedSpa from "./pages/MedSpa";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import BlogManager from "./pages/admin/BlogManager";
import Inquiries from "./pages/admin/Inquiries";
import Reviews from "./pages/admin/Reviews";
import Agreements from "./pages/admin/Agreements";
import Financials from "./pages/admin/Financials";
import Clients from "./pages/admin/Clients";
import PortalLayout from "./pages/portal/PortalLayout";
import PortalOverview from "./pages/portal/PortalOverview";
import PortalMessages from "./pages/portal/PortalMessages";
import PortalDocuments from "./pages/portal/PortalDocuments";
import PortalAgreements from "./pages/portal/PortalAgreements";
import PortalPayments from "./pages/portal/PortalPayments";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/medspa" element={<MedSpa />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="blog" element={<BlogManager />} />
              <Route path="inquiries" element={<Inquiries />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="agreements" element={<Agreements />} />
              <Route path="financials" element={<Financials />} />
              <Route path="clients" element={<Clients />} />
            </Route>
            <Route
              path="/portal"
              element={
                <ClientRoute>
                  <PortalLayout />
                </ClientRoute>
              }
            >
              <Route index element={<PortalOverview />} />
              <Route path="messages" element={<PortalMessages />} />
              <Route path="documents" element={<PortalDocuments />} />
              <Route path="agreements" element={<PortalAgreements />} />
              <Route path="payments" element={<PortalPayments />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
