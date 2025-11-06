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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  PiggyBank,
  DollarSign,
  TrendingUp,
  Calendar,
  MoreHorizontal,
  User,
  CreditCard,
  Banknote,
  Wallet,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  formatCurrencyForLocale,
  formatNumberForLocale,
  formatPercentageForLocale,
} from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import i18n from "@/lib/i18n";

// Types
interface Deposit {
  id: string;
  ownerId: string;
  ownerName: string;
  amount: number;
  paymentMethod: string;
  depositDate: string;
  notes?: string;
  status: "completed" | "pending" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
};

type Owner = {
  id: string;
  name: string;
  email: string;
  phone: string;
  walletBalance: number;
};

const Deposits = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    ownerId: "",
    amount: "",
    paymentMethod: "",
    depositDate: "",
    notes: "",
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockDeposits: Deposit[] = [
      {
        id: "1",
        ownerId: "owner1",
        ownerName: "Ahmed Hassan",
        amount: 50000,
        paymentMethod: "bank_transfer",
        depositDate: "2024-01-15",
        notes: "Initial investment for Q1 2024",
        status: "completed",
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-15T10:30:00Z",
      },
      {
        id: "2",
        ownerId: "owner2",
        ownerName: "Sarah Johnson",
        amount: 75000,
        paymentMethod: "credit_card",
        depositDate: "2024-01-20",
        notes: "Additional capital for expansion",
        status: "completed",
        createdAt: "2024-01-20T14:15:00Z",
        updatedAt: "2024-01-20T14:15:00Z",
      },
      {
        id: "3",
        ownerId: "owner3",
        ownerName: "Mohammed Ali",
        amount: 30000,
        paymentMethod: "cash",
        depositDate: "2024-01-25",
        notes: "Emergency funding",
        status: "pending",
        createdAt: "2024-01-25T09:45:00Z",
        updatedAt: "2024-01-25T09:45:00Z",
      },
      {
        id: "4",
        ownerId: "owner1",
        ownerName: "Ahmed Hassan",
        amount: 25000,
        paymentMethod: "bank_transfer",
        depositDate: "2024-02-01",
        notes: "Monthly contribution",
        status: "completed",
        createdAt: "2024-02-01T11:20:00Z",
        updatedAt: "2024-02-01T11:20:00Z",
      },
      {
        id: "5",
        ownerId: "owner4",
        ownerName: "Fatima Zahra",
        amount: 100000,
        paymentMethod: "wire_transfer",
        depositDate: "2024-02-05",
        notes: "Major investment for new project",
        status: "completed",
        createdAt: "2024-02-05T16:30:00Z",
        updatedAt: "2024-02-05T16:30:00Z",
      },
    ];

    const mockOwners: Owner[] = [
      {
        id: "owner1",
        name: "Ahmed Hassan",
        email: "ahmed@example.com",
        phone: "+201234567890",
        walletBalance: -75000,
      },
      {
        id: "owner2",
        name: "Sarah Johnson",
        email: "sarah@example.com",
        phone: "+201234567891",
        walletBalance: -75000,
      },
      {
        id: "owner3",
        name: "Mohammed Ali",
        email: "mohammed@example.com",
        phone: "+201234567892",
        walletBalance: -30000,
      },
      {
        id: "owner4",
        name: "Fatima Zahra",
        email: "fatima@example.com",
        phone: "+201234567893",
        walletBalance: -100000,
      },
    ];

    const mockPaymentMethods: PaymentMethod[] = [
      { id: "bank_transfer", name: "Bank Transfer", icon: "🏦" },
      { id: "credit_card", name: "Credit Card", icon: "💳" },
      { id: "cash", name: "Cash", icon: "💵" },
      { id: "wire_transfer", name: "Wire Transfer", icon: "🏛️" },
      { id: "check", name: "Check", icon: "📄" },
      { id: "digital_wallet", name: "Digital Wallet", icon: "📱" },
    ];

    setDeposits(mockDeposits);
    setOwners(mockOwners);
    setPaymentMethods(mockPaymentMethods);
    setLoading(false);
  }, []);

  // Filtered and paginated data
  const filteredDeposits = useMemo(() => {
    return deposits.filter((deposit) => {
      const matchesSearch =
        deposit.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deposit.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || deposit.status === statusFilter;
      const matchesPaymentMethod =
        paymentMethodFilter === "all" ||
        deposit.paymentMethod === paymentMethodFilter;

      let matchesDate = true;
      if (dateFilter !== "all") {
        const depositDate = new Date(deposit.depositDate);
        const today = new Date();

        switch (dateFilter) {
          case "today":
            matchesDate = depositDate.toDateString() === today.toDateString();
            break;
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = depositDate >= weekAgo;
            break;
          case "month":
            const monthAgo = new Date(
              today.getTime() - 30 * 24 * 60 * 60 * 1000
            );
            matchesDate = depositDate >= monthAgo;
            break;
          case "year":
            const yearAgo = new Date(
              today.getTime() - 365 * 24 * 60 * 60 * 1000
            );
            matchesDate = depositDate >= yearAgo;
            break;
        }
      }

      return (
        matchesSearch && matchesStatus && matchesPaymentMethod && matchesDate
      );
    });
  }, [deposits, searchTerm, statusFilter, paymentMethodFilter, dateFilter]);

  const paginatedDeposits = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDeposits.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDeposits, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredDeposits.length / itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    const totalDeposits = deposits.reduce(
      (sum, deposit) => sum + deposit.amount,
      0
    );
    const activeDeposits = deposits.filter(
      (d) => d.status === "completed"
    ).length;
    const avgDeposit =
      deposits.length > 0 ? totalDeposits / deposits.length : 0;
    const monthlyGrowth = 18; // Mock data

    return {
      totalDeposits,
      activeDeposits,
      avgDeposit,
      monthlyGrowth,
    };
  }, [deposits]);

  // Handlers
  const handleAddDeposit = () => {
    setFormData({
      ownerId: "",
      amount: "",
      paymentMethod: "",
      depositDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditDeposit = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setFormData({
      ownerId: deposit.ownerId,
      amount: deposit.amount.toString(),
      paymentMethod: deposit.paymentMethod,
      depositDate: deposit.depositDate,
      notes: deposit.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleViewDeposit = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setIsViewDialogOpen(true);
  };

  const handleDeleteDeposit = (deposit: Deposit) => {
    setDeposits((prev) => prev.filter((d) => d.id !== deposit.id));
    toast({
      title: t("admin.deposits.actions.deleteSuccess"),
      description: t("admin.deposits.actions.deleteSuccessDescription"),
    });
  };

  const handleSubmit = (isEdit: boolean = false) => {
    if (
      !formData.ownerId ||
      !formData.amount ||
      !formData.paymentMethod ||
      !formData.depositDate
    ) {
      toast({
        title: t("admin.deposits.errors.validationError"),
        description: t("admin.deposits.errors.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    const owner = owners.find((o) => o.id === formData.ownerId);
    if (!owner) {
      toast({
        title: t("admin.deposits.errors.ownerNotFound"),
        description: t("admin.deposits.errors.ownerNotFoundDescription"),
        variant: "destructive",
      });
      return;
    }

    if (isEdit && selectedDeposit) {
      // Update existing deposit
      setDeposits((prev) =>
        prev.map((d) =>
          d.id === selectedDeposit.id
            ? {
                ...d,
                ownerId: formData.ownerId,
                ownerName: owner.name,
                amount: parseFloat(formData.amount),
                paymentMethod: formData.paymentMethod,
                depositDate: formData.depositDate,
                notes: formData.notes,
                updatedAt: new Date().toISOString(),
              }
            : d
        )
      );
      toast({
        title: t("admin.deposits.actions.updateSuccess"),
        description: t("admin.deposits.actions.updateSuccessDescription"),
      });
      setIsEditDialogOpen(false);
    } else {
      // Add new deposit
      const newDeposit: Deposit = {
        id: Date.now().toString(),
        ownerId: formData.ownerId,
        ownerName: owner.name,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        depositDate: formData.depositDate,
        notes: formData.notes,
        status: "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setDeposits((prev) => [newDeposit, ...prev]);
      toast({
        title: t("admin.deposits.actions.addSuccess"),
        description: t("admin.deposits.actions.addSuccessDescription"),
      });
      setIsAddDialogOpen(false);
    }

    setFormData({
      ownerId: "",
      amount: "",
      paymentMethod: "",
      depositDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
  };

  const getPaymentMethodIcon = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    return method?.icon || "💳";
  };

  const getPaymentMethodName = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    return method?.name || methodId;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: "default" as const, icon: CheckCircle },
      pending: { variant: "secondary" as const, icon: Clock },
      cancelled: { variant: "destructive" as const, icon: XCircle },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {t(`admin.deposits.status.${status}`)}
      </Badge>
    );
  };

  // Export columns
  const exportColumns = [
    { header: t("admin.deposits.table.id"), key: "id" },
    { header: t("admin.deposits.table.owner"), key: "ownerName" },
    {
      header: t("admin.deposits.table.amount"),
      key: "amount",
      formatter: (value: number) =>
        formatCurrencyForLocale(value, i18n.language),
    },
    {
      header: t("admin.deposits.table.paymentMethod"),
      key: "paymentMethod",
      formatter: (value: string) => getPaymentMethodName(value),
    },
    {
      header: t("admin.deposits.table.depositDate"),
      key: "depositDate",
      formatter: (value: string) =>
        format(parseISO(value), "PPP", {
          locale: i18n.language === "ar" ? ar : enUS,
        }),
    },
    { header: t("admin.deposits.table.status"), key: "status" },
    { header: t("admin.deposits.table.notes"), key: "notes" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>{t("admin.dashboard.logs.loading.loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.dashboard.tabs.deposits")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.deposits.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsExportDialogOpen(true)}
            variant="outline"
            className="text-xs sm:text-sm"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.deposits.actions.export")}
            </span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button onClick={handleAddDeposit} className="text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.deposits.actions.addDeposit")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.deposits.stats.totalDeposits")}
              </CardTitle>
            </div>
            <PiggyBank className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(stats.totalDeposits, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              +
              {formatPercentageForLocale(stats.monthlyGrowth, i18n.language, 0)}{" "}
              {t("admin.deposits.stats.fromLastMonth")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.deposits.stats.activeDeposits")}
              </CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">{stats.activeDeposits}</div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.deposits.stats.currentlyActive")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.deposits.stats.avgDeposit")}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(stats.avgDeposit, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.deposits.stats.perDeposit")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.deposits.stats.monthlyGrowth")}
              </CardTitle>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              +
              {formatPercentageForLocale(stats.monthlyGrowth, i18n.language, 0)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.deposits.stats.fromLastMonth")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <Filter className="h-5 w-5" />
            {t("admin.deposits.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">
                {t("admin.deposits.filters.search")}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                <Input
                  id="search"
                  placeholder={t("admin.deposits.filters.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rtl:pr-10 rtl:pl-3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                {t("admin.deposits.filters.status")}
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.deposits.filters.allStatus")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("admin.deposits.status.completed")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("admin.deposits.status.pending")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("admin.deposits.status.cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">
                {t("admin.deposits.filters.paymentMethod")}
              </Label>
              <Select
                value={paymentMethodFilter}
                onValueChange={setPaymentMethodFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.deposits.filters.allPaymentMethods")}
                  </SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.icon} {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">{t("admin.deposits.filters.date")}</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.deposits.filters.allDates")}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("admin.deposits.filters.today")}
                  </SelectItem>
                  <SelectItem value="week">
                    {t("admin.deposits.filters.thisWeek")}
                  </SelectItem>
                  <SelectItem value="month">
                    {t("admin.deposits.filters.thisMonth")}
                  </SelectItem>
                  <SelectItem value="year">
                    {t("admin.deposits.filters.thisYear")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposits Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <PiggyBank className="h-5 w-5" />
            {t("admin.deposits.title")}
          </CardTitle>
          <CardDescription>{t("admin.deposits.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedDeposits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ||
              statusFilter !== "all" ||
              paymentMethodFilter !== "all" ||
              dateFilter !== "all"
                ? t("admin.deposits.table.noResults")
                : t("admin.deposits.table.noDeposits")}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table dir={i18n.language === "ar" ? "rtl" : "ltr"}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.deposits.table.id")}</TableHead>
                      <TableHead>{t("admin.deposits.table.owner")}</TableHead>
                      <TableHead>{t("admin.deposits.table.amount")}</TableHead>
                      <TableHead>
                        {t("admin.deposits.table.paymentMethod")}
                      </TableHead>
                      <TableHead>
                        {t("admin.deposits.table.depositDate")}
                      </TableHead>
                      <TableHead>{t("admin.deposits.table.status")}</TableHead>
                      <TableHead>{t("admin.deposits.table.notes")}</TableHead>
                      <TableHead className="text-right">
                        {t("admin.deposits.table.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDeposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell className="font-mono text-sm">
                          #{deposit.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {deposit.ownerName}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrencyForLocale(
                            deposit.amount,
                            i18n.language
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>
                              {getPaymentMethodIcon(deposit.paymentMethod)}
                            </span>
                            {getPaymentMethodName(deposit.paymentMethod)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(deposit.depositDate), "PPP", {
                            locale: i18n.language === "ar" ? ar : enUS,
                          })}
                        </TableCell>
                        <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                        <TableCell>
                          {deposit.notes ? (
                            <span className="text-sm text-muted-foreground">
                              {deposit.notes.length > 50
                                ? `${deposit.notes.substring(0, 50)}...`
                                : deposit.notes}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {t("admin.deposits.table.noNotes")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                {t("admin.deposits.actions.actions")}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleViewDeposit(deposit)}
                              >
                                <Eye className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.deposits.actions.viewDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditDeposit(deposit)}
                              >
                                <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.deposits.actions.editDeposit")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteDeposit(deposit)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.deposits.actions.deleteDeposit")}
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
              {totalPages > 1 && (
                <div className="mt-4">
                  <ResponsivePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    showInfo={true}
                    infoText={`${t("admin.deposits.pagination.showing")} ${
                      (currentPage - 1) * itemsPerPage + 1
                    }-${Math.min(
                      currentPage * itemsPerPage,
                      filteredDeposits.length
                    )} ${t("admin.deposits.pagination.of")} ${
                      filteredDeposits.length
                    } ${t("admin.deposits.pagination.results")}`}
                    startIndex={(currentPage - 1) * itemsPerPage}
                    endIndex={Math.min(
                      currentPage * itemsPerPage,
                      filteredDeposits.length
                    )}
                    totalItems={filteredDeposits.length}
                    itemsPerPage={itemsPerPage}
                    className="justify-center"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Deposit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          className="sm:max-w-[500px]"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>{t("admin.deposits.dialogs.addDeposit")}</DialogTitle>
            <DialogDescription>
              {t("admin.deposits.dialogs.addDepositSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="owner">{t("admin.deposits.form.owner")} *</Label>
              <Select
                value={formData.ownerId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, ownerId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.deposits.form.selectOwner")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name} (
                      {formatCurrencyForLocale(
                        Math.abs(owner.walletBalance),
                        i18n.language
                      )}{" "}
                      {t("admin.deposits.form.owed")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">
                {t("admin.deposits.form.amount")} *
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder={t("admin.deposits.form.amountPlaceholder")}
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">
                {t("admin.deposits.form.paymentMethod")} *
              </Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.deposits.form.selectPaymentMethod")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.icon} {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="depositDate">
                {t("admin.deposits.form.depositDate")} *
              </Label>
              <Input
                id="depositDate"
                type="date"
                value={formData.depositDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    depositDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">{t("admin.deposits.form.notes")}</Label>
              <Textarea
                id="notes"
                placeholder={t("admin.deposits.form.notesPlaceholder")}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t("admin.deposits.actions.cancel")}
            </Button>
            <Button onClick={() => handleSubmit(false)}>
              {t("admin.deposits.actions.addDeposit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Deposit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="sm:max-w-[500px]"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>{t("admin.deposits.dialogs.editDeposit")}</DialogTitle>
            <DialogDescription>
              {t("admin.deposits.dialogs.editDepositSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-owner">
                {t("admin.deposits.form.owner")} *
              </Label>
              <Select
                value={formData.ownerId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, ownerId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.deposits.form.selectOwner")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name} (
                      {formatCurrencyForLocale(
                        Math.abs(owner.walletBalance),
                        i18n.language
                      )}{" "}
                      {t("admin.deposits.form.owed")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-amount">
                {t("admin.deposits.form.amount")} *
              </Label>
              <Input
                id="edit-amount"
                type="number"
                placeholder={t("admin.deposits.form.amountPlaceholder")}
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-paymentMethod">
                {t("admin.deposits.form.paymentMethod")} *
              </Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.deposits.form.selectPaymentMethod")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.icon} {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-depositDate">
                {t("admin.deposits.form.depositDate")} *
              </Label>
              <Input
                id="edit-depositDate"
                type="date"
                value={formData.depositDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    depositDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">
                {t("admin.deposits.form.notes")}
              </Label>
              <Textarea
                id="edit-notes"
                placeholder={t("admin.deposits.form.notesPlaceholder")}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("admin.deposits.actions.cancel")}
            </Button>
            <Button onClick={() => handleSubmit(true)}>
              {t("admin.deposits.actions.updateDeposit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Deposit Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent
          className="sm:max-w-[600px]"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>
              {t("admin.deposits.dialogs.depositDetails")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.deposits.dialogs.depositDetailsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.id")}
                  </Label>
                  <p className="text-sm">#{selectedDeposit.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.status")}
                  </Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedDeposit.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.owner")}
                  </Label>
                  <p className="text-sm">{selectedDeposit.ownerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.amount")}
                  </Label>
                  <p className="text-sm font-medium">
                    {formatCurrencyForLocale(
                      selectedDeposit.amount,
                      i18n.language
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.paymentMethod")}
                  </Label>
                  <p className="text-sm">
                    {getPaymentMethodIcon(selectedDeposit.paymentMethod)}{" "}
                    {getPaymentMethodName(selectedDeposit.paymentMethod)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.depositDate")}
                  </Label>
                  <p className="text-sm">
                    {format(parseISO(selectedDeposit.depositDate), "PPP", {
                      locale: i18n.language === "ar" ? ar : enUS,
                    })}
                  </p>
                </div>
              </div>

              {selectedDeposit.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.notes")}
                  </Label>
                  <p className="text-sm mt-1">{selectedDeposit.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.createdAt")}
                  </Label>
                  <p className="text-sm">
                    {format(parseISO(selectedDeposit.createdAt), "PPP p", {
                      locale: i18n.language === "ar" ? ar : enUS,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.updatedAt")}
                  </Label>
                  <p className="text-sm">
                    {format(parseISO(selectedDeposit.updatedAt), "PPP p", {
                      locale: i18n.language === "ar" ? ar : enUS,
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              {t("admin.deposits.actions.close")}
            </Button>
            {selectedDeposit && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditDeposit(selectedDeposit);
                }}
              >
                <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t("admin.deposits.actions.editDeposit")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <ExportDialog
        data={filteredDeposits}
        columns={exportColumns}
        filename="deposits"
        title={t("admin.deposits.export.title")}
        subtitle={t("admin.deposits.export.subtitle")}
        filters={{
          search: searchTerm,
          status: statusFilter,
          paymentMethod: paymentMethodFilter,
          date: dateFilter,
        }}
        onExport={(format) => {
          toast({
            title: t("admin.deposits.toast.exportSuccess"),
            description: t("admin.deposits.toast.exportSuccessDesc"),
          });
        }}
      >
        <Button
          onClick={() => setIsExportDialogOpen(true)}
          variant="outline"
          size="sm"
        >
          <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {t("admin.deposits.actions.export")}
        </Button>
      </ExportDialog>
    </div>
  );
};

export default Deposits;
