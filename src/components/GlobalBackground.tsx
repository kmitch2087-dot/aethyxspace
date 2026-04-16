import classyBg from "@/assets/classy-background.jpg";

const GlobalBackground = () => {
  return (
    <div
      className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${classyBg})` }}
    />
  );
};

export default GlobalBackground;
