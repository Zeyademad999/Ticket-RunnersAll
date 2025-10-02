import React, { useState, useEffect } from "react";
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
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Wallet,
  Users,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns, formatCurrency } from "@/lib/exportUtils";
import {
  formatCurrencyForLocale,
  formatNumberForLocale,
  formatPercentageForLocale,
} from "@/lib/utils";
import i18n from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Types
type Owner = {
  id: string;
  name: string;
  currentBalance: number;
  deposits: number;
  withdrawals: number;
  netPosition: number;
  profitSharePercentage: number;
  email?: string;
  phone?: string;
  joinDate: string;
  status: "active" | "inactive";
};

const CompanyFinances = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddOwnerDialogOpen, setIsAddOwnerDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for company finances
  const companyFinancesData = [
    {
      id: "1",
      period: "Q1 2024",
      totalRevenue: 2500000,
      totalExpenses: 1800000,
      netProfit: 700000,
      profitMargin: 28,
      status: "completed",
      date: "2024-03-31",
    },
    {
      id: "2",
      period: "Q4 2023",
      totalRevenue: 2200000,
      totalExpenses: 1600000,
      netProfit: 600000,
      profitMargin: 27.3,
      status: "completed",
      date: "2023-12-31",
    },
    {
      id: "3",
      period: "Q3 2023",
      totalRevenue: 2000000,
      totalExpenses: 1500000,
      netProfit: 500000,
      profitMargin: 25,
      status: "completed",
      date: "2023-09-30",
    },
  ];

  // Mock data for owners
  const [owners, setOwners] = useState<Owner[]>([
    {
      id: "1",
      name: "Ahmed Hassan",
      currentBalance: 250000,
      deposits: 500000,
      withdrawals: 750000,
      netPosition: 0,
      profitSharePercentage: 40,
      email: "ahmed@company.com",
      phone: "+20 122 652 1747",
      joinDate: "2023-01-15",
      status: "active",
    },
    {
      id: "2",
      name: "Sarah Mohamed",
      currentBalance: 180000,
      deposits: 300000,
      withdrawals: 480000,
      netPosition: 0,
      profitSharePercentage: 30,
      email: "sarah@company.com",
      phone: "+20 122 652 1748",
      joinDate: "2023-03-20",
      status: "active",
    },
    {
      id: "3",
      name: "Omar Ali",
      currentBalance: 120000,
      deposits: 200000,
      withdrawals: 320000,
      netPosition: 0,
      profitSharePercentage: 20,
      email: "omar@company.com",
      phone: "+20 122 652 1749",
      joinDate: "2023-06-10",
      status: "active",
    },
    {
      id: "4",
      name: "Fatima Ahmed",
      currentBalance: 50000,
      deposits: 100000,
      withdrawals: 150000,
      netPosition: 0,
      profitSharePercentage: 10,
      email: "fatima@company.com",
      phone: "+20 122 652 1750",
      joinDate: "2023-09-05",
      status: "active",
    },
  ]);

  // Company wallet balance
  const companyWalletBalance = owners.reduce(
    (total, owner) => total + owner.currentBalance,
    0
  );
  const totalProfitShare = owners.reduce(
    (total, owner) => total + owner.profitSharePercentage,
    0
  );

  // New owner form state
  const [newOwner, setNewOwner] = useState({
    name: "",
    email: "",
    phone: "",
    profitSharePercentage: 0,
    initialDeposit: 0,
  });

  const getDateLocale = () => {
    return i18nInstance.language === "ar" ? ar : enUS;
  };

  const formatDateForLocale = (date: string) => {
    return format(parseISO(date), "PPP", { locale: getDateLocale() });
  };

  const handleAddOwner = () => {
    // Validate total profit share doesn't exceed 100%
    const newTotalShare = totalProfitShare + newOwner.profitSharePercentage;
    if (newTotalShare > 100) {
      toast({
        title: t("admin.companyFinances.validation.error"),
        description: t("admin.companyFinances.validation.profitShareExceeded"),
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!newOwner.name || newOwner.profitSharePercentage <= 0) {
      toast({
        title: t("admin.companyFinances.validation.error"),
        description: t("admin.companyFinances.validation.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    const owner: Owner = {
      id: Date.now().toString(),
      name: newOwner.name,
      currentBalance: newOwner.initialDeposit,
      deposits: newOwner.initialDeposit,
      withdrawals: 0,
      netPosition: newOwner.initialDeposit,
      profitSharePercentage: newOwner.profitSharePercentage,
      email: newOwner.email,
      phone: newOwner.phone,
      joinDate: new Date().toISOString().split("T")[0],
      status: "active",
    };

    setOwners([...owners, owner]);

    // Reset form
    setNewOwner({
      name: "",
      email: "",
      phone: "",
      profitSharePercentage: 0,
      initialDeposit: 0,
    });

    setIsAddOwnerDialogOpen(false);

    toast({
      title: t("admin.companyFinances.ownerAdded"),
      description: t("admin.companyFinances.ownerAddedDesc"),
    });
  };

  const filteredOwners = owners.filter(
    (owner) =>
      owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.dashboard.tabs.companyFinances")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.companyFinances.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={companyFinancesData}
            columns={[
              { header: "Period", key: "period", width: 20 },
              {
                header: "Total Revenue",
                key: "totalRevenue",
                width: 20,
                formatter: formatCurrency,
              },
              {
                header: "Total Expenses",
                key: "totalExpenses",
                width: 20,
                formatter: formatCurrency,
              },
              {
                header: "Net Profit",
                key: "netProfit",
                width: 20,
                formatter: formatCurrency,
              },
              { header: "Profit Margin %", key: "profitMargin", width: 20 },
              { header: "Status", key: "status", width: 20 },
              { header: "Date", key: "date", width: 20 },
            ]}
            title={t("admin.dashboard.tabs.companyFinances")}
            subtitle={t("admin.companyFinances.subtitle")}
            filename="company-finances"
          >
            <Button className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.export.title")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview">
            {t("admin.companyFinances.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="wallet">
            {t("admin.companyFinances.tabs.wallet")}
          </TabsTrigger>
          <TabsTrigger value="owners">
            {t("admin.companyFinances.tabs.owners")}
          </TabsTrigger>
          <TabsTrigger value="profitShare">
            {t("admin.companyFinances.tabs.profitShare")}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                <div className="flex-1 rtl:text-right">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.companyFinances.stats.totalRevenue")}
                  </CardTitle>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="rtl:text-right">
                <div className="text-2xl font-bold">
                  {formatCurrencyForLocale(6700000, i18nInstance.language)}
                </div>
                <p className="text-xs text-muted-foreground rtl:text-right">
                  +{formatPercentageForLocale(13.6, i18nInstance.language, 1)}{" "}
                  {t("admin.companyFinances.stats.fromLastYear")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                <div className="flex-1 rtl:text-right">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.companyFinances.stats.totalExpenses")}
                  </CardTitle>
                </div>
                <TrendingDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="rtl:text-right">
                <div className="text-2xl font-bold">
                  {formatCurrencyForLocale(4900000, i18nInstance.language)}
                </div>
                <p className="text-xs text-muted-foreground rtl:text-right">
                  +{formatPercentageForLocale(8.7, i18nInstance.language, 1)}{" "}
                  {t("admin.companyFinances.stats.fromLastYear")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                <div className="flex-1 rtl:text-right">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.companyFinances.stats.netProfit")}
                  </CardTitle>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="rtl:text-right">
                <div className="text-2xl font-bold">
                  {formatCurrencyForLocale(1800000, i18nInstance.language)}
                </div>
                <p className="text-xs text-muted-foreground rtl:text-right">
                  +{formatPercentageForLocale(20, i18nInstance.language, 0)}{" "}
                  {t("admin.companyFinances.stats.fromLastYear")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                <div className="flex-1 rtl:text-right">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.companyFinances.stats.profitMargin")}
                  </CardTitle>
                </div>
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="rtl:text-right">
                <div className="text-2xl font-bold number-container">
                  {formatPercentageForLocale(26.9, i18nInstance.language)}
                </div>
                <p className="text-xs text-muted-foreground rtl:text-right">
                  +{formatPercentageForLocale(1.2, i18nInstance.language, 1)}{" "}
                  {t("admin.companyFinances.stats.fromLastYear")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                <Building2 className="h-5 w-5" />
                {t("admin.companyFinances.recentPeriods")}
              </CardTitle>
              <CardDescription>
                {t("admin.companyFinances.recentPeriodsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companyFinancesData.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg rtl:flex-row-reverse"
                  >
                    <div className="flex items-center gap-4 rtl:flex-row-reverse">
                      <div className="flex flex-col rtl:text-right">
                        <span className="font-medium">{item.period}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDateForLocale(item.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 rtl:flex-row-reverse">
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrencyForLocale(
                            item.totalRevenue,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.revenue")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrencyForLocale(
                            item.totalExpenses,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.expenses")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {formatCurrencyForLocale(
                            item.netProfit,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.netProfit")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium number-container">
                          {formatPercentageForLocale(
                            item.profitMargin,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.margin")}
                        </div>
                      </div>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Wallet Tab */}
        <TabsContent value="wallet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                <Wallet className="h-5 w-5" />
                {t("admin.companyFinances.wallet.title")}
              </CardTitle>
              <CardDescription>
                {t("admin.companyFinances.wallet.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Company Wallet Balance */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 rtl:flex-row-reverse">
                      <Wallet className="h-5 w-5 text-blue-600" />
                      {t("admin.companyFinances.wallet.companyBalance")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600 rtl:text-right">
                      {formatCurrencyForLocale(
                        companyWalletBalance,
                        i18nInstance.language
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 rtl:text-right">
                      {t("admin.companyFinances.wallet.availableBalance")}
                    </p>
                  </CardContent>
                </Card>

                {/* Total Owners */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 rtl:flex-row-reverse">
                      <Users className="h-5 w-5 text-green-600" />
                      {t("admin.companyFinances.wallet.totalOwners")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 rtl:text-right">
                      {owners.length}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 rtl:text-right">
                      {t("admin.companyFinances.wallet.activeStakeholders")}
                    </p>
                  </CardContent>
                </Card>

                {/* Total Profit Share */}
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 rtl:flex-row-reverse">
                      <Percent className="h-5 w-5 text-purple-600" />
                      {t("admin.companyFinances.wallet.totalProfitShare")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600 rtl:text-right number-container">
                      {formatPercentageForLocale(
                        totalProfitShare,
                        i18nInstance.language
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 rtl:text-right">
                      {totalProfitShare === 100
                        ? t("admin.companyFinances.wallet.fullyAllocated")
                        : t("admin.companyFinances.wallet.partiallyAllocated")}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Owners Tab */}
        <TabsContent value="owners" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rtl:flex-row-reverse">
                <div>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Users className="h-5 w-5" />
                    {t("admin.companyFinances.owners.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("admin.companyFinances.owners.description")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={t(
                      "admin.companyFinances.owners.searchPlaceholder"
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Dialog
                    open={isAddOwnerDialogOpen}
                    onOpenChange={setIsAddOwnerDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2 rtl:flex-row-reverse">
                        <Plus className="h-4 w-4" />
                        {t("admin.companyFinances.owners.addNew")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="sm:max-w-[425px]"
                      dir={i18n.language === "ar" ? "rtl" : "ltr"}
                    >
                      <DialogHeader>
                        <DialogTitle>
                          {t("admin.companyFinances.owners.addNew")}
                        </DialogTitle>
                        <DialogDescription>
                          {t("admin.companyFinances.owners.addNewDescription")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            {t("admin.companyFinances.owners.name")}
                          </Label>
                          <Input
                            id="name"
                            value={newOwner.name}
                            onChange={(e) =>
                              setNewOwner({ ...newOwner, name: e.target.value })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">
                            {t("admin.companyFinances.owners.email")}
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={newOwner.email}
                            onChange={(e) =>
                              setNewOwner({
                                ...newOwner,
                                email: e.target.value,
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone" className="text-right">
                            {t("admin.companyFinances.owners.phone")}
                          </Label>
                          <Input
                            id="phone"
                            value={newOwner.phone}
                            onChange={(e) =>
                              setNewOwner({
                                ...newOwner,
                                phone: e.target.value,
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="profitShare" className="text-right">
                            {t("admin.companyFinances.owners.profitShare")}
                          </Label>
                          <Input
                            id="profitShare"
                            type="number"
                            min="0"
                            max="100"
                            value={newOwner.profitSharePercentage}
                            onChange={(e) =>
                              setNewOwner({
                                ...newOwner,
                                profitSharePercentage:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label
                            htmlFor="initialDeposit"
                            className="text-right"
                          >
                            {t("admin.companyFinances.owners.initialDeposit")}
                          </Label>
                          <Input
                            id="initialDeposit"
                            type="number"
                            min="0"
                            value={newOwner.initialDeposit}
                            onChange={(e) =>
                              setNewOwner({
                                ...newOwner,
                                initialDeposit: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                        {totalProfitShare + newOwner.profitSharePercentage >
                          100 && (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            {t(
                              "admin.companyFinances.validation.profitShareExceeded"
                            )}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddOwnerDialogOpen(false)}
                        >
                          {t("admin.common.cancel")}
                        </Button>
                        <Button onClick={handleAddOwner}>
                          {t("admin.companyFinances.owners.addOwner")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredOwners.map((owner) => (
                  <div
                    key={owner.id}
                    className="flex items-center justify-between p-4 border rounded-lg rtl:flex-row-reverse"
                  >
                    <div className="flex items-center gap-4 rtl:flex-row-reverse">
                      <div className="flex flex-col rtl:text-right">
                        <span className="font-medium">{owner.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {owner.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("admin.companyFinances.owners.joined")}:{" "}
                          {formatDateForLocale(owner.joinDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 rtl:flex-row-reverse">
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrencyForLocale(
                            owner.currentBalance,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.owners.currentBalance")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-blue-600">
                          {formatCurrencyForLocale(
                            owner.deposits,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.owners.deposits")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {formatCurrencyForLocale(
                            owner.withdrawals,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.owners.withdrawals")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-medium ${
                            owner.netPosition >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrencyForLocale(
                            owner.netPosition,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.owners.netPosition")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium number-container">
                          {formatPercentageForLocale(
                            owner.profitSharePercentage,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.owners.profitShare")}
                        </div>
                      </div>
                      <Badge
                        variant={
                          owner.status === "active" ? "default" : "secondary"
                        }
                      >
                        {owner.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit Share Tab */}
        <TabsContent value="profitShare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                <Percent className="h-5 w-5" />
                {t("admin.companyFinances.profitShare.title")}
              </CardTitle>
              <CardDescription>
                {t("admin.companyFinances.profitShare.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {owners.map((owner) => (
                  <div
                    key={owner.id}
                    className="flex items-center justify-between p-4 border rounded-lg rtl:flex-row-reverse"
                  >
                    <div className="flex items-center gap-4 rtl:flex-row-reverse">
                      <div className="flex flex-col rtl:text-right">
                        <span className="font-medium">{owner.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {owner.email}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 rtl:flex-row-reverse">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600 number-container">
                          {formatPercentageForLocale(
                            owner.profitSharePercentage,
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("admin.companyFinances.profitShare.percentage")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrencyForLocale(
                            1800000 * (owner.profitSharePercentage / 100),
                            i18nInstance.language
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t(
                            "admin.companyFinances.profitShare.estimatedShare"
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">{owner.status}</Badge>
                    </div>
                  </div>
                ))}

                {/* Total Allocation Summary */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between rtl:flex-row-reverse">
                    <div className="rtl:text-right">
                      <span className="font-medium">
                        {t("admin.companyFinances.profitShare.totalAllocated")}:{" "}
                      </span>
                      <span
                        className={`font-bold number-container ${
                          totalProfitShare === 100
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {formatPercentageForLocale(
                          totalProfitShare,
                          i18nInstance.language
                        )}
                      </span>
                    </div>
                    <div className="rtl:text-right">
                      <span className="font-medium">
                        {t("admin.companyFinances.profitShare.remaining")}:{" "}
                      </span>
                      <span className="font-bold text-blue-600 number-container">
                        {formatPercentageForLocale(
                          100 - totalProfitShare,
                          i18nInstance.language
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyFinances;
