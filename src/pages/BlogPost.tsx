import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BlogPost = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Post detail coming in Message 2.</p>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
