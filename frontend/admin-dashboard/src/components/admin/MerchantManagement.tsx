import React, { useState, useMemo, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  ResponsivePagination,
} from "@/components/ui/pagination";
import {
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  MoreHorizontal,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  CreditCard,
  Ticket,
  MapPin,
  Star,
  StarOff,
  Repeat,
  Activity,
  Ban,
  Tag,
  Tags,
  Crown,
  Award,
  Shield,
  Heart,
  Zap,
  Building2,
  Wallet,
  Banknote,
  Receipt,
  Settings,
  Key,
  Globe,
  FileText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  formatNumberForLocale,
  formatCurrencyForLocale,
  formatPhoneNumberForLocale,
} from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";

type MerchantAccount = {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "suspended" | "pending";
  registrationDate: string;
  lastLogin: string;
  totalEvents: number;
  totalRevenue: number;
  commissionRate: number;
  payoutBalance: number;
  location: string;
  businessType: string;
  taxId: string;
  bankAccount: string;
  profileImage?: string;
  verificationStatus: "verified" | "pending" | "rejected";
  documents: string[];
};

type MerchantEvent = {
  id: string;
  eventTitle: string;
  date: string;
  revenue: number;
  commission: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
};

type MerchantTransaction = {
  id: string;
  type: "payout" | "commission" | "refund" | "adjustment";
  description: string;
  amount: number;
  timestamp: string;
  status: "pending" | "completed" | "failed";
};

const MerchantAccountsManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [selectedMerchant, setSelectedMerchant] =
    useState<MerchantAccount | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showMerchantDetails, setShowMerchantDetails] = useState(false);
  const [showEventsDialog, setShowEventsDialog] = useState(false);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);
  const [showTransferCardsDialog, setShowTransferCardsDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state for card transfer
  const [transferCardsForm, setTransferCardsForm] = useState({
    serialStart: "",
    serialEnd: "",
    selectedMerchantId: "",
  });

  // Get current locale for date formatting
  const currentLocale = i18n.language === "ar" ? ar : enUS;

  // Format date for current locale
  const formatDateForLocale = (
    dateString: string,
    formatString: string = "MMM dd, yyyy"
  ) => {
    try {
      return format(parseISO(dateString), formatString, {
        locale: currentLocale,
      });
    } catch (error) {
      return dateString;
    }
  };

  // Format number for current locale
  const formatNumber = (number: number) => {
    return formatNumberForLocale(number, i18n.language);
  };

  // Format currency for current locale
  const formatCurrency = (amount: number) => {
    return formatCurrencyForLocale(amount, i18n.language);
  };

  // Format phone number for current locale
  const formatPhone = (phoneNumber: string) => {
    return formatPhoneNumberForLocale(phoneNumber, i18n.language);
  };

  // Mock merchant accounts data
  const [merchants, setMerchants] = useState<MerchantAccount[]>([
    {
      id: "M001",
      businessName: "Cairo Events Co.",
      ownerName: "Ahmed Hassan",
      email: "ahmed@cairoevents.com",
      phone: "+20 10 1234 5678",
      status: "active",
      registrationDate: "2024-01-15",
      lastLogin: "2025-08-16T10:30:00",
      totalEvents: 25,
      totalRevenue: 150000,
      commissionRate: 15,
      payoutBalance: 12500,
      location: "Cairo, Egypt",
      businessType: "Event Management",
      taxId: "TAX-001-2024",
      bankAccount: "EG123456789012345678901234",
      profileImage:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      verificationStatus: "verified",
      documents: ["business_license.pdf", "tax_certificate.pdf"],
    },
    {
      id: "M002",
      businessName: "Alexandria Entertainment",
      ownerName: "Sarah Mohamed",
      email: "sarah@alexentertainment.com",
      phone: "+20 10 2345 6789",
      status: "active",
      registrationDate: "2024-02-20",
      lastLogin: "2025-08-15T15:45:00",
      totalEvents: 18,
      totalRevenue: 98000,
      commissionRate: 12,
      payoutBalance: 8200,
      location: "Alexandria, Egypt",
      businessType: "Entertainment",
      taxId: "TAX-002-2024",
      bankAccount: "EG987654321098765432109876",
      profileImage:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      verificationStatus: "verified",
      documents: ["business_license.pdf", "tax_certificate.pdf"],
    },
    {
      id: "M003",
      businessName: "Giza Productions",
      ownerName: "Omar Ali",
      email: "omar@gizaproductions.com",
      phone: "+20 10 3456 7890",
      status: "pending",
      registrationDate: "2024-03-10",
      lastLogin: "2025-07-20T09:15:00",
      totalEvents: 0,
      totalRevenue: 0,
      commissionRate: 10,
      payoutBalance: 0,
      location: "Giza, Egypt",
      businessType: "Production",
      taxId: "TAX-003-2024",
      bankAccount: "EG111111111111111111111111",
      profileImage:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      verificationStatus: "pending",
      documents: ["business_license.pdf"],
    },
    {
      id: "M004",
      businessName: "Luxor Cultural Events",
      ownerName: "Fatima Ahmed",
      email: "fatima@luxorevents.com",
      phone: "+20 10 4567 8901",
      status: "suspended",
      registrationDate: "2024-04-05",
      lastLogin: "2025-06-15T14:20:00",
      totalEvents: 8,
      totalRevenue: 45000,
      commissionRate: 15,
      payoutBalance: 3200,
      location: "Luxor, Egypt",
      businessType: "Cultural Events",
      taxId: "TAX-004-2024",
      bankAccount: "EG222222222222222222222222",
      profileImage:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      verificationStatus: "rejected",
      documents: ["business_license.pdf"],
    },
    {
      id: "M005",
      businessName: "Aswan Music Festival",
      ownerName: "Youssef Ibrahim",
      email: "youssef@aswanmusic.com",
      phone: "+20 10 5678 9012",
      status: "active",
      registrationDate: "2024-05-12",
      lastLogin: "2025-08-16T11:00:00",
      totalEvents: 12,
      totalRevenue: 75000,
      commissionRate: 18,
      payoutBalance: 5800,
      location: "Aswan, Egypt",
      businessType: "Music Festival",
      taxId: "TAX-005-2024",
      bankAccount: "EG333333333333333333333333",
      profileImage:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      verificationStatus: "verified",
      documents: [
        "business_license.pdf",
        "tax_certificate.pdf",
        "music_license.pdf",
      ],
    },
    {
      id: "M006",
      businessName: "BTECH",
      ownerName: "Mohamed Ali",
      email: "mohamed@btech.com",
      phone: "+20 10 6789 0123",
      status: "active",
      registrationDate: "2024-06-01",
      lastLogin: "2025-08-16T12:00:00",
      totalEvents: 0,
      totalRevenue: 0,
      commissionRate: 10,
      payoutBalance: 0,
      location: "Cairo, Egypt",
      businessType: "NFC Card Retailer",
      taxId: "TAX-006-2024",
      bankAccount: "EG444444444444444444444444",
      profileImage:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      verificationStatus: "verified",
      documents: [
        "business_license.pdf",
        "tax_certificate.pdf",
        "nfc_license.pdf",
      ],
    },
  ]);

  // Helper function to parse serial number and extract prefix and number
  const parseSerialNumber = (serialNumber: string) => {
    // Match patterns like CARD050, NFC-001-2025, etc.
    const match = serialNumber.match(/^([A-Za-z-]+)(\d+)(.*)$/);
    if (!match) return null;

    return {
      prefix: match[1],
      number: parseInt(match[2]),
      suffix: match[3] || "",
    };
  };

  // Helper function to generate serial numbers in range
  const generateSerialNumbersInRange = (start: string, end: string) => {
    const startParsed = parseSerialNumber(start);
    const endParsed = parseSerialNumber(end);

    if (!startParsed || !endParsed) return null;

    // Check if prefixes match
    if (
      startParsed.prefix !== endParsed.prefix ||
      startParsed.suffix !== endParsed.suffix
    ) {
      return null;
    }

    const serialNumbers: string[] = [];
    const startNum = startParsed.number;
    const endNum = endParsed.number;

    if (startNum > endNum) return null;

    for (let i = startNum; i <= endNum; i++) {
      const serialNumber = `${startParsed.prefix}${i
        .toString()
        .padStart(startParsed.number.toString().length, "0")}${
        startParsed.suffix
      }`;
      serialNumbers.push(serialNumber);
    }

    return serialNumbers;
  };

  // Helper function to validate serial range format
  const validateSerialRange = (start: string, end: string) => {
    if (!start.trim() || !end.trim()) {
      return {
        valid: false,
        error: "Both start and end serial numbers are required",
      };
    }

    const startParsed = parseSerialNumber(start);
    const endParsed = parseSerialNumber(end);

    if (!startParsed || !endParsed) {
      return { valid: false, error: "Invalid serial number format" };
    }

    if (
      startParsed.prefix !== endParsed.prefix ||
      startParsed.suffix !== endParsed.suffix
    ) {
      return {
        valid: false,
        error: "Serial numbers must have the same prefix and suffix",
      };
    }

    if (startParsed.number > endParsed.number) {
      return {
        valid: false,
        error: "Start number must be less than or equal to end number",
      };
    }

    const range = endParsed.number - startParsed.number + 1;
    if (range > 1000) {
      return { valid: false, error: "Range cannot exceed 1000 cards" };
    }

    return { valid: true, range };
  };

  // Mock merchant events
  const merchantEvents: MerchantEvent[] = [
    {
      id: "E001",
      eventTitle: "Summer Music Festival",
      date: "2025-08-15",
      revenue: 25000,
      commission: 3750,
      status: "completed",
    },
    {
      id: "E002",
      eventTitle: "Tech Innovators Meetup",
      date: "2025-09-01",
      revenue: 12000,
      commission: 1800,
      status: "upcoming",
    },
    {
      id: "E003",
      eventTitle: "Stand-up Comedy Night",
      date: "2025-08-22",
      revenue: 8000,
      commission: 1200,
      status: "upcoming",
    },
  ];

  // Mock merchant transactions
  const merchantTransactions: MerchantTransaction[] = [
    {
      id: "T001",
      type: "payout",
      description: "Monthly payout for August 2025",
      amount: 12500,
      timestamp: "2025-08-01T10:00:00",
      status: "completed",
    },
    {
      id: "T002",
      type: "commission",
      description: "Commission for Summer Music Festival",
      amount: 3750,
      timestamp: "2025-08-15T18:30:00",
      status: "completed",
    },
    {
      id: "T003",
      type: "refund",
      description: "Refund for cancelled event",
      amount: -1200,
      timestamp: "2025-08-10T14:20:00",
      status: "completed",
    },
  ];

  // Filter merchants based on search and filters
  const filteredMerchants = useMemo(() => {
    return merchants.filter((merchant) => {
      const matchesSearch =
        merchant.businessName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        merchant.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.phone.includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" || merchant.status === statusFilter;
      const matchesLocation =
        locationFilter === "all" || merchant.location.includes(locationFilter);
      const matchesVerification =
        verificationFilter === "all" ||
        merchant.verificationStatus === verificationFilter;

      return (
        matchesSearch && matchesStatus && matchesLocation && matchesVerification
      );
    });
  }, [merchants, searchTerm, statusFilter, locationFilter, verificationFilter]);

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    return [...new Set(merchants.map((merchant) => merchant.location))];
  }, [merchants]);

  // Pagination logic
  const totalPages = Math.ceil(filteredMerchants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMerchants = filteredMerchants.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter, verificationFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("admin.merchants.status.active");
      case "inactive":
        return t("admin.merchants.status.inactive");
      case "suspended":
        return t("admin.merchants.status.suspended");
      case "pending":
        return t("admin.merchants.status.pending");
      default:
        return status;
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVerificationText = (status: string) => {
    switch (status) {
      case "verified":
        return t("admin.merchants.verification.verified");
      case "pending":
        return t("admin.merchants.verification.pending");
      case "rejected":
        return t("admin.merchants.verification.rejected");
      default:
        return status;
    }
  };

  const handleEditMerchant = (merchant: MerchantAccount) => {
    setSelectedMerchant(merchant);
    setIsEditDialogOpen(true);
  };

  const handleViewMerchant = (merchant: MerchantAccount) => {
    setSelectedMerchant(merchant);
    setShowMerchantDetails(true);
  };

  const handleDeleteMerchant = (merchantId: string) => {
    toast({
      title: t("admin.merchants.toast.merchantDeleted"),
      description: t("admin.merchants.toast.merchantDeletedDesc"),
    });
  };

  const handleExportMerchants = () => {
    toast({
      title: t("admin.merchants.toast.exportSuccess"),
      description: t("admin.merchants.toast.exportSuccessDesc"),
    });
  };

  const handleSuspendMerchant = (merchantId: string) => {
    toast({
      title: t("admin.merchants.toast.merchantSuspended"),
      description: t("admin.merchants.toast.merchantSuspendedDesc"),
    });
  };

  const handleActivateMerchant = (merchantId: string) => {
    toast({
      title: t("admin.merchants.toast.merchantActivated"),
      description: t("admin.merchants.toast.merchantActivatedDesc"),
    });
  };

  const handleVerifyMerchant = (merchantId: string) => {
    toast({
      title: t("admin.merchants.toast.merchantVerified"),
      description: t("admin.merchants.toast.merchantVerifiedDesc"),
    });
  };

  const handleViewEvents = (merchantId: string) => {
    const merchant = merchants.find((m) => m.id === merchantId);
    if (merchant) {
      setSelectedMerchant(merchant);
      setShowEventsDialog(true);
    }
  };

  const handleViewTransactions = (merchantId: string) => {
    const merchant = merchants.find((m) => m.id === merchantId);
    if (merchant) {
      setSelectedMerchant(merchant);
      setShowTransactionsDialog(true);
    }
  };

  const handleAddMerchant = () => {
    toast({
      title: t("admin.merchants.toast.merchantAdded"),
      description: t("admin.merchants.toast.merchantAddedDesc"),
    });
    setIsAddDialogOpen(false);
  };

  const handleSaveMerchantChanges = () => {
    toast({
      title: t("admin.merchants.toast.merchantUpdated"),
      description: t("admin.merchants.toast.merchantUpdatedDesc"),
    });
    setIsEditDialogOpen(false);
  };

  const handleTransferCards = () => {
    // Validate the range
    const validation = validateSerialRange(
      transferCardsForm.serialStart,
      transferCardsForm.serialEnd
    );

    if (!validation.valid) {
      toast({
        title: t("admin.merchants.toast.error"),
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Check if merchant is selected
    if (!transferCardsForm.selectedMerchantId) {
      toast({
        title: t("admin.merchants.toast.error"),
        description: "Please select a merchant",
        variant: "destructive",
      });
      return;
    }

    // Generate serial numbers in range
    const serialNumbers = generateSerialNumbersInRange(
      transferCardsForm.serialStart,
      transferCardsForm.serialEnd
    );

    if (!serialNumbers) {
      toast({
        title: t("admin.merchants.toast.error"),
        description: "Failed to generate serial numbers",
        variant: "destructive",
      });
      return;
    }

    // Get selected merchant
    const selectedMerchant = merchants.find(
      (m) => m.id === transferCardsForm.selectedMerchantId
    );

    if (!selectedMerchant) {
      toast({
        title: t("admin.merchants.toast.error"),
        description: "Selected merchant not found",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically make an API call to transfer the cards
    // For now, we'll just show a success message
    toast({
      title: t("admin.merchants.toast.cardsTransferred"),
      description: t("admin.merchants.toast.cardsTransferredDesc", {
        count: serialNumbers.length,
        start: transferCardsForm.serialStart,
        end: transferCardsForm.serialEnd,
        merchant: selectedMerchant.businessName,
      }),
    });

    // Close dialog and reset form
    setShowTransferCardsDialog(false);
    setTransferCardsForm({
      serialStart: "",
      serialEnd: "",
      selectedMerchantId: "",
    });
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.merchants.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.merchants.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredMerchants}
            columns={commonColumns.merchants}
            title={t("admin.merchants.title")}
            subtitle={t("admin.merchants.subtitle")}
            filename="merchant-accounts"
            filters={{
              search: searchTerm,
              status: statusFilter,
              location: locationFilter,
              verification: verificationFilter,
            }}
            onExport={(format) => {
              toast({
                title: t("admin.merchants.toast.exportSuccess"),
                description: t("admin.merchants.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.merchants.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.merchants.actions.addMerchant")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTransferCardsDialog(true)}
            className="text-xs sm:text-sm"
          >
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.merchants.actions.transferCards")}
            </span>
            <span className="sm:hidden">Transfer</span>
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.merchants.stats.totalMerchants")}
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(merchants.length)}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.merchants.stats.activeMerchants")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(
                    merchants.filter((m) => m.status === "active").length
                  )}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.merchants.stats.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    merchants.reduce((sum, m) => sum + m.totalRevenue, 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.merchants.stats.pendingVerification")}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatNumber(
                    merchants.filter((m) => m.verificationStatus === "pending")
                      .length
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.merchants.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.merchants.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.merchants.filters.status")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.merchants.filters.allStatus")}
                </SelectItem>
                <SelectItem value="active">
                  {t("admin.merchants.filters.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("admin.merchants.filters.inactive")}
                </SelectItem>
                <SelectItem value="suspended">
                  {t("admin.merchants.filters.suspended")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("admin.merchants.filters.pending")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.merchants.filters.location")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.merchants.filters.allLocations")}
                </SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={verificationFilter}
              onValueChange={setVerificationFilter}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.merchants.filters.verification")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.merchants.filters.allVerification")}
                </SelectItem>
                <SelectItem value="verified">
                  {t("admin.merchants.filters.verified")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("admin.merchants.filters.pending")}
                </SelectItem>
                <SelectItem value="rejected">
                  {t("admin.merchants.filters.rejected")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Merchants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.merchants.table.merchant")} (
            {formatNumber(filteredMerchants.length)})
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {t("admin.merchants.pagination.showing")} {startIndex + 1}-
              {Math.min(endIndex, filteredMerchants.length)}{" "}
              {t("admin.merchants.pagination.of")} {filteredMerchants.length}
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.merchants.table.merchant")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.merchants.table.contact")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.merchants.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.merchants.table.verification")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.merchants.table.registration")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.merchants.table.events")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.merchants.table.revenue")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.merchants.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <img
                          src={
                            merchant.profileImage ||
                            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
                          }
                          alt={merchant.businessName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="rtl:text-right ltr:text-left">
                          <p className="font-medium">{merchant.businessName}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("admin.merchants.table.owner")}:{" "}
                            {merchant.ownerName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {merchant.businessType}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right ltr:text-left">
                        <p className="text-sm">{merchant.email}</p>
                        <p className="text-sm text-muted-foreground" dir="ltr">
                          {formatPhone(merchant.phone)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {merchant.location}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(merchant.status)}>
                        {getStatusText(merchant.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getVerificationColor(
                          merchant.verificationStatus
                        )}
                      >
                        {getVerificationText(merchant.verificationStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm rtl:text-right ltr:text-left">
                        {formatDateForLocale(merchant.registrationDate)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right ltr:text-left">
                        <p className="font-medium">
                          {formatNumber(merchant.totalEvents)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.merchants.table.commission")}:{" "}
                          {merchant.commissionRate}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right ltr:text-left">
                        <p className="font-medium">
                          {formatCurrency(merchant.totalRevenue)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.merchants.table.payoutBalance")}:{" "}
                          {formatCurrency(merchant.payoutBalance)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="rtl:text-right ltr:text-left"
                        >
                          <DropdownMenuLabel>
                            {t("admin.merchants.table.actions")}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewMerchant(merchant)}
                          >
                            <Eye className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.viewDetails")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditMerchant(merchant)}
                          >
                            <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.editMerchant")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleViewEvents(merchant.id)}
                          >
                            <Ticket className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.viewEvents")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleViewTransactions(merchant.id)}
                          >
                            <Receipt className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.viewTransactions")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {merchant.verificationStatus === "pending" && (
                            <DropdownMenuItem
                              onClick={() => handleVerifyMerchant(merchant.id)}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                              {t("admin.merchants.actions.verify")}
                            </DropdownMenuItem>
                          )}
                          {merchant.status === "active" && (
                            <DropdownMenuItem
                              onClick={() => handleSuspendMerchant(merchant.id)}
                              className="text-yellow-600"
                            >
                              <Ban className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                              {t("admin.merchants.actions.suspend")}
                            </DropdownMenuItem>
                          )}
                          {merchant.status === "suspended" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleActivateMerchant(merchant.id)
                              }
                              className="text-green-600"
                            >
                              <UserCheck className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                              {t("admin.merchants.actions.activate")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteMerchant(merchant.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.deleteMerchant")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            showInfo={true}
            infoText={`${t("admin.merchants.pagination.showing")} ${
              startIndex + 1
            }-${Math.min(endIndex, filteredMerchants.length)} ${t(
              "admin.merchants.pagination.of"
            )} ${filteredMerchants.length}`}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={filteredMerchants.length}
            itemsPerPage={itemsPerPage}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Merchant Details Dialog */}
      <Dialog open={showMerchantDetails} onOpenChange={setShowMerchantDetails}>
        <DialogContent className="max-w-4xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.merchantDetails")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.merchantDetailsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="text-center">
                    <img
                      src={
                        selectedMerchant.profileImage ||
                        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
                      }
                      alt={selectedMerchant.businessName}
                      className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                    />
                    <h3 className="text-xl font-bold rtl:text-right ltr:text-left">
                      {selectedMerchant.businessName}
                    </h3>
                    <p className="text-muted-foreground rtl:text-right ltr:text-left">
                      {selectedMerchant.ownerName}
                    </p>
                    <Badge className={getStatusColor(selectedMerchant.status)}>
                      {getStatusText(selectedMerchant.status)}
                    </Badge>
                    <Badge
                      className={getVerificationColor(
                        selectedMerchant.verificationStatus
                      )}
                    >
                      {getVerificationText(selectedMerchant.verificationStatus)}
                    </Badge>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.merchants.form.email")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMerchant.email}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.merchants.form.phone")}
                      </p>
                      <p className="text-sm text-muted-foreground" dir="ltr">
                        {formatPhone(selectedMerchant.phone)}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.merchants.form.location")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMerchant.location}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.merchants.form.businessType")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMerchant.businessType}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.merchants.form.registrationDate")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateForLocale(selectedMerchant.registrationDate)}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.merchants.form.lastLogin")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMerchant.lastLogin
                          ? formatDateForLocale(
                              selectedMerchant.lastLogin,
                              "MMM dd, yyyy HH:mm"
                            )
                          : t("admin.merchants.details.never")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                  {t("admin.merchants.details.businessInfo")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium">
                      {t("admin.merchants.form.taxId")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedMerchant.taxId}
                    </p>
                  </div>
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium">
                      {t("admin.merchants.form.bankAccount")}
                    </p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {selectedMerchant.bankAccount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                  {t("admin.merchants.details.performance")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatNumber(selectedMerchant.totalEvents)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.merchants.details.totalEvents")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(selectedMerchant.totalRevenue)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.merchants.details.totalRevenue")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedMerchant.commissionRate}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.merchants.details.commissionRate")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(selectedMerchant.payoutBalance)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.merchants.details.payoutBalance")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Documents */}
              {selectedMerchant.documents.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                    {t("admin.merchants.details.documents")}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedMerchant.documents.map((document, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 p-2 bg-gray-50 rounded rtl:space-x-reverse"
                      >
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm rtl:text-right ltr:text-left">
                          {document}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMerchantDetails(false)}
            >
              {t("admin.merchants.dialogs.close")}
            </Button>
            <Button onClick={() => handleEditMerchant(selectedMerchant!)}>
              {t("admin.merchants.actions.editMerchant")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Merchant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.editMerchant")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.editMerchantSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.businessName")}
                  </label>
                  <Input defaultValue={selectedMerchant.businessName} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.ownerName")}
                  </label>
                  <Input defaultValue={selectedMerchant.ownerName} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.email")}
                  </label>
                  <Input type="email" defaultValue={selectedMerchant.email} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.phone")}
                  </label>
                  <Input defaultValue={selectedMerchant.phone} dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.location")}
                  </label>
                  <Input defaultValue={selectedMerchant.location} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.businessType")}
                  </label>
                  <Input defaultValue={selectedMerchant.businessType} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.commissionRate")}
                  </label>
                  <Input
                    type="number"
                    defaultValue={selectedMerchant.commissionRate.toString()}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.status")}
                  </label>
                  <Select defaultValue={selectedMerchant.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("admin.merchants.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("admin.merchants.status.inactive")}
                      </SelectItem>
                      <SelectItem value="suspended">
                        {t("admin.merchants.status.suspended")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("admin.merchants.status.pending")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.verificationStatus")}
                  </label>
                  <Select defaultValue={selectedMerchant.verificationStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">
                        {t("admin.merchants.verification.verified")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("admin.merchants.verification.pending")}
                      </SelectItem>
                      <SelectItem value="rejected">
                        {t("admin.merchants.verification.rejected")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("admin.merchants.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveMerchantChanges}>
              {t("admin.merchants.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Merchant Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.addMerchant")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.addMerchantSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.businessName")}
                </label>
                <Input
                  placeholder={t(
                    "admin.merchants.form.businessNamePlaceholder"
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.ownerName")}
                </label>
                <Input
                  placeholder={t("admin.merchants.form.ownerNamePlaceholder")}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.email")}
                </label>
                <Input
                  type="email"
                  placeholder={t("admin.merchants.form.emailPlaceholder")}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.phone")}
                </label>
                <Input
                  placeholder={t("admin.merchants.form.phonePlaceholder")}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.location")}
                </label>
                <Input
                  placeholder={t("admin.merchants.form.locationPlaceholder")}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.businessType")}
                </label>
                <Input
                  placeholder={t(
                    "admin.merchants.form.businessTypePlaceholder"
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.commissionRate")}
                </label>
                <Input
                  type="number"
                  placeholder={t(
                    "admin.merchants.form.commissionRatePlaceholder"
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.taxId")}
                </label>
                <Input
                  placeholder={t("admin.merchants.form.taxIdPlaceholder")}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t("admin.merchants.dialogs.cancel")}
            </Button>
            <Button onClick={handleAddMerchant}>
              {t("admin.merchants.dialogs.addMerchantButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merchant Events Dialog */}
      <Dialog open={showEventsDialog} onOpenChange={setShowEventsDialog}>
        <DialogContent className="max-w-4xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.merchantEvents")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedMerchant &&
                `${t("admin.merchants.dialogs.merchantEventsSubtitle")} ${
                  selectedMerchant.businessName
                }`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.events.eventTitle")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.events.date")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.events.revenue")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.events.commission")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.events.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchantEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="rtl:text-right ltr:text-left">
                        {event.eventTitle}
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">
                        {formatDateForLocale(event.date)}
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">
                        {formatCurrency(event.revenue)}
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">
                        {formatCurrency(event.commission)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEventsDialog(false)}
            >
              {t("admin.merchants.dialogs.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merchant Transactions Dialog */}
      <Dialog
        open={showTransactionsDialog}
        onOpenChange={setShowTransactionsDialog}
      >
        <DialogContent className="max-w-4xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.merchantTransactions")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedMerchant &&
                `${t("admin.merchants.dialogs.merchantTransactionsSubtitle")} ${
                  selectedMerchant.businessName
                }`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.transactions.type")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.transactions.description")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.transactions.amount")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.transactions.timestamp")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.transactions.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchantTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="rtl:text-right ltr:text-left">
                        <Badge variant="outline">{transaction.type}</Badge>
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">
                        <span
                          className={
                            transaction.amount >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">
                        {formatDateForLocale(
                          transaction.timestamp,
                          "MMM dd, yyyy HH:mm"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTransactionsDialog(false)}
            >
              {t("admin.merchants.dialogs.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Cards Dialog */}
      <Dialog
        open={showTransferCardsDialog}
        onOpenChange={setShowTransferCardsDialog}
      >
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.transferCards")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.transferCardsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.merchants.form.serialStart")}
                </label>
                <Input
                  placeholder={t("admin.merchants.form.enterSerialStart")}
                  value={transferCardsForm.serialStart}
                  onChange={(e) =>
                    setTransferCardsForm((prev) => ({
                      ...prev,
                      serialStart: e.target.value,
                    }))
                  }
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                  {t("admin.merchants.form.serialStartHelp")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.merchants.form.serialEnd")}
                </label>
                <Input
                  placeholder={t("admin.merchants.form.enterSerialEnd")}
                  value={transferCardsForm.serialEnd}
                  onChange={(e) =>
                    setTransferCardsForm((prev) => ({
                      ...prev,
                      serialEnd: e.target.value,
                    }))
                  }
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                  {t("admin.merchants.form.serialEndHelp")}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.merchants.form.selectMerchant")}
              </label>
              <Select
                value={transferCardsForm.selectedMerchantId}
                onValueChange={(value) =>
                  setTransferCardsForm((prev) => ({
                    ...prev,
                    selectedMerchantId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "admin.merchants.form.selectMerchantPlaceholder"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {merchants
                    .filter((merchant) => merchant.status === "active")
                    .map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        {merchant.businessName} - {merchant.businessType}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview section */}
            {transferCardsForm.serialStart &&
              transferCardsForm.serialEnd &&
              transferCardsForm.selectedMerchantId && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 rtl:text-right">
                    <strong>
                      {t("admin.merchants.form.transferPreview")}:
                    </strong>{" "}
                    {(() => {
                      const validation = validateSerialRange(
                        transferCardsForm.serialStart,
                        transferCardsForm.serialEnd
                      );
                      if (validation.valid) {
                        const serialNumbers = generateSerialNumbersInRange(
                          transferCardsForm.serialStart,
                          transferCardsForm.serialEnd
                        );
                        const selectedMerchant = merchants.find(
                          (m) => m.id === transferCardsForm.selectedMerchantId
                        );
                        return t("admin.merchants.form.transferPreviewDesc", {
                          count: validation.range,
                          start: transferCardsForm.serialStart,
                          end: transferCardsForm.serialEnd,
                          merchant: selectedMerchant?.businessName || "",
                          examples:
                            serialNumbers?.slice(0, 3).join(", ") +
                            (serialNumbers && serialNumbers.length > 3
                              ? "..."
                              : ""),
                        });
                      } else {
                        return validation.error;
                      }
                    })()}
                  </p>
                </div>
              )}
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setTransferCardsForm({
                  serialStart: "",
                  serialEnd: "",
                  selectedMerchantId: "",
                });
                setShowTransferCardsDialog(false);
              }}
            >
              {t("admin.merchants.dialogs.cancel")}
            </Button>
            <Button onClick={handleTransferCards}>
              {t("admin.merchants.dialogs.transferCardsButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantAccountsManagement;
