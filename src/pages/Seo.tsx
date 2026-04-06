import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, TrendingUp, Users, Target, BarChart3, Globe } from "lucide-react";
import Header from "@/components/Header";

const Seo = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page Intro */}
      <section className="relative z-10 overflow-hidden pt-[140px] md:pt-[200px] lg:pt-[240px]">
        <div className="relative px-6 pt-8 pb-12 md:px-12 lg:px-24 xl:px-32 md:pt-12 md:pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <span className="block text-sm font-medium text-ocean tracking-wide uppercase mb-3">
              Understanding SEO
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] text-foreground mb-8 tracking-tight">
              What is SEO & Why Does It Matter?
            </h1>
            <p className="text-xl md:text-2xl text-foreground leading-relaxed font-medium">
              SEO stands for <span className="text-sage">Search Engine Optimization</span> — it's how your website gets found when people search online.
            </p>
          </div>
        </div>
      </section>

      {/* Main SEO Explanation */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-12 md:px-12 lg:px-24 xl:px-32 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="card-elevated rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-full bg-ocean-light flex items-center justify-center">
                  <Search className="h-7 w-7 text-ocean" />
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl text-foreground font-semibold">
                  The Storefront Analogy
                </h2>
              </div>
              
              <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium mb-8">
                Think of SEO as the difference between having a beautiful storefront on a busy street versus a hidden alley. No matter how amazing your business is, if people can't find you, they can't become customers.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-sage" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Organic Visibility</h3>
                    <p className="text-foreground font-medium leading-relaxed">
                      Good SEO means your ideal customers can find you naturally through Google, without paying for ads.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-sage" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Trust & Credibility</h3>
                    <p className="text-foreground font-medium leading-relaxed">
                      Websites that appear in search results are often perceived as more trustworthy and established.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why SEO Matters for Small Businesses */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-12 md:px-12 lg:px-24 xl:px-32 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="block text-sm font-medium text-sage tracking-wide uppercase mb-3">
                For small businesses
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold">
                Why SEO is So Important
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="card-elevated rounded-3xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                <div className="w-14 h-14 rounded-full bg-ocean-light flex items-center justify-center mx-auto mb-4">
                  <Target className="h-7 w-7 text-ocean" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-3 font-semibold">
                  Reach Local Customers
                </h3>
                <p className="text-foreground font-medium leading-relaxed">
                  Most people search for local businesses online. SEO helps you show up when they're looking for exactly what you offer.
                </p>
              </div>

              <div className="card-elevated rounded-3xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                <div className="w-14 h-14 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-7 w-7 text-sage" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-3 font-semibold">
                  Cost-Effective Marketing
                </h3>
                <p className="text-foreground font-medium leading-relaxed">
                  Unlike paid ads that stop working when you stop paying, SEO continues to bring in traffic over time.
                </p>
              </div>

              <div className="card-elevated rounded-3xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                <div className="w-14 h-14 rounded-full bg-ocean-light flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-7 w-7 text-ocean" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-3 font-semibold">
                  Compete with Larger Brands
                </h3>
                <p className="text-foreground font-medium leading-relaxed">
                  Good SEO levels the playing field, allowing small businesses to appear alongside bigger competitors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Include */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-12 md:px-12 lg:px-24 xl:px-32 md:py-16">
          <div className="max-w-3xl mx-auto">
            <div className="card-elevated rounded-3xl p-8 md:p-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl text-foreground font-semibold mb-6 text-center">
                SEO in Every Package
              </h2>
              <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium text-center mb-8">
                For small businesses, SEO is one of the most cost-effective ways to attract new customers. That's why every Vibe Shift Studio package includes foundational SEO setup to help you get started on the right foot.
              </p>
              <div className="text-center">
                <Button 
                  asChild 
                  size="lg"
                  className="text-base px-10 py-6 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5"
                >
                  <Link to="/services">
                    View Services
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-cream-deep border-t border-border/30">
        <div className="px-6 py-12 md:px-12 lg:px-24 xl:px-32">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-foreground font-light">
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

export default Seo;
