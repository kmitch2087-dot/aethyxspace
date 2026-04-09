import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-5xl mx-auto">
        <h1 className="text-4xl font-display tracking-wider mb-8">Blog</h1>
        <p className="text-muted-foreground">Posts coming in Message 2.</p>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
