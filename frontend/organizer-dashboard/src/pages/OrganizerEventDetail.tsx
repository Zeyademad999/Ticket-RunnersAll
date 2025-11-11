import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Clock,
  Star,
  Users,
  Ticket,
  Share2,
  Heart,
  CalendarPlus,
  ParkingCircle,
  Accessibility,
  Wifi,
  Baby,
  Leaf,
  Utensils,
  ShowerHead,
  Music,
  Sun,
  ArrowLeft,
  Sun as SunIcon,
  Moon,
  LogOut,
  Edit,
  Upload,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareModal } from "@/components/ShareModal";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import organizerApi, { EventAnalytics } from "@/lib/api/organizerApi";
import { useAuth } from "@/Contexts/AuthContext";

interface EventImage {
  url: string;
  isPrimary?: boolean;
}

interface Organizer {
  id: string;
  name: string;
  logoUrl: string;
}

interface Facility {
  name: string;
  icon: string; // Icon key to map to a Lucide icon
}

interface EventData {
  id: string | undefined;
  title: string;
  videoUrl?: string;
  images: EventImage[];
  layoutImageUrl?: string;
  date: string;
  time: string;
  location: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  attendees: number;
  description: string;
  venueInfo: string;
  facilities?: Facility[];
  isFeatured?: boolean;
  organizer: Organizer;
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
  peopleAdmitted: number;
  peopleRemaining: number;
  totalPayoutPending: number;
  totalPayoutPaid: number;
  ticketCategories: TicketCategory[];
}

interface TicketCategory {
  name: string;
  price: number;
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
}

const OrganizerEventDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n: i18nInstance } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [showLayout, setShowLayout] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [language, setLanguage] = useState("EN");
  const locale = i18n.language === "ar" ? "ar-EG" : i18n.language || "en-US";

  // Fetch event details from API
  const {
    data: eventAnalytics,
    isLoading: eventLoading,
    error: eventError,
  } = useQuery<EventAnalytics>({
    queryKey: ["organizer-event-detail", id],
    queryFn: () => organizerApi.getEventDetail(id!),
    enabled: !!id && isAuthenticated,
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    description: "",
    attachments: [] as File[],
    attachmentPreviews: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const storedLang = localStorage.getItem("appLanguage");
    if (storedLang) {
      setLanguage(storedLang);
      i18n.changeLanguage(storedLang === "EN" ? "en" : "ar");
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === "EN" ? "ar" : "EN";
    setLanguage(newLang);
    i18n.changeLanguage(newLang === "EN" ? "en" : "ar");
    localStorage.setItem("appLanguage", newLang);

    toast({
      title: t("languageChanged", {
        lang: newLang === "ar" ? t("arabic") : t("english"),
      }),
      description: t("interfaceLanguageUpdated"),
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("organizer_authenticated");
    navigate("/organizer");
    toast({
      title: t("logout"),
      description: "Logged out successfully",
    });
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleEditEvent = () => {
    setShowEditModal(true);
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  // Edit form handlers
  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setEditForm((prev) => ({ ...prev, description: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    if (validFiles.length !== files.length) {
      toast({
        title: t("editEvent.invalidFileType"),
        description: t("editEvent.onlyImagesAndVideos"),
        variant: "destructive",
      });
    }

    const newAttachments = [...editForm.attachments, ...validFiles];
    setEditForm((prev) => ({ ...prev, attachments: newAttachments }));

    // Generate previews for new files
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditForm((prev) => ({
          ...prev,
          attachmentPreviews: [
            ...prev.attachmentPreviews,
            e.target?.result as string,
          ],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
      attachmentPreviews: prev.attachmentPreviews.filter((_, i) => i !== index),
    }));
  };

  const handleSubmitEdit = async () => {
    if (!editForm.description.trim()) {
      toast({
        title: t("editEvent.descriptionRequired"),
        description: t("editEvent.pleaseProvideDescription"),
        variant: "destructive",
      });
      return;
    }

    if (!id) {
      toast({
        title: t("editEvent.error"),
        description: "Event ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("requested_changes", editForm.description);
      
      if (editForm.attachments.length > 0) {
        editForm.attachments.forEach((file) => {
          formData.append("file_attachments", file);
        });
      }

      await organizerApi.submitEventEditRequest(id, {
        event: id,
        requested_changes: editForm.description,
        file_attachments: editForm.attachments.length > 0 ? "attached" : undefined,
      });

      toast({
        title: t("editEvent.submitted"),
        description: t("editEvent.editRequestSubmitted"),
      });

      setShowEditModal(false);
      setEditForm({
        description: "",
        attachments: [],
        attachmentPreviews: [],
      });
    } catch (error: any) {
      toast({
        title: t("editEvent.error"),
        description: error.response?.data?.error?.message || t("editEvent.submissionFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditForm({
      description: "",
      attachments: [],
      attachmentPreviews: [],
    });
  };

  // Transform API event data to EventData format
  const event: EventData | null = React.useMemo(() => {
    if (!eventAnalytics) return null;

    const overallStats = eventAnalytics.overall_stats || {
      sold: 0,
      available: 0,
      admitted: 0,
      remaining: 0,
    };

    const payoutInfo = eventAnalytics.payout_info || {
      pending: 0,
      paid: 0,
    };

    // Transform ticket categories
    const ticketCategories: TicketCategory[] = (eventAnalytics.ticket_categories || []).map((cat: any) => ({
      name: cat.name || cat.category || "Unknown",
      price: cat.price || 0,
      totalTickets: cat.total_tickets || cat.total || 0,
      ticketsSold: cat.sold || 0,
      ticketsAvailable: cat.available || 0,
    }));

    // Debug logging
    console.log("Event Analytics Data:", eventAnalytics);
    console.log("Ticket Categories Raw:", eventAnalytics.ticket_categories);
    console.log("Ticket Categories Transformed:", ticketCategories);

    return {
      id: String(eventAnalytics.id),
      title: eventAnalytics.title,
      videoUrl: undefined,
      images: [{ url: "/event-placeholder.jpg", isPrimary: true }],
      layoutImageUrl: undefined,
      date: eventAnalytics.date,
      time: eventAnalytics.time,
      location: eventAnalytics.location,
      price: 0,
      originalPrice: undefined,
      category: "Event",
      rating: 0,
      attendees: overallStats.admitted || 0,
      description: "",
      venueInfo: "",
      facilities: [],
      isFeatured: false,
      organizer: {
        id: "",
        name: "",
        logoUrl: "",
      },
      totalTickets: overallStats.sold + overallStats.available,
      ticketsSold: overallStats.sold,
      ticketsAvailable: overallStats.available,
      peopleAdmitted: overallStats.admitted,
      peopleRemaining: overallStats.remaining,
      totalPayoutPending: payoutInfo.pending,
      totalPayoutPaid: payoutInfo.paid,
      ticketCategories,
    };
  }, [eventAnalytics]);

  const facilityIcons: Record<string, JSX.Element> = {
    parking: <ParkingCircle className="w-5 h-5 text-primary" />,
    accessibility: <Accessibility className="w-5 h-5 text-primary" />,
    wifi: <Wifi className="w-5 h-5 text-primary" />,
    baby: <Baby className="w-5 h-5 text-primary" />,
    greenArea: <Leaf className="w-5 h-5 text-primary" />,
    food: <Utensils className="w-5 h-5 text-primary" />,
    showers: <ShowerHead className="w-5 h-5 text-primary" />,
    music: <Music className="w-5 h-5 text-primary" />,
    outdoor: <Sun className="w-5 h-5 text-primary" />,
  };

  const mediaItems = useMemo(() => {
    const items: { type: "video" | "image"; url: string }[] = [];
    if (event.videoUrl) items.push({ type: "video", url: event.videoUrl });
    const images = [...event.images];
    if (!event.videoUrl)
      images.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    images.forEach(({ url }) => items.push({ type: "image", url }));
    return items;
  }, [event]);

  const date = new Date(event.date);
  const formattedDate =
    isNaN(date.getTime()) || !event.date
      ? t("common.invalidDate")
      : new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(date);

  const calculatePercentage = (sold: number, total: number) => {
    return total > 0 ? (sold / total) * 100 : 0;
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-dark"
      dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
    >
      <style>
        {`
          .rtl-label {
            text-align: right !important;
            direction: rtl !important;
          }
          .ltr-label {
            text-align: left !important;
            direction: ltr !important;
          }
        `}
      </style>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-8 flex-shrink-0">
              <img
                src={
                  isDark
                    ? "/src/assets/ticket-logo.png"
                    : "/public/ticket-logo-secondary.png"
                }
                alt="Ticket Runners Logo"
                className="h-10 w-auto sm:h-12 md:h-14"
              />
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-x-2 ltr:flex-row rtl:flex-row-reverse">
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <SunIcon className="h-4 w-4" />
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  className="data-[state=checked]:bg-primary"
                />
                <Moon className="h-4 w-4" />
              </div>
              <Button variant="header" size="icon" onClick={toggleLanguage}>
                <span className="text-xs ml-1">{language}</span>
              </Button>
              <Button variant="header" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-2">
              <Button variant="header" size="icon" onClick={toggleLanguage}>
                <span className="text-xs">{language}</span>
              </Button>
              <Button variant="header" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Loading State */}
          {eventLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-lg">{t("common.loading")}</div>
            </div>
          )}

          {/* Error State */}
          {eventError && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <p className="text-lg text-red-500 mb-4">
                {t("common.errorLoadingData")}
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                {t("common.backToDashboard")}
              </Button>
            </div>
          )}

          {/* Event Content */}
          {!eventLoading && !eventError && event && (
            <>
              {/* Back Button and Edit Event Button */}
              <div className="mb-6 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handleBackToDashboard}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("common.backToDashboard")}
                </Button>

                <Button
                  onClick={handleEditEvent}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                >
                  <Edit className="h-4 w-4" />
                  {t("editEvent.editEvent")}
                </Button>
              </div>

          {/* Media Carousel */}
          <div className="relative rounded-xl overflow-hidden mb-8" dir="ltr">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              navigation
              pagination={{ clickable: true }}
              spaceBetween={16}
              slidesPerView={1}
              autoplay={
                autoplayEnabled
                  ? {
                      delay: 3000,
                      disableOnInteraction: false,
                    }
                  : false
              }
              loop={mediaItems.length > 1}
              className="h-96 w-full"
              onTouchStart={() => setAutoplayEnabled(false)}
              onTouchMove={() => setAutoplayEnabled(false)}
              onNavigationNext={() => setAutoplayEnabled(false)}
              onNavigationPrev={() => setAutoplayEnabled(false)}
            >
              {mediaItems.map((media, idx) => (
                <SwiperSlide
                  key={idx}
                  className="flex items-center justify-center h-full"
                >
                  {media.type === "video" ? (
                    <video
                      src={media.url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="none"
                      poster="/video-placeholder.jpg"
                      className="w-full h-full object-cover aspect-video"
                    />
                  ) : (
                    <img
                      src={media.url}
                      alt={`${event.title} media ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "/image-fallback.jpg";
                      }}
                    />
                  )}
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Overlay Buttons */}
            <div className="absolute top-4 right-4 flex space-x-2 z-10">
              <Button
                variant="icon"
                size="icon"
                className="bg-background/80 backdrop-blur-sm"
                onClick={handleShare}
                aria-label={t("ariaLabels.share")}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
              {event.isFeatured && (
                <Badge className="bg-gradient-primary text-primary-foreground border-0">
                  {t("badges.featured")}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-background/80 backdrop-blur-sm"
              >
                {event.category}
              </Badge>
            </div>
          </div>

          {/* Event Content */}
          <div className="space-y-8">
            {/* Event Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                {event.title}
              </h1>

              {/* Meta */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-5 w-5 mx-3" />
                  <div dir={locale.startsWith("ar") ? "rtl" : "ltr"}>
                    {formattedDate} {event.time}
                  </div>
                </div>

                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-5 w-5 mx-3" />
                  <span className="text-sm text-muted-foreground">
                    {event.location}
                  </span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-5 w-5 mx-3" />
                  <span className="text-sm text-muted-foreground">
                    {t("eventDetail.gateOpen")} {event.time}
                  </span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-5 w-5 mx-3" />
                  <span className="text-sm text-muted-foreground">
                    {t("eventDetail.gateClose")} {event.time}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {event.ticketsSold}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.event.ticketsSold")}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {event.ticketsAvailable}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.event.ticketsAvailable")}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {event.peopleAdmitted}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.event.peopleAdmitted")}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {event.peopleRemaining}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.event.peopleRemaining")}
                </p>
              </div>
            </div>

            {/* Sales Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("dashboard.event.salesProgress")}</span>
                <span>
                  {calculatePercentage(
                    event.ticketsSold,
                    event.totalTickets
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${calculatePercentage(
                      event.ticketsSold,
                      event.totalTickets
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {t("eventDetail.aboutEvent")}
              </h2>
              <p className="text-muted-foreground">{event.description}</p>
            </div>

            {/* Venue Info */}
            <div
              className="pt-6 space-y-2 relative"
              dir={locale.startsWith("ar") ? "rtl" : "ltr"}
            >
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {t("eventDetail.venueInfoTitle")}
              </h2>
              <p className="text-muted-foreground">{event.venueInfo}</p>
              {event.layoutImageUrl && (
                <div
                  className="mt-4 flex w-full"
                  dir={locale.startsWith("ar") ? "rtl" : "ltr"}
                >
                  <Button
                    variant="gradient"
                    onClick={() => setShowLayout(true)}
                    className={locale.startsWith("ar") ? "ml-auto" : "mr-auto"}
                  >
                    {t("eventDetail.showLayout")}
                  </Button>
                </div>
              )}
              <Dialog open={showLayout} onOpenChange={setShowLayout}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden">
                  <img
                    src={event.layoutImageUrl}
                    alt="Venue Layout"
                    className="w-full h-auto object-contain"
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* Facilities */}
            {event.facilities && event.facilities.length > 0 && (
              <div className="pt-6">
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  {t("eventDetail.facilitiesTitle")}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {event.facilities.map((facility) => (
                    <div
                      key={facility.name}
                      className="flex items-center gap-2"
                    >
                      {facilityIcons[facility.icon] || null}
                      <span className="text-sm text-muted-foreground">
                        {t(`eventDetail.facilities.${facility.name}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ticket Categories */}
            <div className="pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {t("dashboard.analytics.ticketCategories")}
              </h2>
              <div className="space-y-4">
                {event.ticketCategories && event.ticketCategories.length > 0 ? (
                  event.ticketCategories.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          E£ {category.price}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          {t("dashboard.analytics.sold")}: {category.ticketsSold}
                        </span>
                        <span>
                          {t("dashboard.analytics.available")}:{" "}
                          {category.ticketsAvailable}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${calculatePercentage(
                              category.ticketsSold,
                              category.totalTickets
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("dashboard.analytics.noTicketCategories", "No ticket categories found for this event.")}
                  </p>
                )}
              </div>
            </div>

            {/* Payout Information */}
            <div className="pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {t("dashboard.analytics.payoutInfo")}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    E£ {event.totalPayoutPending.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.analytics.pendingPayout")}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    E£ {event.totalPayoutPaid.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.analytics.paidPayout")}
                  </p>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </main>
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={window.location.href}
      />

      {/* Edit Event Modal */}
      <Dialog open={showEditModal} onOpenChange={handleCloseEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("editEvent.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                {t("editEvent.descriptionLabel")}
              </Label>
              <Textarea
                id="description"
                placeholder={t("editEvent.descriptionPlaceholder")}
                value={editForm.description}
                onChange={handleDescriptionChange}
                className="min-h-[120px] resize-none"
                dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
              />
              <p className="text-xs text-muted-foreground">
                {t("editEvent.descriptionHelp")}
              </p>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="attachments" className="text-sm font-medium">
                {t("editEvent.attachmentsLabel")}
              </Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  {t("editEvent.dragDropOrClick")}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("editEvent.supportedFormats")}
                </p>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    document.getElementById("attachments")?.click()
                  }
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {t("editEvent.chooseFiles")}
                </Button>
              </div>
            </div>

            {/* File Previews */}
            {editForm.attachmentPreviews.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("editEvent.attachments")} (
                  {editForm.attachmentPreviews.length})
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {editForm.attachmentPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border">
                        {editForm.attachments[index]?.type.startsWith(
                          "video/"
                        ) ? (
                          <video
                            src={preview}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={preview}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseEditModal}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSubmitEdit}
                disabled={isSubmitting || !editForm.description.trim()}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t("editEvent.submitting")}
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4" />
                    {t("editEvent.submitRequest")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default OrganizerEventDetail;
