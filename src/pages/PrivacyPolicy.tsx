import Header from "@/components/Header";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <main className="relative z-10 pt-[calc(var(--fixed-banner-height)+32px)] pb-24 px-6 md:px-12 lg:px-24 xl:px-32">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4 heading-accent">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-12">Last Updated: 2/23/26</p>

          <div className="space-y-8 text-base text-muted-foreground leading-relaxed">
            <p>
              Vibe Shift Studio respects your privacy and is committed to protecting any personal information you provide through this website, social media, or business forms.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
              <p className="mb-2">We may collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name, email address, phone number, or social media handle</li>
                <li>Business details submitted through contact or intake forms</li>
                <li>Messages, project requests, or educational inquiries</li>
                <li>Basic website analytics such as device type, browser, and page visits</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
              <p className="mb-2">Your information may be used to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Respond to inquiries or provide web design, branding, or educational services</li>
                <li>Deliver resources, updates, or service communications</li>
                <li>Improve website performance and marketing strategy</li>
                <li>Process bookings or service requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Education & Results Disclaimer</h2>
              <p>
                Some services include coaching or education related to branding, web design, marketing, or digital revenue ecosystems. Information provided is educational in nature and does not guarantee specific business results, income, or platform approval.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing</h2>
              <p className="mb-2">We do not sell personal information. Data may be shared with trusted third-party tools used to operate this business, including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Website hosting platforms</li>
                <li>Analytics services</li>
                <li>Scheduling or payment processors</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Third-Party Platforms</h2>
              <p>
                Interactions through platforms such as TikTok, social media apps, or embedded tools are also governed by their own privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Security</h2>
              <p>
                Reasonable safeguards are used to protect your information; however, no online system can guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights</h2>
              <p>
                You may request access, updates, or deletion of your personal information by contacting us through the{" "}
                <Link to="/start-here" className="text-sage underline hover:text-sage/80">Start Here</Link> page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Policy Updates</h2>
              <p>
                This Privacy Policy may be updated as services evolve. Continued use of this website indicates acceptance of any revised terms.
              </p>
            </section>

            <p className="text-foreground font-medium pt-4">Vibe Shift Studio</p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 bg-cream-deep border-t border-border/30">
        <div className="px-6 py-12 md:px-12 lg:px-24 xl:px-32">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground font-light">
              © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
            </p>
            <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
