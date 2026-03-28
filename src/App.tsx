import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Rebrand from "./pages/Rebrand";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";

// Legacy routes — preserved but disabled during rebrand
// import Index from "./pages/Index";
// import About from "./pages/About";
// import Services from "./pages/Services";
// import Membership from "./pages/Membership";
// import Testimonials from "./pages/Testimonials";
// import StartHere from "./pages/StartHere";
// import Seo from "./pages/Seo";
// import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Rebrand />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          {/* Legacy routes — disabled during rebrand */}
          {/* <Route path="/about" element={<About />} /> */}
          {/* <Route path="/services" element={<Services />} /> */}
          {/* <Route path="/membership" element={<Membership />} /> */}
          {/* <Route path="/testimonials" element={<Testimonials />} /> */}
          {/* <Route path="/start-here" element={<StartHere />} /> */}
          {/* <Route path="/seo" element={<Seo />} /> */}
          {/* <Route path="/privacy-policy" element={<PrivacyPolicy />} /> */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
