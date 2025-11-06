import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import { FeaturedCarousel } from "./FeaturedEventsCarousal";
import i18n from "@/lib/i18n";

interface FeaturedEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  image: string;
}

interface HeroSectionProps {
  onShowTrending?: () => void;
  featuredEvent: FeaturedEvent | null;
}
const featuredEvents = [
  {
    id: "1",
    title: "Cairo Jazz Night",
    date: "July 22, 2026",
    image: "/event1.jpg", // remove /public prefix
    venue: "Cairo Opera House",
    organizer: "Cairo Music Society",
    bookNowLink: "https://example.com/book/1",
  },
  {
    id: "2",
    title: "Giza Art Festival",
    date: "July 25, 2025",
    image: "/event2.jpg",
    venue: "Giza Cultural Center",
    organizer: "Egyptian Art Foundation",
    bookNowLink: "https://example.com/book/2",
  },
  {
    id: "3",
    title: "Alexandria Food Carnival",
    date: "August 5, 2025",
    image: "/event3.jpg",
    venue: "Alexandria Corniche",
    organizer: "Taste Egypt",
    bookNowLink: "https://example.com/book/3",
  },
  {
    id: "4",
    title: "Sahara EDM Bash",
    date: "August 10, 2025",
    image: "/event4.jpg",
    venue: "Siwa Oasis",
    organizer: "Desert Beats",
    bookNowLink: "https://example.com/book/4",
  },
];

export function HeroSection({
  onShowTrending,
  featuredEvent,
}: HeroSectionProps) {
  const { t } = useTranslation();

  const handleTrendingClick = () => {
    if (onShowTrending) {
      onShowTrending();
      const trendingSection = document.getElementById("trending-section");
      if (trendingSection)
        trendingSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(72,89%,61%,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,hsl(72,89%,61%,0.08),transparent_50%)]" />
      </div>

      {/* Floating Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full animate-float" />
        <div
          className="absolute top-40 right-20 w-24 h-24 bg-primary/15 rounded-full animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-40 left-1/3 w-20 h-20 bg-primary/10 rounded-full animate-float"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[500px]">
          {/* Left Column */}
          <div
            className={`max-w-xl mx-auto md:mx-0 ${
              i18n.language === "ar"
                ? "text-right md:text-right"
                : "text-center md:text-left"
            }`}
          >
            {/* Welcome Badge */}
            <div className="inline-flex items-center space-x-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 mb-4 animate-fade-in">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t("hero.badge")}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-foreground mb-4 animate-slide-up">
              <div>{t("hero.headline_discover")}</div>
              <div className="mt-4">
                <span className="bg-primary px-2 py-1 rounded text-primary-foreground">
                  {t("hero.headline_amazing")}
                </span>
              </div>
              <div className="mt-4">{t("hero.headline_events")}</div>
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              {t("hero.subtitle")}
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <Button
                variant="gradient"
                size="hero"
                className="group"
                onClick={() => (window.location.href = "/events")}
              >
                <Sparkles className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2 transition-transform group-hover:rotate-12" />
                {t("hero.cta_explore")}
              </Button>
              <Button
                variant="outline"
                size="hero"
                className="group"
                onClick={handleTrendingClick}
              >
                <TrendingUp className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2 transition-transform group-hover:scale-110" />
                {t("hero.cta_trending")}
              </Button>
            </div>
          </div>
          {/* Right Column: Featured Event */}
          <FeaturedCarousel events={featuredEvents} />
        </div>
      </div>
    </section>
  );
}
