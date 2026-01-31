import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Eye,
  Users,
  Target,
  Zap,
  Brain,
  Shield,
  ChevronDown,
  Play,
  Sparkles,
  MonitorPlay,
  BarChart3,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Logo from "@/assets/Final_Logo.png";
import SufiyanImg from "@/assets/team/Sufiyan.jpg";
import AliyanImg from "@/assets/team/Aliyan.jpg";
import MahnoorImg from "@/assets/team/mahnoor.jpg";
import ActionImg from "@/assets/action.png";

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["hero", "about", "technology", "team"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const teamMembers = [
    {
      name: "Abu Sufiyan",
      role: "Project Lead",
      description: "Backend logic, AI and model integration specialist driving the core intelligence of SmartAds.",
      image: SufiyanImg,
      gradient: "from-primary to-accent",
    },
    {
      name: "M. Aliyan H. Qureshi",
      role: "Creative Lead",
      description: "UI/UX design, marketing strategy, and project planning ensuring exceptional user experiences.",
      image: AliyanImg,
      gradient: "from-accent to-primary",
    },
    {
      name: "Mahnoor Siddiqui",
      role: "Research Lead",
      description: "Reporting, technical diagrams, and research powering data-driven decisions.",
      image: MahnoorImg,
      gradient: "from-primary via-accent to-primary",
    },
  ];

  const features = [
    {
      icon: Eye,
      title: "Real-time Detection",
      description: "Instant face detection using advanced neural networks running directly in the browser.",
    },
    {
      icon: Users,
      title: "Demographic Analysis",
      description: "Accurate age group and gender classification for precise audience targeting.",
    },
    {
      icon: Target,
      title: "Smart Targeting",
      description: "Dynamic ad queue prioritization based on real-time audience composition.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized TensorFlow.js models deliver results in milliseconds.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "All processing happens locally. No data ever leaves the device.",
    },
    {
      icon: Brain,
      title: "AI Powered",
      description: "State-of-the-art machine learning models for unmatched accuracy.",
    },
  ];

  const stats = [
    { value: "78.2%", label: "Detection Accuracy", icon: Target },
    { value: "<50ms", label: "Processing Time", icon: Clock },
    { value: "3", label: "Age Groups", icon: Users },
    { value: "100%", label: "Privacy Compliant", icon: Shield },
  ];

  return (
    <>
      <Helmet>
        <title>SmartAds - AI-Powered Dynamic Advertising System</title>
        <meta
          name="description"
          content="Real-time demographic-based ad targeting using AI. Dynamic ad queue prioritization based on audience gender and age detection."
        />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        {/* Fixed Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={Logo} alt="SmartAds Logo" className="h-10 w-10 object-contain" />
              <span className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SmartAds
              </span>
            </div>

            <Tabs value={activeSection} className="hidden md:block">
              <TabsList className="bg-muted/50">
                <TabsTrigger
                  value="about"
                  onClick={() => scrollToSection("about")}
                  className="data-[state=active]:bg-primary/20"
                >
                  About
                </TabsTrigger>
                <TabsTrigger
                  value="technology"
                  onClick={() => scrollToSection("technology")}
                  className="data-[state=active]:bg-primary/20"
                >
                  Technology
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  onClick={() => scrollToSection("team")}
                  className="data-[state=active]:bg-primary/20"
                >
                  Team
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                onClick={() => navigate("/dashboard")}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold"
              >
                <Play className="w-4 h-4 mr-2" />
                Try Now
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section id="hero" className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="animate-fade-in">
              {/* Logo */}
              <div className="mb-8 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-2xl opacity-50 animate-pulse" />
                  <img
                    src={Logo}
                    alt="SmartAds Logo"
                    className="relative h-32 w-32 md:h-40 md:w-40 object-contain drop-shadow-2xl"
                  />
                </div>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_3s_ease-in-out_infinite]">
                  Smart Advertising
                </span>
                <br />
                <span className="text-foreground">Powered by AI</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-4">
                See Your Audience. Reach Every Viewer.
              </p>
              <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-10">
                Real-time demographic detection that transforms advertising through intelligent audience analysis and
                dynamic content delivery.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold px-8 py-6 text-lg group"
                >
                  <Sparkles className="w-5 h-5 mr-2 group-hover:animate-spin" />
                  Launch Demo
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollToSection("about")}
                  className="border-primary/50 hover:bg-primary/10 px-8 py-6 text-lg"
                >
                  Learn More
                  <ChevronDown className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* Stats preview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="glass-card p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-all duration-300"
                  >
                    <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl md:text-3xl font-display font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-muted-foreground" />
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                The Future of{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Targeted Advertising
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                SmartAds revolutionizes digital signage by analyzing viewer demographics in real-time and automatically
                serving the most relevant content to each audience.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="glass-card p-6 rounded-2xl border border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div className="mt-20 text-center">
              <h3 className="text-2xl md:text-3xl font-display font-bold mb-12">How It Works</h3>
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
                {[
                  { icon: Eye, label: "Detect", desc: "Camera captures viewers" },
                  { icon: Brain, label: "Analyze", desc: "AI identifies demographics" },
                  { icon: BarChart3, label: "Score", desc: "Ads ranked by relevance" },
                  { icon: MonitorPlay, label: "Display", desc: "Best content plays" },
                ].map((step, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent p-[2px]">
                        <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                          <step.icon className="w-8 h-8 text-primary" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="font-display font-semibold text-lg">{step.label}</div>
                        <div className="text-sm text-muted-foreground">{step.desc}</div>
                      </div>
                    </div>
                    {index < 3 && (
                      <div className="hidden md:block w-16 h-[2px] bg-gradient-to-r from-primary to-accent mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section id="technology" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                AI That{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Sees What Matters
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Watch our neural network detect and classify viewers in real-time with remarkable precision.
              </p>
            </div>

            {/* Demo visualization */}
            <div className="max-w-5xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10">
                {/* Real AI detection demo image */}
                <img
                  src={ActionImg}
                  alt="AI detection demo showing real-time demographic analysis with bounding boxes"
                  className="w-full h-auto"
                />

                {/* Subtle overlay for effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
              </div>

              {/* Tech stack badges */}
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                {["TensorFlow.js", "face-api.js", "React", "WebGL", "TypeScript"].map((tech) => (
                  <span
                    key={tech}
                    className="px-4 py-2 rounded-full bg-muted border border-border text-sm font-mono text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section id="team" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                Meet the{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Team</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The innovators behind the magic, driving the future of intelligent advertising.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {teamMembers.map((member, index) => (
                <div key={index} className="group relative">
                  {/* Card */}
                  <div className="relative glass-card rounded-2xl p-6 border border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2">
                    {/* Gradient border effect on hover */}
                    <div
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${member.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                    />

                    {/* Photo */}
                    <div className="relative mb-6">
                      <div
                        className={`absolute inset-0 rounded-full bg-gradient-to-br ${member.gradient} blur-xl opacity-30 group-hover:opacity-50 transition-opacity`}
                      />
                      <div
                        className={`relative w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${member.gradient} p-[3px]`}
                      >
                        <img src={member.image} alt={member.name} className="w-full h-full rounded-full object-cover" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="text-center relative z-10">
                      <h3 className="text-xl font-display font-bold mb-1">{member.name}</h3>
                      <div
                        className={`text-sm font-semibold bg-gradient-to-r ${member.gradient} bg-clip-text text-transparent mb-3`}
                      >
                        {member.role}
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{member.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Ready to{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Transform</span>{" "}
              Your Advertising?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Experience the power of AI-driven audience targeting. Try SmartAds now and see the difference.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold px-12 py-6 text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Launch SmartAds
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border/50 bg-background/80">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={Logo} alt="SmartAds Logo" className="h-8 w-8 object-contain" />
                <span className="font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  SmartAds
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                © 2026 SmartAds. AI-Powered Dynamic Advertising System.
              </div>
              <div className="text-xs text-muted-foreground/60 font-mono">v1.0.0 | Built with ❤️</div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
