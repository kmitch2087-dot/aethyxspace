import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import GlobalBackground from "@/components/GlobalBackground";
import ScrollToTop from "@/components/ScrollToTop";
import PageViewTracker from "@/components/PageViewTracker";
import AdminRoute from "@/components/AdminRoute";
import ClientRoute from "@/components/ClientRoute";
import CookieConsent from "@/components/CookieConsent";
import PublicConcierge from "@/components/PublicConcierge";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Route-level code splitting: only Home (the LCP-critical landing page) and
// NotFound ship in the entry bundle. Everything else — especially the admin
// dashboard, client portal, and their Stripe/agreement machinery — loads on
// navigation. Before this, every public visitor downloaded the whole app
// (~480 KB gzip) plus Stripe.js just to render the homepage.
const Services = lazy(() => import("./pages/Services"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Bounty = lazy(() => import("./pages/Bounty"));
const Advertise = lazy(() => import("./pages/Advertise"));
const Barter = lazy(() => import("./pages/Barter"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const MedSpa = lazy(() => import("./pages/MedSpa"));
const Industries = lazy(() => import("./pages/Industries"));
const Intake = lazy(() => import("./pages/Intake"));
const IntakeSuccess = lazy(() => import("./pages/IntakeSuccess"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const BlogManager = lazy(() => import("./pages/admin/BlogManager"));
const Inquiries = lazy(() => import("./pages/admin/Inquiries"));
const Inbox = lazy(() => import("./pages/admin/Inbox"));
const Reviews = lazy(() => import("./pages/admin/Reviews"));
const Agreements = lazy(() => import("./pages/admin/Agreements"));
const Financials = lazy(() => import("./pages/admin/Financials"));
const Clients = lazy(() => import("./pages/admin/Clients"));
const ClientDetail = lazy(() => import("./pages/admin/ClientDetail"));
const Documents = lazy(() => import("./pages/admin/Documents"));
const Media = lazy(() => import("./pages/admin/Media"));
const Intakes = lazy(() => import("./pages/admin/Intakes"));
const IntakeFormManager = lazy(() => import("./pages/admin/IntakeForm"));
const Invoices = lazy(() => import("./pages/admin/Invoices"));
const Projects = lazy(() => import("./pages/admin/Projects"));
const ReferralProgram = lazy(() => import("./pages/admin/ReferralProgram"));
const AddOns = lazy(() => import("./pages/admin/AddOns"));
const PortalLayout = lazy(() => import("./pages/portal/PortalLayout"));
const PortalReferrals = lazy(() => import("./pages/portal/PortalReferrals"));
const PortalAddOns = lazy(() => import("./pages/portal/PortalAddOns"));
const PortalOverview = lazy(() => import("./pages/portal/PortalOverview"));
const PortalMessages = lazy(() => import("./pages/portal/PortalMessages"));
const PortalDocuments = lazy(() => import("./pages/portal/PortalDocuments"));
const PortalAgreements = lazy(() => import("./pages/portal/PortalAgreements"));
const PortalPayments = lazy(() => import("./pages/portal/PortalPayments"));
const PortalPay = lazy(() => import("./pages/portal/PortalPay"));
const PortalIntake = lazy(() => import("./pages/portal/PortalIntake"));
const PortalProjects = lazy(() => import("./pages/portal/PortalProjects"));
const PortalAssets = lazy(() => import("@/pages/portal/PortalAssets"));
const PortalTasks = lazy(() => import("./pages/portal/PortalTasks"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <PageViewTracker />
          <GlobalBackground />
          <div className="relative z-10">
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/bounty" element={<Bounty />} />
            <Route path="/advertise" element={<Advertise />} />
            <Route path="/barter" element={<Barter />} />
            <Route path="/intake" element={<Intake />} />
            <Route path="/intake-success" element={<IntakeSuccess />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/industries/medspa" element={<MedSpa />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
              <Route path="inbox" element={<Inbox />} />
              <Route path="intakes" element={<Intakes />} />
              <Route path="intake-form" element={<IntakeFormManager />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="agreements" element={<Agreements />} />
              <Route path="financials" element={<Financials />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="projects" element={<Projects />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="documents" element={<Documents />} />
              <Route path="media" element={<Media />} />
              <Route path="referral-program" element={<ReferralProgram />} />
              <Route path="add-ons" element={<AddOns />} />
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
              <Route path="pay/:invoiceId" element={<PortalPay />} />
              <Route path="intake" element={<PortalIntake />} />
              <Route path="referrals" element={<PortalReferrals />} />
              <Route path="add-ons" element={<PortalAddOns />} />
              <Route path="projects" element={<PortalProjects />} />
              <Route path="tasks" element={<PortalTasks />} />
              <Route path="assets" element={<PortalAssets />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </div>
          <PublicConcierge />
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
