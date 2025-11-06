import React, { useState, useMemo, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { OtpInput } from "@/components/ui/input-otp";
import {
  Calendar,
  MapPin,
  Users,
  Ticket,
  TrendingUp,
  DollarSign,
  Clock,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Activity,
  Eye,
  EyeOff,
  Sun,
  Moon,
  LogOut,
  Download,
  FileText,
  Receipt,
  Upload,
  X,
  Camera,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import i18n from "@/lib/i18n";
import { Footer } from "@/components/Footer";
import InvoiceModal from "@/components/InvoiceModal";

const MOCK_OTP = "123456";

// Types
interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  imageUrl: string;
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

interface DashboardStats {
  totalEvents: number;
  runningEvents: number;
  completedEvents: number;
  availableTickets: number;
  totalTicketsSold: number;
  totalAttendees: number;
  totalRevenues: number;
  netRevenues: number;
  totalProcessedPayouts: number;
  totalPendingPayouts: number;
}

interface PayoutHistory {
  id: string;
  transactionId: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
  invoiceUrl: string;
  description: string;
}

const OrganizerDashboard: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("events");
  const [language, setLanguage] = useState("EN");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [payoutSearchTerm, setPayoutSearchTerm] = useState("");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>("all");
  const [payoutDateFilter, setPayoutDateFilter] = useState<string>("all");
  const tabsContentRef = useRef<HTMLDivElement>(null);

  // Profile image upload state
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );

  // Mock organizer profile data
  const [profileData, setProfileData] = useState({
    taxId: "123456789",
    commercialRegistration: "CR-2024-001234",
    legalBusinessName: "Event Management Solutions LLC",
    tradeName: "EventPro",
    about:
      "Leading event management company specializing in corporate events, conferences, and entertainment shows. We provide comprehensive event planning services with over 10 years of experience in the industry.",
    contactMobile: "+20 10 1234 5678",
    profileImage: "/placeholderLogo.png", // Default profile image
  });

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordStep, setChangePasswordStep] = useState<
    "current" | "otp" | "new"
  >("current");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordOtp, setChangePasswordOtp] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

  useEffect(() => {
    if (localStorage.getItem("organizer_authenticated") !== "true") {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const storedLang = localStorage.getItem("appLanguage");
    if (storedLang) {
      setLanguage(storedLang);
      i18n.changeLanguage(storedLang === "EN" ? "en" : "ar");
    }
  }, []);

  useEffect(() => {
    if (tabsContentRef.current) {
      tabsContentRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTab]);

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
    navigate("/");
    toast({
      title: t("logout"),
      description: "Logged out successfully",
    });
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    // Reset image upload state
    setProfileImageFile(null);
    setProfileImagePreview(null);
  };

  const handleRequestChanges = () => {
    // Check if there's a new profile image to include in the request
    if (profileImageFile) {
      toast({
        title: t("dashboard.profile.changesRequested"),
        description:
          t("dashboard.profile.changesRequestedDesc") +
          " " +
          t("dashboard.profile.imageUpdateIncluded"),
      });
    } else {
      toast({
        title: t("dashboard.profile.changesRequested"),
        description: t("dashboard.profile.changesRequestedDesc"),
      });
    }
    setIsEditingProfile(false);
    // Reset image upload state
    setProfileImageFile(null);
    setProfileImagePreview(null);
  };

  const handleProfileDataChange = (field: string, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Profile image upload handlers
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: t("dashboard.profile.invalidFileType"),
          description: t("dashboard.profile.onlyImagesAllowed"),
          variant: "destructive",
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("dashboard.profile.fileTooLarge"),
          description: t("dashboard.profile.maxFileSize"),
          variant: "destructive",
        });
        return;
      }

      setProfileImageFile(file);

      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfileImage = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
  };

  const handleDownloadInvoice = (payout: PayoutHistory) => {
    // Find the corresponding event for additional details
    const event = events.find((e) => e.id === payout.eventId);

    // Create comprehensive invoice data
    const data = {
      invoiceNumber: `INV-${payout.transactionId}`,
      date: payout.date,
      dueDate: new Date(
        new Date(payout.date).getTime() + 30 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0], // 30 days from date
      eventTitle: payout.eventTitle,
      eventDate: event?.date || payout.date,
      eventLocation: event?.location || "N/A",
      organizerName: profileData.legalBusinessName,
      organizerEmail: "contact@eventpro.com",
      organizerPhone: profileData.contactMobile,
      organizerAddress: "123 Business Street, Cairo, Egypt",
      transactionId: payout.transactionId,
      amount: payout.amount,
      status: payout.status,
      description: payout.description,
      items: [
        {
          description: t("invoice.item_1", "Premium Event Access"),
          quantity: 1,
          unitPrice: payout.amount * 0.85, // 85% of total
          total: payout.amount * 0.85,
        },
        {
          description: t("invoice.item_2", "Service Fee"),
          quantity: 1,
          unitPrice: payout.amount * 0.15, // 15% service fee
          total: payout.amount * 0.15,
        },
      ],
      subtotal: payout.amount * 0.85,
      tax: payout.amount * 0.15,
      total: payout.amount,
      currency: "EGP",
    };

    // Set invoice data and show modal
    setInvoiceData(data);
    setShowInvoiceModal(true);

    // Show toast notification
    toast({
      title: t("dashboard.payout.invoiceDownload"),
      description: `${t("dashboard.payout.invoiceDownloadDesc")} ${
        payout.transactionId
      }`,
    });
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
    setChangePasswordStep("current");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePasswordOtp("");
    setChangePasswordError("");
    setChangePasswordSuccess("");
  };

  const handleCurrentPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");

    if (!currentPassword) {
      setChangePasswordError(t("auth.password_required"));
      return;
    }

    // Mock current password validation (in real app, this would verify against stored password)
    if (currentPassword === "password123") {
      setChangePasswordStep("otp");
      setChangePasswordSuccess(t("auth.otp_sent"));
    } else {
      setChangePasswordError("Password is incorrect");
    }
  };

  const handleChangePasswordOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");

    if (changePasswordOtp === MOCK_OTP) {
      setChangePasswordStep("new");
      setChangePasswordOtp("");
    } else {
      setChangePasswordError(t("organizer.login.error.invalidOtp"));
    }
  };

  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");

    if (!newPassword || !confirmNewPassword) {
      setChangePasswordError(t("auth.password_required"));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError(t("auth.errors.confirm_password_mismatch"));
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError(t("auth.errors.password_min"));
      return;
    }

    if (newPassword === currentPassword) {
      setChangePasswordError(
        "New password must be different from current password"
      );
      return;
    }

    setChangePasswordSuccess(t("auth.password_reset_success"));
    setTimeout(() => {
      setShowChangePassword(false);
      setChangePasswordStep("current");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setChangePasswordOtp("");
      setChangePasswordError("");
      setChangePasswordSuccess("");
    }, 2000);
  };

  const handleCancelChangePassword = () => {
    setShowChangePassword(false);
    setChangePasswordStep("current");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePasswordOtp("");
    setChangePasswordError("");
    setChangePasswordSuccess("");
  };

  // Mock data - replace with API calls
  const events: Event[] = [
    {
      id: "1",
      title:
        i18nInstance.language === "ar"
          ? "مهرجان الموسيقى الصيفي"
          : "Summer Music Festival",
      date: "2025-08-15",
      time: "18:00",
      location:
        i18nInstance.language === "ar"
          ? "مركز السويس الثقافي، الزمالك"
          : "El Sawy Culturewheel, Zamalek",
      status: "upcoming",
      imageUrl: "/public/event1.jpg",
      totalTickets: 500,
      ticketsSold: 470,
      ticketsAvailable: 30,
      peopleAdmitted: 450,
      peopleRemaining: 20,
      totalPayoutPending: 117750,
      totalPayoutPaid: 100000,
      ticketCategories: [
        {
          name: i18nInstance.language === "ar" ? "VIP" : "VIP",
          price: 500,
          totalTickets: 50,
          ticketsSold: 48,
          ticketsAvailable: 2,
        },
        {
          name: i18nInstance.language === "ar" ? "عادي" : "Regular",
          price: 250,
          totalTickets: 400,
          ticketsSold: 372,
          ticketsAvailable: 28,
        },
        {
          name: i18nInstance.language === "ar" ? "طالب" : "Student",
          price: 150,
          totalTickets: 50,
          ticketsSold: 50,
          ticketsAvailable: 0,
        },
      ],
    },
    {
      id: "2",
      title:
        i18nInstance.language === "ar"
          ? "ملتقى المبتكرين التقنيين"
          : "Tech Innovators Meetup",
      date: "2025-09-01",
      time: "10:00",
      location:
        i18nInstance.language === "ar"
          ? "الحرم اليوناني، وسط البلد"
          : "Greek Campus, Downtown Cairo",
      status: "upcoming",
      imageUrl: "/public/event2.jpg",
      totalTickets: 200,
      ticketsSold: 150,
      ticketsAvailable: 50,
      peopleAdmitted: 0,
      peopleRemaining: 150,
      totalPayoutPending: 30000,
      totalPayoutPaid: 0,
      ticketCategories: [
        {
          name: i18nInstance.language === "ar" ? "الطائر المبكر" : "Early Bird",
          price: 200,
          totalTickets: 100,
          ticketsSold: 80,
          ticketsAvailable: 20,
        },
        {
          name: i18nInstance.language === "ar" ? "عادي" : "Regular",
          price: 300,
          totalTickets: 100,
          ticketsSold: 70,
          ticketsAvailable: 30,
        },
      ],
    },
    {
      id: "3",
      title:
        i18nInstance.language === "ar"
          ? "ليلة الكوميديا"
          : "Stand-up Comedy Night",
      date: "2025-08-22",
      time: "20:30",
      location:
        i18nInstance.language === "ar"
          ? "مساحة روم آرت، القاهرة الجديدة"
          : "Room Art Space, New Cairo",
      status: "ongoing",
      imageUrl: "/public/event3.jpg",
      totalTickets: 150,
      ticketsSold: 120,
      ticketsAvailable: 30,
      peopleAdmitted: 100,
      peopleRemaining: 20,
      totalPayoutPending: 5000,
      totalPayoutPaid: 25000,
      ticketCategories: [
        {
          name: i18nInstance.language === "ar" ? "عام" : "General",
          price: 150,
          totalTickets: 150,
          ticketsSold: 120,
          ticketsAvailable: 30,
        },
      ],
    },
    {
      id: "4",
      title:
        i18nInstance.language === "ar"
          ? "معرض الفن الحديث"
          : "Modern Art Exhibition",
      date: "2025-07-10",
      time: "16:00",
      location:
        i18nInstance.language === "ar"
          ? "دار الأوبرا المصرية"
          : "Cairo Opera House",
      status: "completed",
      imageUrl: "/public/event4.jpg",
      totalTickets: 300,
      ticketsSold: 280,
      ticketsAvailable: 20,
      peopleAdmitted: 275,
      peopleRemaining: 5,
      totalPayoutPending: 0,
      totalPayoutPaid: 70000,
      ticketCategories: [
        {
          name: i18nInstance.language === "ar" ? "بالغ" : "Adult",
          price: 200,
          totalTickets: 200,
          ticketsSold: 185,
          ticketsAvailable: 15,
        },
        {
          name: i18nInstance.language === "ar" ? "طالب" : "Student",
          price: 100,
          totalTickets: 100,
          ticketsSold: 95,
          ticketsAvailable: 5,
        },
      ],
    },
  ];

  // Set the most recent event as default when component mounts
  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      // Sort events by date (most recent first) and select the first one
      const sortedEvents = [...events].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setSelectedEvent(sortedEvents[0]);
    }
  }, [events, selectedEvent]);

  // Auto-select most recent event when switching to analytics tab
  useEffect(() => {
    if (activeTab === "analytics" && events.length > 0 && !selectedEvent) {
      const sortedEvents = [...events].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setSelectedEvent(sortedEvents[0]);
    }
  }, [activeTab, events, selectedEvent]);

  // Mock payout history data
  const payoutHistory: PayoutHistory[] = [
    {
      id: "1",
      transactionId: "TRX-001",
      eventId: "1",
      eventTitle: "Summer Music Festival",
      amount: 100000,
      date: "2025-08-15",
      status: "completed",
      invoiceUrl: "/public/invoice1.pdf",
      description: "Payout for tickets sold on 2025-08-15",
    },
    {
      id: "2",
      transactionId: "TRX-002",
      eventId: "2",
      eventTitle: "Tech Innovators Meetup",
      amount: 30000,
      date: "2025-09-01",
      status: "pending",
      invoiceUrl: "",
      description: "Pending payout for tickets sold on 2025-09-01",
    },
    {
      id: "3",
      transactionId: "TRX-003",
      eventId: "3",
      eventTitle: "Stand-up Comedy Night",
      amount: 25000,
      date: "2025-08-22",
      status: "completed",
      invoiceUrl: "/public/invoice2.pdf",
      description: "Payout for tickets sold on 2025-08-22",
    },
    {
      id: "4",
      transactionId: "TRX-004",
      eventId: "4",
      eventTitle: "Modern Art Exhibition",
      amount: 70000,
      date: "2025-07-10",
      status: "completed",
      invoiceUrl: "/public/invoice3.pdf",
      description: "Payout for tickets sold on 2025-07-10",
    },
  ];

  // Calculate dashboard statistics
  const dashboardStats: DashboardStats = useMemo(() => {
    return events.reduce(
      (stats, event) => ({
        totalEvents: stats.totalEvents + 1,
        runningEvents:
          stats.runningEvents + (event.status === "ongoing" ? 1 : 0),
        completedEvents:
          stats.completedEvents + (event.status === "completed" ? 1 : 0),
        availableTickets: stats.availableTickets + event.ticketsAvailable,
        totalTicketsSold: stats.totalTicketsSold + event.ticketsSold,
        totalAttendees: stats.totalAttendees + event.peopleAdmitted,
        totalRevenues:
          stats.totalRevenues +
          (event.ticketsSold * event.ticketCategories[0]?.price || 0),
        netRevenues:
          stats.netRevenues +
          (event.totalPayoutPaid + event.totalPayoutPending),
        totalProcessedPayouts:
          stats.totalProcessedPayouts + event.totalPayoutPaid,
        totalPendingPayouts:
          stats.totalPendingPayouts + event.totalPayoutPending,
      }),
      {
        totalEvents: 0,
        runningEvents: 0,
        completedEvents: 0,
        availableTickets: 0,
        totalTicketsSold: 0,
        totalAttendees: 0,
        totalRevenues: 0,
        netRevenues: 0,
        totalProcessedPayouts: 0,
        totalPendingPayouts: 0,
      }
    );
  }, [events]);

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || event.status === statusFilter;
      const matchesLocation =
        locationFilter === "all" || event.location.includes(locationFilter);
      const matchesDate =
        dateFilter === "all" || event.date.includes(dateFilter);

      return matchesSearch && matchesStatus && matchesLocation && matchesDate;
    });
  }, [events, searchTerm, statusFilter, locationFilter, dateFilter]);

  // Get unique locations and dates for filters
  const uniqueLocations = useMemo(() => {
    const locations = events.map((event) => {
      const locationParts = event.location.split(",");
      return locationParts[0].trim();
    });
    return [...new Set(locations)];
  }, [events]);

  const uniqueDates = useMemo(() => {
    const dates = events.map((event) =>
      format(parseISO(event.date), "yyyy-MM")
    );
    return [...new Set(dates)];
  }, [events]);

  // Filter payout history based on search and filters
  const filteredPayoutHistory = useMemo(() => {
    return payoutHistory.filter((payout) => {
      const matchesSearch =
        payout.eventTitle
          .toLowerCase()
          .includes(payoutSearchTerm.toLowerCase()) ||
        payout.transactionId
          .toLowerCase()
          .includes(payoutSearchTerm.toLowerCase()) ||
        payout.description
          .toLowerCase()
          .includes(payoutSearchTerm.toLowerCase());
      const matchesStatus =
        payoutStatusFilter === "all" || payout.status === payoutStatusFilter;
      const matchesDate =
        payoutDateFilter === "all" || payout.date.includes(payoutDateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [payoutHistory, payoutSearchTerm, payoutStatusFilter, payoutDateFilter]);

  // Get unique payout dates for filters
  const uniquePayoutDates = useMemo(() => {
    const dates = payoutHistory.map((payout) =>
      format(parseISO(payout.date), "yyyy-MM")
    );
    return [...new Set(dates)];
  }, [payoutHistory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "upcoming":
        return t("dashboard.status.upcoming");
      case "ongoing":
        return t("dashboard.status.ongoing");
      case "completed":
        return t("dashboard.status.completed");
      case "cancelled":
        return t("dashboard.status.cancelled");
      default:
        return status;
    }
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPayoutStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("dashboard.payout.status.completed");
      case "pending":
        return t("dashboard.payout.status.pending");
      case "failed":
        return t("dashboard.payout.status.failed");
      default:
        return status;
    }
  };

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
                <Sun className="h-4 w-4" />
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalEvents")}
                </CardTitle>
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {dashboardStats.totalEvents}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.runningEvents")}
                </CardTitle>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {dashboardStats.runningEvents}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.completedEvents")}
                </CardTitle>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {dashboardStats.completedEvents}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.availableTickets")}
                </CardTitle>
              </div>
              <Ticket className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {dashboardStats.availableTickets.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalTicketsSold")}
                </CardTitle>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {dashboardStats.totalTicketsSold.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalAttendees")}
                </CardTitle>
              </div>
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {dashboardStats.totalAttendees.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalRevenues")}
                </CardTitle>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                E£ {dashboardStats.totalRevenues.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.netRevenues")}
                </CardTitle>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                E£ {dashboardStats.netRevenues.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalProcessedPayouts")}
                </CardTitle>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                E£ {dashboardStats.totalProcessedPayouts.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalPendingPayouts")}
                </CardTitle>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                E£ {dashboardStats.totalPendingPayouts.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div ref={tabsContentRef}>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            defaultValue="events"
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="events">
                {t("dashboard.tabs.events")}
              </TabsTrigger>
              <TabsTrigger value="analytics">
                {t("dashboard.tabs.analytics")}
              </TabsTrigger>
              <TabsTrigger value="payouts">
                {t("dashboard.tabs.payouts")}
              </TabsTrigger>
              <TabsTrigger value="profile">
                {t("dashboard.tabs.profile")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Filter className="h-5 w-5" />
                    {t("dashboard.filters.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                      <Input
                        placeholder={t("dashboard.filters.searchPlaceholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rtl:pl-0 rtl:pr-10"
                      />
                    </div>

                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.filters.status")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.filters.allStatus")}
                        </SelectItem>
                        <SelectItem value="upcoming">
                          {t("dashboard.filters.upcoming")}
                        </SelectItem>
                        <SelectItem value="ongoing">
                          {t("dashboard.filters.ongoing")}
                        </SelectItem>
                        <SelectItem value="completed">
                          {t("dashboard.filters.completed")}
                        </SelectItem>
                        <SelectItem value="cancelled">
                          {t("dashboard.filters.cancelled")}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={locationFilter}
                      onValueChange={setLocationFilter}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.filters.location")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.filters.allLocations")}
                        </SelectItem>
                        {uniqueLocations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.filters.date")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.filters.allDates")}
                        </SelectItem>
                        {uniqueDates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {format(parseISO(date + "-01"), "MMMM yyyy")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Events Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      setSelectedEvent(event);
                      setActiveTab("analytics");
                    }}
                  >
                    <div className="relative">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <Badge
                        className={`absolute top-2 right-2 rtl:right-auto rtl:left-2 ${getStatusColor(
                          event.status
                        )}`}
                      >
                        {getStatusText(event.status)}
                      </Badge>
                    </div>

                    <CardHeader>
                      <CardTitle className="text-lg rtl:text-right">
                        {event.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 rtl:flex-row-reverse">
                        <Calendar className="h-4 w-4" />
                        {i18nInstance.language === "ar"
                          ? `${format(
                              parseISO(event.date),
                              "dd MMM yyyy"
                            )} في ${event.time}`
                          : `${format(
                              parseISO(event.date),
                              "MMM dd, yyyy"
                            )} at ${event.time}`}
                      </CardDescription>
                      <CardDescription className="flex items-center gap-2 rtl:flex-row-reverse">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-green-600">
                            {event.ticketsSold}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.ticketsSold")}
                          </p>
                        </div>
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-blue-600">
                            {event.ticketsAvailable}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.ticketsAvailable")}
                          </p>
                        </div>
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-purple-600">
                            {event.peopleAdmitted}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.peopleAdmitted")}
                          </p>
                        </div>
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-orange-600">
                            {event.peopleRemaining}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.peopleRemaining")}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm rtl:flex-row-reverse">
                          <span>{t("dashboard.event.salesProgress")}</span>
                          <span>
                            {calculatePercentage(
                              event.ticketsSold,
                              event.totalTickets
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="rtl:transform rtl:scale-x-[-1]">
                          <Progress
                            value={calculatePercentage(
                              event.ticketsSold,
                              event.totalTickets
                            )}
                          />
                        </div>
                      </div>

                      {/* Payout Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-yellow-600">
                            E£ {event.totalPayoutPending.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.pendingPayout")}
                          </p>
                        </div>
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-green-600">
                            E£ {event.totalPayoutPaid.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.paidPayout")}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/event/${event.id}`);
                        }}
                      >
                        {t("dashboard.event.viewDetails")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredEvents.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground text-lg">
                      {t("dashboard.noEvents")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {selectedEvent ? (
                <div className="space-y-6">
                  {/* Event Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between rtl:flex-row-reverse">
                        <div>
                          <CardTitle className="text-2xl">
                            {selectedEvent.title}
                          </CardTitle>
                          <CardDescription>
                            {i18nInstance.language === "ar"
                              ? `${format(
                                  parseISO(selectedEvent.date),
                                  "dd MMMM yyyy"
                                )} في ${selectedEvent.time} • ${
                                  selectedEvent.location
                                }`
                              : `${format(
                                  parseISO(selectedEvent.date),
                                  "MMMM dd, yyyy"
                                )} at ${selectedEvent.time} • ${
                                  selectedEvent.location
                                }`}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(selectedEvent.status)}>
                          {getStatusText(selectedEvent.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Detailed Analytics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Ticket Categories */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                          <Ticket className="h-5 w-5" />
                          {t("dashboard.analytics.ticketCategories")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedEvent.ticketCategories.map(
                          (category, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-center rtl:flex-row-reverse">
                                <span className="font-medium">
                                  {category.name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  E£ {category.price}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground rtl:flex-row-reverse">
                                <span>
                                  {t("dashboard.analytics.sold")}:{" "}
                                  {category.ticketsSold}
                                </span>
                                <span>
                                  {t("dashboard.analytics.available")}:{" "}
                                  {category.ticketsAvailable}
                                </span>
                              </div>
                              <div className="rtl:transform rtl:scale-x-[-1]">
                                <Progress
                                  value={calculatePercentage(
                                    category.ticketsSold,
                                    category.totalTickets
                                  )}
                                />
                              </div>
                            </div>
                          )
                        )}
                      </CardContent>
                    </Card>

                    {/* Overall Statistics */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                          <BarChart3 className="h-5 w-5" />
                          {t("dashboard.analytics.overallStats")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-green-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-green-600">
                              {selectedEvent.ticketsSold}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.totalSold")}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-blue-600">
                              {selectedEvent.ticketsAvailable}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.totalAvailable")}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-purple-600">
                              {selectedEvent.peopleAdmitted}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.totalAdmitted")}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-orange-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-orange-600">
                              {selectedEvent.peopleRemaining}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.totalRemaining")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Payout Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                          <DollarSign className="h-5 w-5" />
                          {t("dashboard.analytics.payoutInfo")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-yellow-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-yellow-600">
                              E£{" "}
                              {selectedEvent.totalPayoutPending.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.pendingPayout")}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-green-600">
                              E£{" "}
                              {selectedEvent.totalPayoutPaid.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.paidPayout")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sales Progress */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                          <TrendingUp className="h-5 w-5" />
                          {t("dashboard.analytics.salesProgress")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm rtl:flex-row-reverse">
                            <span>
                              {t("dashboard.analytics.soldPercentage")}
                            </span>
                            <span>
                              {calculatePercentage(
                                selectedEvent.ticketsSold,
                                selectedEvent.totalTickets
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                          <div className="rtl:transform rtl:scale-x-[-1]">
                            <Progress
                              value={calculatePercentage(
                                selectedEvent.ticketsSold,
                                selectedEvent.totalTickets
                              )}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm rtl:flex-row-reverse">
                            <span>
                              {t("dashboard.analytics.remainingPercentage")}
                            </span>
                            <span>
                              {calculatePercentage(
                                selectedEvent.ticketsAvailable,
                                selectedEvent.totalTickets
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                          <div className="rtl:transform rtl:scale-x-[-1]">
                            <Progress
                              value={calculatePercentage(
                                selectedEvent.ticketsAvailable,
                                selectedEvent.totalTickets
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedEvent(null);
                      setActiveTab("events");
                    }}
                    className="w-full"
                  >
                    {t("dashboard.analytics.backToEvents")}
                  </Button>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">
                      {t("dashboard.analytics.selectEvent")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payouts" className="space-y-6">
              {/* Payout History Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Receipt className="h-5 w-5" />
                    {t("dashboard.payout.title")}
                  </CardTitle>
                  <CardDescription className="rtl:text-right">
                    {t("dashboard.payout.subtitle")}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Payout Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Filter className="h-5 w-5" />
                    {t("dashboard.payout.filters.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                      <Input
                        placeholder={t(
                          "dashboard.payout.filters.searchPlaceholder"
                        )}
                        value={payoutSearchTerm}
                        onChange={(e) => setPayoutSearchTerm(e.target.value)}
                        className="pl-10 rtl:pl-0 rtl:pr-10"
                      />
                    </div>

                    <Select
                      value={payoutStatusFilter}
                      onValueChange={setPayoutStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.payout.filters.status")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.payout.filters.allStatus")}
                        </SelectItem>
                        <SelectItem value="completed">
                          {t("dashboard.payout.filters.completed")}
                        </SelectItem>
                        <SelectItem value="pending">
                          {t("dashboard.payout.filters.pending")}
                        </SelectItem>
                        <SelectItem value="failed">
                          {t("dashboard.payout.filters.failed")}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={payoutDateFilter}
                      onValueChange={setPayoutDateFilter}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.payout.filters.date")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.payout.filters.allDates")}
                        </SelectItem>
                        {uniquePayoutDates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {format(parseISO(date + "-01"), "MMMM yyyy")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Payout History Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <FileText className="h-5 w-5" />
                    {t("dashboard.payout.history.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.transactionId")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.event")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.amount")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.date")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.status")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.invoice")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayoutHistory.map((payout) => (
                          <tr
                            key={payout.id}
                            className="border-b hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm">
                                {payout.transactionId}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="rtl:text-right">
                                <p className="font-medium">
                                  {payout.eventTitle}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {payout.description}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4 rtl:text-right">
                              <span className="font-semibold text-green-600">
                                E£ {payout.amount.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-4 rtl:text-right">
                              <span className="text-sm">
                                {i18nInstance.language === "ar"
                                  ? format(parseISO(payout.date), "dd MMM yyyy")
                                  : format(
                                      parseISO(payout.date),
                                      "MMM dd, yyyy"
                                    )}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                className={getPayoutStatusColor(payout.status)}
                              >
                                {getPayoutStatusText(payout.status)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadInvoice(payout)}
                                className="flex items-center gap-2 rtl:flex-row-reverse"
                              >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {t("dashboard.payout.history.download")}
                                </span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredPayoutHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg">
                        {t("dashboard.payout.history.noPayouts")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payout Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <BarChart3 className="h-5 w-5" />
                    {t("dashboard.payout.summary.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg rtl:text-right">
                      <p className="text-2xl font-bold text-green-600">
                        E£{" "}
                        {payoutHistory
                          .filter((p) => p.status === "completed")
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.payout.summary.totalCompleted")}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg rtl:text-right">
                      <p className="text-2xl font-bold text-yellow-600">
                        E£{" "}
                        {payoutHistory
                          .filter((p) => p.status === "pending")
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.payout.summary.totalPending")}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg rtl:text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {payoutHistory.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.payout.summary.totalTransactions")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between rtl:flex-row-reverse">
                    <div className="rtl:text-right">
                      <CardTitle className="text-2xl">
                        {t("dashboard.profile.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.profile.subtitle")}
                      </CardDescription>
                    </div>
                    {!isEditingProfile && (
                      <Button onClick={handleEditProfile}>
                        {t("dashboard.profile.editButton")}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Image Section */}
                  <div className="space-y-4">
                    <div
                      style={{
                        textAlign:
                          i18nInstance.language === "ar" ? "right" : "left",
                      }}
                    >
                      <label className="text-sm font-medium">
                        {t("dashboard.profile.profileImage")}
                      </label>
                    </div>

                    <div className="flex items-center gap-6 rtl:flex-row-reverse">
                      {/* Current Profile Image */}
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border">
                          <img
                            src={
                              profileImagePreview || profileData.profileImage
                            }
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "/placeholderLogo.png";
                            }}
                          />
                        </div>
                        {isEditingProfile && profileImageFile && (
                          <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            <span className="text-xs">✓</span>
                          </div>
                        )}
                        {isEditingProfile && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className={`absolute h-6 w-6 ${
                              profileImageFile
                                ? "-top-2 -left-2"
                                : "-top-2 -right-2"
                            }`}
                            onClick={removeProfileImage}
                            disabled={!profileImageFile}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Upload Section */}
                      {isEditingProfile && (
                        <div className="flex-1">
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                            {profileImageFile ? (
                              <>
                                <div className="text-green-600 mb-2">
                                  <span className="text-sm font-medium">
                                    ✓ {t("dashboard.profile.imageSelected")}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">
                                  {profileImageFile.name}
                                </p>
                              </>
                            ) : (
                              <>
                                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mb-2">
                                  {t("dashboard.profile.dragDropOrClick")}
                                </p>
                                <p className="text-xs text-muted-foreground mb-4">
                                  {t("dashboard.profile.supportedFormats")}
                                </p>
                              </>
                            )}
                            <Input
                              id="profileImage"
                              type="file"
                              accept="image/*"
                              onChange={handleProfileImageChange}
                              className="hidden"
                            />
                            <div className="rtl:flex rtl:justify-end">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  document
                                    .getElementById("profileImage")
                                    ?.click()
                                }
                                className="flex items-center gap-2 rtl:flex-row-reverse"
                              >
                                <Upload className="h-4 w-4" />
                                {profileImageFile
                                  ? t("dashboard.profile.changeImage")
                                  : t("dashboard.profile.chooseImage")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tax ID */}
                    <div className="space-y-2">
                      <div
                        style={{
                          textAlign:
                            i18nInstance.language === "ar" ? "right" : "left",
                        }}
                      >
                        <label className="text-sm font-medium">
                          {t("dashboard.profile.taxId")}
                        </label>
                      </div>
                      {isEditingProfile ? (
                        <Input
                          value={profileData.taxId}
                          onChange={(e) =>
                            handleProfileDataChange("taxId", e.target.value)
                          }
                          className="rtl:text-right rtl:placeholder:text-right"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground rtl:text-right">
                          {profileData.taxId}
                        </p>
                      )}
                    </div>

                    {/* Commercial Registration */}
                    <div className="space-y-2">
                      <div
                        style={{
                          textAlign:
                            i18nInstance.language === "ar" ? "right" : "left",
                        }}
                      >
                        <label className="text-sm font-medium">
                          {t("dashboard.profile.commercialRegistration")}
                        </label>
                      </div>
                      {isEditingProfile ? (
                        <Input
                          value={profileData.commercialRegistration}
                          onChange={(e) =>
                            handleProfileDataChange(
                              "commercialRegistration",
                              e.target.value
                            )
                          }
                          className="rtl:text-right rtl:placeholder:text-right"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground rtl:text-right">
                          {profileData.commercialRegistration}
                        </p>
                      )}
                    </div>

                    {/* Legal Business Name */}
                    <div className="space-y-2">
                      <div
                        style={{
                          textAlign:
                            i18nInstance.language === "ar" ? "right" : "left",
                        }}
                      >
                        <label className="text-sm font-medium">
                          {t("dashboard.profile.legalBusinessName")}
                        </label>
                      </div>
                      {isEditingProfile ? (
                        <Input
                          value={profileData.legalBusinessName}
                          onChange={(e) =>
                            handleProfileDataChange(
                              "legalBusinessName",
                              e.target.value
                            )
                          }
                          className="rtl:text-right rtl:placeholder:text-right"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground rtl:text-right">
                          {profileData.legalBusinessName}
                        </p>
                      )}
                    </div>

                    {/* Trade Name */}
                    <div className="space-y-2">
                      <div
                        style={{
                          textAlign:
                            i18nInstance.language === "ar" ? "right" : "left",
                        }}
                      >
                        <label className="text-sm font-medium">
                          {t("dashboard.profile.tradeName")}
                        </label>
                      </div>
                      {isEditingProfile ? (
                        <Input
                          value={profileData.tradeName}
                          onChange={(e) =>
                            handleProfileDataChange("tradeName", e.target.value)
                          }
                          className="rtl:text-right rtl:placeholder:text-right"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground rtl:text-right">
                          {profileData.tradeName}
                        </p>
                      )}
                    </div>

                    {/* Contact Mobile */}
                    <div className="space-y-2">
                      <div
                        style={{
                          textAlign:
                            i18nInstance.language === "ar" ? "right" : "left",
                        }}
                      >
                        <label className="text-sm font-medium">
                          {t("dashboard.profile.contactMobile")}
                        </label>
                      </div>
                      {isEditingProfile ? (
                        <Input
                          value={profileData.contactMobile}
                          onChange={(e) =>
                            handleProfileDataChange(
                              "contactMobile",
                              e.target.value
                            )
                          }
                          className="rtl:text-right rtl:placeholder:text-right"
                          dir={i18nInstance.language === "ar" ? "ltr" : "ltr"}
                        />
                      ) : (
                        <p
                          className="text-sm text-muted-foreground rtl:text-right"
                          dir={i18nInstance.language === "ar" ? "ltr" : "ltr"}
                        >
                          {profileData.contactMobile}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* About Section */}
                  <div className="space-y-2">
                    <div
                      style={{
                        textAlign:
                          i18nInstance.language === "ar" ? "right" : "left",
                      }}
                    >
                      <label className="text-sm font-medium">
                        {t("dashboard.profile.about")}
                      </label>
                    </div>
                    {isEditingProfile ? (
                      <textarea
                        value={profileData.about}
                        onChange={(e) =>
                          handleProfileDataChange("about", e.target.value)
                        }
                        className="w-full min-h-[100px] p-3 border border-input rounded-md bg-background text-foreground rtl:text-right rtl:placeholder:text-right"
                        placeholder={t("dashboard.profile.aboutPlaceholder")}
                        dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground rtl:text-right">
                        {profileData.about}
                      </p>
                    )}
                  </div>

                  {/* Change Password Section */}
                  <div className="space-y-4">
                    <Separator />
                    <div className="flex items-center justify-between rtl:flex-row-reverse">
                      <div className="rtl:text-right">
                        <h3 className="text-lg font-semibold">
                          {t("profilepage.settingsTab.changePassword")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Update your account password securely
                        </p>
                      </div>
                      {!showChangePassword && (
                        <Button
                          variant="outline"
                          onClick={handleChangePassword}
                          className="flex items-center gap-2 rtl:flex-row-reverse"
                        >
                          <Lock className="h-4 w-4" />
                          {t("profilepage.settingsTab.changePassword")}
                        </Button>
                      )}
                    </div>

                    {showChangePassword && (
                      <Card className="border-2 border-blue-200 bg-blue-50/50">
                        <CardContent className="p-6 space-y-4">
                          {changePasswordStep === "current" && (
                            <form
                              onSubmit={handleCurrentPasswordSubmit}
                              className="space-y-4"
                            >
                              <div className="text-center mb-4">
                                <h4 className="text-lg font-medium mb-2">
                                  {t("profilepage.settingsTab.changePassword")}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Enter your current password to continue
                                </p>
                              </div>
                              <Input
                                type="password"
                                placeholder={t(
                                  "profilepage.settingsTab.oldPasswordPlaceholder"
                                )}
                                value={currentPassword}
                                onChange={(e) =>
                                  setCurrentPassword(e.target.value)
                                }
                                required
                                className={
                                  i18nInstance.language === "ar"
                                    ? "text-right"
                                    : ""
                                }
                                dir={
                                  i18nInstance.language === "ar" ? "rtl" : "ltr"
                                }
                              />
                              {changePasswordError && (
                                <div className="text-red-500 text-sm">
                                  {changePasswordError}
                                </div>
                              )}
                              <div className="flex gap-4 rtl:flex-row-reverse">
                                <Button type="submit" className="flex-1">
                                  Continue
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleCancelChangePassword}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          )}

                          {changePasswordStep === "otp" && (
                            <form
                              onSubmit={handleChangePasswordOtp}
                              className="space-y-4"
                            >
                              <div className="text-center mb-4">
                                <h4 className="text-lg font-medium mb-2">
                                  Verify Your Identity
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Enter the OTP sent to your mobile number
                                </p>
                              </div>
                              <OtpInput
                                value={changePasswordOtp}
                                onChange={setChangePasswordOtp}
                                length={6}
                                autoFocus={true}
                                language={i18nInstance.language}
                              />
                              {changePasswordError && (
                                <div className="text-red-500 text-sm text-center">
                                  {changePasswordError}
                                </div>
                              )}
                              {changePasswordSuccess && (
                                <div className="text-green-500 text-sm text-center">
                                  {changePasswordSuccess}
                                </div>
                              )}
                              <div className="flex gap-4 rtl:flex-row-reverse">
                                <Button type="submit" className="flex-1">
                                  Verify OTP
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleCancelChangePassword}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          )}

                          {changePasswordStep === "new" && (
                            <form
                              onSubmit={handleNewPasswordSubmit}
                              className="space-y-4"
                            >
                              <div className="text-center mb-4">
                                <h4 className="text-lg font-medium mb-2">
                                  Set New Password
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Enter your new password
                                </p>
                              </div>
                              <Input
                                type="password"
                                placeholder={t(
                                  "auth.placeholders.new_password"
                                )}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className={
                                  i18nInstance.language === "ar"
                                    ? "text-right"
                                    : ""
                                }
                                dir={
                                  i18nInstance.language === "ar" ? "rtl" : "ltr"
                                }
                              />
                              <Input
                                type="password"
                                placeholder={t(
                                  "auth.placeholders.confirm_new_password"
                                )}
                                value={confirmNewPassword}
                                onChange={(e) =>
                                  setConfirmNewPassword(e.target.value)
                                }
                                required
                                className={
                                  i18nInstance.language === "ar"
                                    ? "text-right"
                                    : ""
                                }
                                dir={
                                  i18nInstance.language === "ar" ? "rtl" : "ltr"
                                }
                              />
                              {changePasswordError && (
                                <div className="text-red-500 text-sm">
                                  {changePasswordError}
                                </div>
                              )}
                              {changePasswordSuccess && (
                                <div className="text-green-500 text-sm">
                                  {changePasswordSuccess}
                                </div>
                              )}
                              <div className="flex gap-4 rtl:flex-row-reverse">
                                <Button type="submit" className="flex-1">
                                  Update Password
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleCancelChangePassword}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isEditingProfile && (
                    <div className="flex gap-4 rtl:flex-row-reverse">
                      <Button onClick={handleRequestChanges}>
                        {t("dashboard.profile.requestChanges")}
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        {t("dashboard.profile.cancel")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Invoice Modal */}
      {showInvoiceModal && invoiceData && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          data={invoiceData}
        />
      )}
    </div>
  );
};

export default OrganizerDashboard;
