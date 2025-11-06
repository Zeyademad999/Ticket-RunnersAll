import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Calendar,
  Clock,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Search,
  Filter,
  Download,
  FileText,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Settings,
  Shield,
  Database,
  Key,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Edit,
  Plus,
  Minus,
  CreditCard,
  Ticket,
  MapPin,
  Building2,
  QrCode,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CalendarDays,
  AlertCircle,
  MoreHorizontal,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FilterX,
  History,
  ActivitySquare,
  Zap,
  Target,
  Star,
  StarOff,
  Repeat,
  Clock3,
  CalendarX,
  UserCog,
  Crown,
  Users2,
  UserCheck2,
  UserX2,
  ActivitySquare as ActivitySquareIcon,
  TrendingDown as TrendingDownIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatNumberForLocale, formatCurrencyForLocale } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import { ResponsivePagination } from "@/components/ui/pagination";

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Virtual scrolling utilities
const useVirtualScrolling = (
  items: any[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleItemCount + 1, items.length);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

// Types
interface SystemLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: "super_admin" | "admin" | "usher" | "support" | "customer";
  action: string;
  category:
    | "authentication"
    | "user_management"
    | "event_management"
    | "ticket_management"
    | "nfc_management"
    | "venue_management"
    | "system"
    | "security"
    | "financial"
    | "data_export"
    | "settings";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  details: {
    before?: any;
    after?: any;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    deviceInfo?: string;
    sessionId?: string;
    affectedRecords?: number;
    changes?: string[];
    metadata?: Record<string, any>;
  };
  status: "success" | "failed" | "pending" | "cancelled";
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  deviceInfo: string;
}

interface LogStats {
  totalLogs: number;
  todayLogs: number;
  thisWeekLogs: number;
  thisMonthLogs: number;
  criticalLogs: number;
  failedLogs: number;
  uniqueUsers: number;
  activeSessions: number;
  categoryBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  userActivityBreakdown: Record<string, number>;
}

const SystemLogs: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { toast } = useToast();

  // State for large-scale log management
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  // Performance optimizations
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadedLogCount, setLoadedLogCount] = useState(0);
  const logsPerChunk = 1000; // Load logs in chunks of 1000

  // Virtual scrolling
  const tableRef = useRef<HTMLDivElement>(null);
  const rowHeight = 80; // Approximate height of each table row

  // Filters with debounced search
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms delay
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Enhanced pagination for large datasets
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(50); // Configurable page size

  // Get date locale based on current language
  const getDateLocale = () => {
    return i18nInstance.language === "ar" ? ar : enUS;
  };

  // Format date for current locale
  const formatDateForLocale = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "PPP", { locale: getDateLocale() });
  };

  // Format time for current locale
  const formatTimeForLocale = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "HH:mm:ss", { locale: getDateLocale() });
  };

  // Enhanced mock logs data for pagination testing
  useEffect(() => {
    const generateMockLogs = (count: number): SystemLog[] => {
      const logs: SystemLog[] = [];
      const users = [
        { id: "ADMIN-001", name: "Ahmed Hassan", role: "super_admin" },
        { id: "ADMIN-002", name: "Sarah Mohamed", role: "admin" },
        { id: "ADMIN-003", name: "Mohamed Ali", role: "admin" },
        { id: "USHER-001", name: "Fatima Ahmed", role: "usher" },
        { id: "SUPPORT-001", name: "Hassan Omar", role: "support" },
        { id: "CUSTOMER-001", name: "Omar Ali", role: "customer" },
        { id: "CUSTOMER-002", name: "Layla Hassan", role: "customer" },
        { id: "CUSTOMER-003", name: "Youssef Ahmed", role: "customer" },
        { id: "ADMIN-004", name: "Nour El-Din", role: "admin" },
        { id: "USHER-002", name: "Karim Mohamed", role: "usher" },
      ];

      const actions = [
        "user_login",
        "user_logout",
        "user_created",
        "user_updated",
        "user_deleted",
        "event_created",
        "event_updated",
        "event_deleted",
        "event_published",
        "ticket_purchased",
        "ticket_refunded",
        "ticket_transferred",
        "venue_created",
        "venue_updated",
        "venue_deleted",
        "nfc_card_issued",
        "nfc_card_blocked",
        "nfc_card_replaced",
        "system_backup",
        "system_restore",
        "system_update",
        "security_alert",
        "failed_login_attempt",
        "suspicious_activity",
        "payment_processed",
        "payment_failed",
        "refund_processed",
        "data_exported",
        "data_imported",
        "settings_updated",
      ];

      const categories = [
        "authentication",
        "user_management",
        "event_management",
        "ticket_management",
        "nfc_management",
        "venue_management",
        "system",
        "security",
        "financial",
        "data_export",
        "settings",
      ];

      const severities = ["low", "medium", "high", "critical"];
      const statuses = ["success", "failed", "pending", "cancelled"];
      const locations = [
        "Cairo, Egypt",
        "Alexandria, Egypt",
        "Giza, Egypt",
        "Luxor, Egypt",
        "Aswan, Egypt",
        "Sharm El Sheikh, Egypt",
        "Hurghada, Egypt",
      ];

      const devices = [
        "Desktop - Chrome 120.0",
        "Desktop - Firefox 119.0",
        "Desktop - Safari 16.0",
        "Mobile - Chrome Android 120.0",
        "Mobile - Safari iOS 17.0",
        "Tablet - Chrome Android 120.0",
        "Tablet - Safari iOS 17.0",
      ];

      const descriptions = [
        "User logged in successfully",
        "User logged out",
        "New user account created",
        "User profile updated",
        "User account deleted",
        "Event created successfully",
        "Event details updated",
        "Event cancelled",
        "Event published",
        "Ticket purchased successfully",
        "Ticket refund processed",
        "Ticket transferred",
        "Venue added to system",
        "Venue information updated",
        "Venue removed",
        "NFC card issued to user",
        "NFC card blocked due to suspicious activity",
        "NFC card replaced",
        "System backup completed",
        "System restore initiated",
        "System update installed",
        "Security alert triggered",
        "Failed login attempt",
        "Suspicious activity detected",
        "Payment processed successfully",
        "Payment failed",
        "Refund processed",
        "Data exported successfully",
        "Data imported successfully",
        "System settings updated",
      ];

      for (let i = 1; i <= count; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const category =
          categories[Math.floor(Math.random() * categories.length)];
        const severity =
          severities[Math.floor(Math.random() * severities.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const location =
          locations[Math.floor(Math.random() * locations.length)];
        const device = devices[Math.floor(Math.random() * devices.length)];
        const description =
          descriptions[Math.floor(Math.random() * descriptions.length)];

        // Generate timestamp within last 30 days
        const timestamp = new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString();

        // Generate IP address
        const ipAddress = `192.168.${Math.floor(
          Math.random() * 255
        )}.${Math.floor(Math.random() * 255)}`;

        logs.push({
          id: `LOG-${i.toString().padStart(3, "0")}`,
          timestamp,
          userId: user.id,
          userName: user.name,
          userRole: user.role as any,
          action,
          category: category as any,
          severity: severity as any,
          description,
          details: {
            ipAddress,
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            location,
            deviceInfo: device,
            sessionId: `SESS-${i}-2025`,
            affectedRecords: Math.floor(Math.random() * 10) + 1,
            changes: ["Action performed", "Data updated", "System modified"],
            metadata: {
              sessionId: `SESS-${i}-2025`,
              requestId: `REQ-${i}-2025`,
              processingTime: Math.floor(Math.random() * 1000) + 50,
            },
          },
          status: status as any,
          sessionId: `SESS-${i}-2025`,
          ipAddress,
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          location,
          deviceInfo: device,
        });
      }

      return logs;
    };

    // Generate 500 mock logs for pagination testing
    const mockLogs = generateMockLogs(500);

    setLogs(mockLogs);
  }, []);

  // Optimized filtering with memoization and debounced search
  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Search filter with debounced term
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.userName.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower) ||
          log.description.toLowerCase().includes(searchLower) ||
          log.category.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((log) => log.category === selectedCategory);
    }

    // Severity filter
    if (selectedSeverity !== "all") {
      filtered = filtered.filter((log) => log.severity === selectedSeverity);
    }

    // User filter
    if (selectedUser !== "all") {
      filtered = filtered.filter((log) => log.userId === selectedUser);
    }

    // Status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((log) => log.status === selectedStatus);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = subDays(now, 7);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((log) => new Date(log.timestamp) >= startDate);
    }

    // Optimized sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof SystemLog];
      let bValue: any = b[sortBy as keyof SystemLog];

      if (sortBy === "timestamp") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [
    logs,
    debouncedSearchTerm, // Use debounced search term
    selectedCategory,
    selectedSeverity,
    selectedUser,
    selectedStatus,
    dateRange,
    sortBy,
    sortOrder,
  ]);

  // Optimized statistics calculation with memoization
  const stats: LogStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = subDays(now, 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Use filtered logs for more accurate statistics
    const todayLogs = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= today
    ).length;
    const thisWeekLogs = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= weekAgo
    ).length;
    const thisMonthLogs = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= monthStart
    ).length;
    const criticalLogs = filteredLogs.filter(
      (log) => log.severity === "critical"
    ).length;
    const failedLogs = filteredLogs.filter(
      (log) => log.status === "failed"
    ).length;
    const uniqueUsers = new Set(filteredLogs.map((log) => log.userId)).size;
    const activeSessions = new Set(
      filteredLogs
        .filter((log) => new Date(log.timestamp) >= subDays(now, 1))
        .map((log) => log.sessionId)
    ).size;

    const categoryBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userActivityBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.userName] = (acc[log.userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs: filteredLogs.length,
      todayLogs,
      thisWeekLogs,
      thisMonthLogs,
      criticalLogs,
      failedLogs,
      uniqueUsers,
      activeSessions,
      categoryBreakdown,
      severityBreakdown,
      userActivityBreakdown,
    };
  }, [filteredLogs]);

  // Lazy loading function
  const loadMoreLogs = useCallback(async () => {
    if (isLoadingMore || !hasMoreLogs) return;

    setIsLoadingMore(true);
    try {
      // Simulate API call for more logs
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate more mock logs
      const newLogs: SystemLog[] = [];
      const startId = loadedLogCount + 1;

      for (let i = 0; i < logsPerChunk; i++) {
        const logId = startId + i;
        newLogs.push({
          id: `LOG-${logId.toString().padStart(3, "0")}`,
          timestamp: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          userId: `USER-${Math.floor(Math.random() * 100)}`,
          userName: `User ${logId}`,
          userRole: ["super_admin", "admin", "usher", "support", "customer"][
            Math.floor(Math.random() * 5)
          ] as any,
          action: `action_${Math.floor(Math.random() * 10)}`,
          category: [
            "authentication",
            "user_management",
            "event_management",
            "ticket_management",
            "nfc_management",
            "venue_management",
            "system",
            "security",
            "financial",
            "data_export",
            "settings",
          ][Math.floor(Math.random() * 4)] as any,
          severity: ["low", "medium", "high", "critical"][
            Math.floor(Math.random() * 4)
          ] as any,
          description: `Log entry ${logId}`,
          details: {
            ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            location: "Cairo, Egypt",
            deviceInfo: "Desktop - Chrome 120.0",
            sessionId: `SESS-${logId}-2025`,
          },
          status: ["success", "failed", "pending", "cancelled"][
            Math.floor(Math.random() * 4)
          ] as any,
          sessionId: `SESS-${logId}-2025`,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          location: "Cairo, Egypt",
          deviceInfo: "Desktop - Chrome 120.0",
        });
      }

      setLogs((prev) => [...prev, ...newLogs]);
      setLoadedLogCount((prev) => prev + logsPerChunk);

      // Stop loading more if we've reached a reasonable limit
      if (loadedLogCount + logsPerChunk >= 100000) {
        setHasMoreLogs(false);
      }
    } catch (error) {
      console.error("Error loading more logs:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreLogs, loadedLogCount, logsPerChunk]);

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Convert snake_case to camelCase for translation keys
  const getCategoryTranslationKey = (category: string) => {
    switch (category) {
      case "authentication":
        return "authentication";
      case "user_management":
        return "userManagement";
      case "event_management":
        return "eventManagement";
      case "ticket_management":
        return "ticketManagement";
      case "nfc_management":
        return "nfcManagement";
      case "venue_management":
        return "venueManagement";
      case "system":
        return "system";
      case "security":
        return "security";
      case "financial":
        return "financial";
      case "data_export":
        return "dataExport";
      case "settings":
        return "settings";
      default:
        return category;
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "authentication":
        return <Key className="h-4 w-4" />;
      case "user_management":
        return <Users className="h-4 w-4" />;
      case "event_management":
        return <Calendar className="h-4 w-4" />;
      case "ticket_management":
        return <Ticket className="h-4 w-4" />;
      case "nfc_management":
        return <CreditCard className="h-4 w-4" />;
      case "venue_management":
        return <Building2 className="h-4 w-4" />;
      case "system":
        return <Database className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      case "data_export":
        return <FileText className="h-4 w-4" />;
      case "settings":
        return <Settings className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Handle log details view
  const handleViewLogDetails = (log: SystemLog) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  // Optimized export for large datasets
  const handleExportLogs = useCallback(async () => {
    try {
      setLoading(true);

      // For very large datasets, export in chunks
      const chunkSize = 10000;
      const chunks = [];

      for (let i = 0; i < filteredLogs.length; i += chunkSize) {
        chunks.push(filteredLogs.slice(i, i + chunkSize));
      }

      const csvHeaders =
        "ID,Timestamp,User,Role,Action,Category,Severity,Description,Status,IP Address,Location\n";
      let csvContent = csvHeaders;

      // Process chunks to avoid memory issues
      for (const chunk of chunks) {
        const chunkContent = chunk
          .map(
            (log) =>
              `${log.id},${log.timestamp},${log.userName},${log.userRole},${log.action},${log.category},${log.severity},"${log.description}",${log.status},${log.ipAddress},${log.location}`
          )
          .join("\n");

        csvContent += chunkContent + "\n";
      }

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `system-logs-${format(
        new Date(),
        "yyyy-MM-dd-HH-mm"
      )}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t("admin.dashboard.logs.toast.exportSuccess"),
        description: t("admin.dashboard.logs.toast.exportSuccessDesc"),
      });
    } catch (error) {
      toast({
        title: t("admin.dashboard.logs.toast.exportError"),
        description: t("admin.dashboard.logs.toast.exportErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filteredLogs, t, toast]);

  // Memory management - cleanup old logs
  const cleanupOldLogs = useCallback(() => {
    const maxLogsToKeep = 50000; // Keep only 50k logs in memory
    if (logs.length > maxLogsToKeep) {
      setLogs((prev) => prev.slice(-maxLogsToKeep));
    }
  }, [logs.length]);

  // Cleanup old logs periodically
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupOldLogs, 60000); // Every minute
    return () => clearInterval(cleanupInterval);
  }, [cleanupOldLogs]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedCategory,
    selectedSeverity,
    selectedUser,
    selectedStatus,
    dateRange,
  ]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedSeverity("all");
    setSelectedUser("all");
    setSelectedStatus("all");
    setDateRange("all");
    setSortBy("timestamp");
    setSortOrder("desc");
  };

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const users = new Set(logs.map((log) => log.userId));
    return Array.from(users).map((userId) => {
      const log = logs.find((l) => l.userId === userId);
      return {
        id: userId,
        name: log?.userName || userId,
        role: log?.userRole || "unknown",
      };
    });
  }, [logs]);

  // Optimized pagination with virtual scrolling support
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // Virtual scrolling for large datasets
  const containerHeight = 600; // Fixed container height
  // Note: Virtual scrolling variables are available but not currently used
  // const { visibleItems, totalHeight, offsetY, setScrollTop } =
  //   useVirtualScrolling(currentLogs, rowHeight, containerHeight);

  // Intersection Observer for infinite scrolling
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreLogs && !isLoadingMore) {
            loadMoreLogs();
          }
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMoreLogs, isLoadingMore, loadMoreLogs]);

  return (
    <div
      className="space-y-6"
      dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.dashboard.logs.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.dashboard.logs.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredLogs}
            columns={commonColumns.systemLogs}
            title={t("admin.dashboard.logs.title")}
            subtitle={t("admin.dashboard.logs.subtitle")}
            filename="system-logs"
            filters={{
              search: searchTerm,
              category: selectedCategory,
              severity: selectedSeverity,
              user: selectedUser,
              status: selectedStatus,
              dateRange: dateRange,
            }}
            onExport={(format) => {
              toast({
                title: t("admin.dashboard.logs.toast.exportSuccess"),
                description: t("admin.dashboard.logs.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.dashboard.logs.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="text-xs sm:text-sm"
          >
            <FilterX className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.dashboard.logs.clearFilters")}
            </span>
            <span className="sm:hidden">Clear</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.dashboard.logs.stats.totalLogs")}
              </CardTitle>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(stats.totalLogs, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.dashboard.logs.stats.allTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.dashboard.logs.stats.todayLogs")}
              </CardTitle>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(stats.todayLogs, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.dashboard.logs.stats.today")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.dashboard.logs.stats.criticalLogs")}
              </CardTitle>
            </div>
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-red-600 number-container">
              {formatNumberForLocale(stats.criticalLogs, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.dashboard.logs.stats.requiresAttention")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.dashboard.logs.stats.activeUsers")}
              </CardTitle>
            </div>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(stats.uniqueUsers, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.dashboard.logs.stats.uniqueUsers")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <Filter className="h-5 w-5" />
            {t("admin.dashboard.logs.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 rtl:space-x-reverse">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.search")}
              </label>
              <Input
                placeholder={t(
                  "admin.dashboard.logs.filters.searchPlaceholder"
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rtl:text-right"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.category")}
              </label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allCategories")}
                  </SelectItem>
                  <SelectItem value="authentication">
                    {t("admin.dashboard.logs.categories.authentication")}
                  </SelectItem>
                  <SelectItem value="user_management">
                    {t("admin.dashboard.logs.categories.userManagement")}
                  </SelectItem>
                  <SelectItem value="event_management">
                    {t("admin.dashboard.logs.categories.eventManagement")}
                  </SelectItem>
                  <SelectItem value="ticket_management">
                    {t("admin.dashboard.logs.categories.ticketManagement")}
                  </SelectItem>
                  <SelectItem value="nfc_management">
                    {t("admin.dashboard.logs.categories.nfcManagement")}
                  </SelectItem>
                  <SelectItem value="venue_management">
                    {t("admin.dashboard.logs.categories.venueManagement")}
                  </SelectItem>
                  <SelectItem value="system">
                    {t("admin.dashboard.logs.categories.system")}
                  </SelectItem>
                  <SelectItem value="security">
                    {t("admin.dashboard.logs.categories.security")}
                  </SelectItem>
                  <SelectItem value="financial">
                    {t("admin.dashboard.logs.categories.financial")}
                  </SelectItem>
                  <SelectItem value="data_export">
                    {t("admin.dashboard.logs.categories.dataExport")}
                  </SelectItem>
                  <SelectItem value="settings">
                    {t("admin.dashboard.logs.categories.settings")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.severity")}
              </label>
              <Select
                value={selectedSeverity}
                onValueChange={setSelectedSeverity}
              >
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allSeverities")}
                  </SelectItem>
                  <SelectItem value="critical">
                    {t("admin.dashboard.logs.severities.critical")}
                  </SelectItem>
                  <SelectItem value="high">
                    {t("admin.dashboard.logs.severities.high")}
                  </SelectItem>
                  <SelectItem value="medium">
                    {t("admin.dashboard.logs.severities.medium")}
                  </SelectItem>
                  <SelectItem value="low">
                    {t("admin.dashboard.logs.severities.low")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.user")}
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allUsers")}
                  </SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.status")}
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allStatuses")}
                  </SelectItem>
                  <SelectItem value="success">
                    {t("admin.dashboard.logs.statuses.success")}
                  </SelectItem>
                  <SelectItem value="failed">
                    {t("admin.dashboard.logs.statuses.failed")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("admin.dashboard.logs.statuses.pending")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("admin.dashboard.logs.statuses.cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.dateRange")}
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allTime")}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("admin.dashboard.logs.filters.today")}
                  </SelectItem>
                  <SelectItem value="week">
                    {t("admin.dashboard.logs.filters.thisWeek")}
                  </SelectItem>
                  <SelectItem value="month">
                    {t("admin.dashboard.logs.filters.thisMonth")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
              <History className="h-5 w-5" />
              {t("admin.dashboard.logs.table.title")} (
              {formatNumberForLocale(
                filteredLogs.length,
                i18nInstance.language
              )}
              )
            </CardTitle>
            <div className="flex items-center gap-2 rtl:flex-row-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="flex items-center gap-1 rtl:flex-row-reverse"
              >
                {sortOrder === "asc" ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {t("admin.dashboard.logs.table.sortBy")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Performance indicator */}
          <div className="mb-4 p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="rtl:text-right">
                {t("admin.dashboard.logs.table.title")} (
                {formatNumberForLocale(
                  filteredLogs.length,
                  i18nInstance.language
                )}
                )
              </span>
              <span className="text-muted-foreground rtl:text-right">
                {loading && t("admin.dashboard.logs.loading.loading")}
                {isLoadingMore && t("admin.dashboard.logs.loading.loadingMore")}
                {!loading &&
                  !isLoadingMore &&
                  t("admin.dashboard.logs.loading.ready")}
              </span>
            </div>
          </div>

          <div
            className="overflow-x-auto rtl:overflow-x-auto"
            style={{ height: `${containerHeight}px` }}
          >
            <Table className="rtl:text-right">
              <TableHeader>
                <TableRow className="rtl:text-right">
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.timestamp")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.user")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.action")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.category")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.severity")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.description")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.ipAddress")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.location")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="rtl:text-right">
                      <div className="flex flex-col rtl:text-right">
                        <span className="text-sm font-medium">
                          {formatDateForLocale(log.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeForLocale(log.timestamp)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 rtl:text-right">
                          <p className="text-sm font-medium truncate">
                            {log.userName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {log.userRole}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <span className="text-sm">
                        {t(
                          `admin.dashboard.logs.actions.${log.action}`,
                          log.action
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        {getCategoryIcon(log.category)}
                        <span className="text-sm">
                          {t(
                            `admin.dashboard.logs.categories.${getCategoryTranslationKey(
                              log.category
                            )}`
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <Badge
                        variant="outline"
                        className={`${getSeverityColor(
                          log.severity
                        )} rtl:text-right`}
                      >
                        {t(`admin.dashboard.logs.severities.${log.severity}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <p
                        className="text-sm max-w-xs truncate"
                        title={log.description}
                      >
                        {t(
                          `admin.dashboard.logs.descriptions.${log.description}`,
                          log.description
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(
                          log.status
                        )} rtl:text-right`}
                      >
                        {t(`admin.dashboard.logs.statuses.${log.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {log.ipAddress}
                      </span>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <span className="text-sm">{log.location}</span>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="rtl:text-right"
                        >
                          <DropdownMenuLabel>
                            {t("admin.dashboard.logs.actions.viewDetails")}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleViewLogDetails(log)}
                            className="flex items-center gap-2 rtl:flex-row-reverse"
                          >
                            <Eye className="h-4 w-4" />
                            {t("admin.dashboard.logs.actions.viewDetails")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Infinite scrolling trigger */}
            {hasMoreLogs && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {isLoadingMore ? (
                  <div className="flex items-center justify-center gap-2 rtl:flex-row-reverse">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.loading.loadingMore")}
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMoreLogs}
                    className="flex items-center gap-2 rtl:flex-row-reverse"
                  >
                    <Download className="h-4 w-4" />
                    {t("admin.dashboard.logs.actions.loadMore")}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Pagination */}
          <div className="mt-4">
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              startIndex={startIndex}
              endIndex={Math.min(endIndex, filteredLogs.length)}
              totalItems={filteredLogs.length}
              itemsPerPage={logsPerPage}
              infoText={`${t("admin.dashboard.logs.pagination.showing")} ${
                startIndex + 1
              }-${Math.min(endIndex, filteredLogs.length)} ${t(
                "admin.dashboard.logs.pagination.of"
              )} ${formatNumberForLocale(
                filteredLogs.length,
                i18nInstance.language
              )} ${t("admin.dashboard.logs.pagination.results")}`}
            />

            {/* Page size selector */}
            <div className="flex items-center justify-center mt-4">
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <span className="text-sm text-muted-foreground">
                  {t("admin.dashboard.logs.pagination.perPage")}:
                </span>
                <Select
                  value={logsPerPage.toString()}
                  onValueChange={(value) => {
                    setLogsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={showLogDetails} onOpenChange={setShowLogDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:flex-row-reverse">
              <ActivitySquareIcon className="h-5 w-5" />
              {t("admin.dashboard.logs.details.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right">
              {t("admin.dashboard.logs.details.subtitle")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                  {t("admin.dashboard.logs.details.basicInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.timestamp")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {formatDateForLocale(selectedLog.timestamp)}{" "}
                      {formatTimeForLocale(selectedLog.timestamp)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.user")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.userName} ({selectedLog.userRole})
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.action")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.action}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.category")}
                    </label>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      {getCategoryIcon(selectedLog.category)}
                      <span className="text-sm">
                        {t(
                          `admin.dashboard.logs.categories.${getCategoryTranslationKey(
                            selectedLog.category
                          )}`
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.severity")}
                    </label>
                    <Badge
                      variant="outline"
                      className={`${getSeverityColor(
                        selectedLog.severity
                      )} rtl:text-right`}
                    >
                      {t(
                        `admin.dashboard.logs.severities.${selectedLog.severity}`
                      )}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.status")}
                    </label>
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(
                        selectedLog.status
                      )} rtl:text-right`}
                    >
                      {t(`admin.dashboard.logs.statuses.${selectedLog.status}`)}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                  {t("admin.dashboard.logs.table.description")}
                </h3>
                <p className="text-sm rtl:text-right">
                  {selectedLog.description}
                </p>
              </div>

              <Separator />

              {/* Technical Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                  {t("admin.dashboard.logs.details.technicalDetails")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.ipAddress")}
                    </label>
                    <p className="text-sm font-mono rtl:text-right">
                      {selectedLog.ipAddress}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.location")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.location}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.details.deviceInfo")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.deviceInfo}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.details.sessionId")}
                    </label>
                    <p className="text-sm font-mono rtl:text-right">
                      {selectedLog.sessionId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Changes Made */}
              {selectedLog.details.changes &&
                selectedLog.details.changes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                        {t("admin.dashboard.logs.details.changes")}
                      </h3>
                      <ul className="space-y-1 rtl:text-right">
                        {selectedLog.details.changes.map((change, index) => (
                          <li
                            key={index}
                            className="text-sm flex items-center gap-2 rtl:flex-row-reverse"
                          >
                            <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

              {/* Metadata */}
              {selectedLog.details.metadata &&
                Object.keys(selectedLog.details.metadata).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                        {t("admin.dashboard.logs.details.metadata")}
                      </h3>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <pre className="text-sm overflow-x-auto rtl:text-right">
                          {JSON.stringify(
                            selectedLog.details.metadata,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowLogDetails(false)}>
              {t("admin.dashboard.logs.details.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemLogs;
