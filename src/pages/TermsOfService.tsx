import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfService = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Navbar />

    <div className="pt-28 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl mb-12">Terms of Service</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">Agreement</h2>
            <p>By accessing and using aethyx.space, you agree to be bound by these terms. If you do not agree, please do not use the site.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">Services</h2>
            <p>Aethyx provides web design, branding, and related digital services. All project details, deliverables, and timelines are agreed upon during the consultation and formalized in a signed agreement before work begins.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">Payments</h2>
            <p>The $50 consultation fee is non-refundable but is credited toward the final project total. Project payments follow the terms outlined in each signed client agreement.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">Intellectual Property</h2>
            <p>Upon full payment, clients receive ownership of the final deliverables. Aethyx retains the right to showcase completed projects in its portfolio unless otherwise agreed.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">Limitation of Liability</h2>
            <p>Aethyx is not liable for any indirect, incidental, or consequential damages arising from the use of our services or website.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">Contact</h2>
            <p>Questions about these terms? Reach out at <a href="mailto:Aethyxspace@protonmail.com" className="text-primary hover:text-primary/80 transition-colors">aethyxspace@protonmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>

    <Footer />
  </div>
);

export default TermsOfService;
