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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RTLTable,
  RTLTableCell,
  RTLTableHeader,
} from "@/components/ui/rtl-provider";
import { ResponsivePagination } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useTheme } from "@/hooks/useTheme";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Search,
  Filter,
  Calendar,
  DollarSign,
  CreditCard,
  Receipt,
  Tag,
  User,
  MoreHorizontal,
} from "lucide-react";
import { ExportDialog } from "@/components/ui/export-dialog";
import { formatCurrencyForLocale, formatNumberForLocale } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

// Types
interface Expense {
  id: string;
  details: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  paidBy: string;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentDate: string;
  createdAt: string;
  updatedAt: string;
  status: "paid" | "pending" | "cancelled";
  receipt?: string;
  notes?: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  totalPayments: number;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
  totalTransactions: number;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

const ExpensesManagement: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activeTab, setActiveTab] = useState("expenses");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [expensesPerPage, setExpensesPerPage] = useState(25);

  // Dialog states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showEditPaymentMethod, setShowEditPaymentMethod] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    details: "",
    amount: "",
    categoryId: "",
    paidBy: "",
    paymentMethodId: "",
    paymentDate: "",
    notes: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });

  const [paymentMethodForm, setPaymentMethodForm] = useState({
    name: "",
    description: "",
  });

  // Selected items for editing
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] =
    useState<ExpenseCategory | null>(null);
  const [selectedPaymentMethodForEdit, setSelectedPaymentMethodForEdit] =
    useState<PaymentMethod | null>(null);

  // Get date locale based on current language
  const getDateLocale = () => {
    return i18nInstance.language === "ar" ? ar : enUS;
  };

  // Format date for current locale
  const formatDateForLocale = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, "PPP", { locale: getDateLocale() });
  };

  // Generate mock data
  useEffect(() => {
    const generateMockData = () => {
      // Mock categories
      const mockCategories: ExpenseCategory[] = [
        {
          id: "1",
          name: "Office Supplies",
          description: "Office equipment and supplies",
          totalPayments: 45,
          totalAmount: 12500,
          createdAt: "2024-01-01T00:00:00Z",
          isActive: true,
        },
        {
          id: "2",
          name: "Marketing",
          description: "Marketing and advertising expenses",
          totalPayments: 32,
          totalAmount: 45000,
          createdAt: "2024-01-01T00:00:00Z",
          isActive: true,
        },
        {
          id: "3",
          name: "Travel",
          description: "Business travel expenses",
          totalPayments: 18,
          totalAmount: 28000,
          createdAt: "2024-01-01T00:00:00Z",
          isActive: true,
        },
        {
          id: "4",
          name: "Utilities",
          description: "Electricity, water, internet, etc.",
          totalPayments: 24,
          totalAmount: 15000,
          createdAt: "2024-01-01T00:00:00Z",
          isActive: true,
        },
        {
          id: "5",
          name: "Software",
          description: "Software licenses and subscriptions",
          totalPayments: 12,
          totalAmount: 8000,
          createdAt: "2024-01-01T00:00:00Z",
          isActive: true,
        },
      ];

      // Mock payment methods
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: "1",
          name: "Bank Transfer",
          description: "Direct bank transfers",
          totalTransactions: 65,
          totalAmount: 85000,
          createdAt: "2024-01-01T00:00:00Z",
          isActive: true,
        },
        {
          id: "2",
          name: "Credit Card",
          description: "Credit card payments",
          totalTransactions: 42,
          totalAmount: 35000,
          createdAt: "2024-01-01T00:00:00Z",
          isActive: true,
        },
        {
          id: "3",
          name: "Cash",
          description: "Cash payments",
          totalTransactions: 28,
          totalAmount: 12000,
          createdAt: "2024-01-01T00:00:00Z",
          isActive: true,
        },
        {
          id: "4",
          name: "PayPal",
          description: "PayPal payments",
          totalTransactions: 15,
          totalAmount: 8000,
          createdAt: "2024-01-01T00:00:00Z",
          isActive: true,
        },
      ];

      // Mock expenses
      const mockExpenses: Expense[] = [
        {
          id: "1",
          details: "Office printer and supplies",
          amount: 2500,
          categoryId: "1",
          categoryName: "Office Supplies",
          paidBy: "Admin User",
          paymentMethodId: "1",
          paymentMethodName: "Bank Transfer",
          paymentDate: "2024-01-15T00:00:00Z",
          createdAt: "2024-01-15T00:00:00Z",
          updatedAt: "2024-01-15T00:00:00Z",
          status: "paid",
          notes: "Monthly office supplies",
        },
        {
          id: "2",
          details: "Facebook advertising campaign",
          amount: 5000,
          categoryId: "2",
          categoryName: "Marketing",
          paidBy: "Admin User",
          paymentMethodId: "2",
          paymentMethodName: "Credit Card",
          paymentDate: "2024-01-20T00:00:00Z",
          createdAt: "2024-01-20T00:00:00Z",
          updatedAt: "2024-01-20T00:00:00Z",
          status: "paid",
          notes: "Q1 marketing campaign",
        },
        {
          id: "3",
          details: "Business trip to Cairo",
          amount: 3500,
          categoryId: "3",
          categoryName: "Travel",
          paidBy: "Admin User",
          paymentMethodId: "1",
          paymentMethodName: "Bank Transfer",
          paymentDate: "2024-01-25T00:00:00Z",
          createdAt: "2024-01-25T00:00:00Z",
          updatedAt: "2024-01-25T00:00:00Z",
          status: "paid",
          notes: "Client meeting expenses",
        },
        {
          id: "4",
          details: "Internet and phone bills",
          amount: 1200,
          categoryId: "4",
          categoryName: "Utilities",
          paidBy: "Admin User",
          paymentMethodId: "3",
          paymentMethodName: "Cash",
          paymentDate: "2024-02-01T00:00:00Z",
          createdAt: "2024-02-01T00:00:00Z",
          updatedAt: "2024-02-01T00:00:00Z",
          status: "paid",
          notes: "Monthly utilities",
        },
        {
          id: "5",
          details: "Adobe Creative Suite subscription",
          amount: 1500,
          categoryId: "5",
          categoryName: "Software",
          paidBy: "Admin User",
          paymentMethodId: "2",
          paymentMethodName: "Credit Card",
          paymentDate: "2024-02-05T00:00:00Z",
          createdAt: "2024-02-05T00:00:00Z",
          updatedAt: "2024-02-05T00:00:00Z",
          status: "paid",
          notes: "Annual software license",
        },
      ];

      setCategories(mockCategories);
      setPaymentMethods(mockPaymentMethods);
      setExpenses(mockExpenses);
    };

    generateMockData();
  }, []);

  // Filter expenses based on search and filters
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.paidBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.categoryName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || expense.categoryId === selectedCategory;
    const matchesPaymentMethod =
      selectedPaymentMethod === "all" ||
      expense.paymentMethodId === selectedPaymentMethod;
    const matchesStatus =
      selectedStatus === "all" || expense.status === selectedStatus;

    return (
      matchesSearch && matchesCategory && matchesPaymentMethod && matchesStatus
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredExpenses.length / expensesPerPage);
  const startIndex = (currentPage - 1) * expensesPerPage;
  const endIndex = startIndex + expensesPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedPaymentMethod, selectedStatus]);

  // Calculate totals
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const totalCategories = categories.length;
  const totalPaymentMethods = paymentMethods.length;

  // Handle expense form changes
  const handleExpenseFormChange = (field: string, value: string) => {
    setExpenseForm((prev) => ({ ...prev, [field]: value }));
  };

  // Handle category form changes
  const handleCategoryFormChange = (field: string, value: string) => {
    setCategoryForm((prev) => ({ ...prev, [field]: value }));
  };

  // Handle payment method form changes
  const handlePaymentMethodFormChange = (field: string, value: string) => {
    setPaymentMethodForm((prev) => ({ ...prev, [field]: value }));
  };

  // Add new expense
  const handleAddExpense = () => {
    if (
      !expenseForm.details ||
      !expenseForm.amount ||
      !expenseForm.categoryId ||
      !expenseForm.paidBy ||
      !expenseForm.paymentMethodId ||
      !expenseForm.paymentDate
    ) {
      toast({
        title: t("expenses.toast.error"),
        description: t("expenses.toast.errorDesc"),
        variant: "destructive",
      });
      return;
    }

    const category = categories.find((c) => c.id === expenseForm.categoryId);
    const paymentMethod = paymentMethods.find(
      (p) => p.id === expenseForm.paymentMethodId
    );

    const newExpense: Expense = {
      id: Date.now().toString(),
      details: expenseForm.details,
      amount: parseFloat(expenseForm.amount),
      categoryId: expenseForm.categoryId,
      categoryName: category?.name || "",
      paidBy: expenseForm.paidBy,
      paymentMethodId: expenseForm.paymentMethodId,
      paymentMethodName: paymentMethod?.name || "",
      paymentDate: expenseForm.paymentDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "paid",
      notes: expenseForm.notes,
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setExpenseForm({
      details: "",
      amount: "",
      categoryId: "",
      paidBy: "",
      paymentMethodId: "",
      paymentDate: "",
      notes: "",
    });
    setShowAddExpense(false);

    toast({
      title: t("expenses.toast.expenseAdded"),
      description: t("expenses.toast.expenseAddedDesc"),
    });
  };

  // Add new category
  const handleAddCategory = () => {
    if (!categoryForm.name) {
      toast({
        title: t("expenses.toast.error"),
        description: t("expenses.toast.errorDesc"),
        variant: "destructive",
      });
      return;
    }

    const newCategory: ExpenseCategory = {
      id: Date.now().toString(),
      name: categoryForm.name,
      description: categoryForm.description,
      totalPayments: 0,
      totalAmount: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    setCategories((prev) => [newCategory, ...prev]);
    setCategoryForm({ name: "", description: "" });
    setShowAddCategory(false);

    toast({
      title: t("expenses.toast.categoryAdded"),
      description: t("expenses.toast.categoryAddedDesc"),
    });
  };

  // Add new payment method
  const handleAddPaymentMethod = () => {
    if (!paymentMethodForm.name) {
      toast({
        title: t("expenses.toast.error"),
        description: t("expenses.toast.errorDesc"),
        variant: "destructive",
      });
      return;
    }

    const newPaymentMethod: PaymentMethod = {
      id: Date.now().toString(),
      name: paymentMethodForm.name,
      description: paymentMethodForm.description,
      totalTransactions: 0,
      totalAmount: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    setPaymentMethods((prev) => [newPaymentMethod, ...prev]);
    setPaymentMethodForm({ name: "", description: "" });
    setShowAddPaymentMethod(false);

    toast({
      title: t("expenses.toast.paymentMethodAdded"),
      description: t("expenses.toast.paymentMethodAddedDesc"),
    });
  };

  // Edit expense
  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseForm({
      details: expense.details,
      amount: expense.amount.toString(),
      categoryId: expense.categoryId,
      paidBy: expense.paidBy,
      paymentMethodId: expense.paymentMethodId,
      paymentDate: expense.paymentDate.split("T")[0],
      notes: expense.notes || "",
    });
    setShowEditExpense(true);
  };

  // Save expense changes
  const handleSaveExpenseChanges = () => {
    if (!selectedExpense) return;

    const category = categories.find((c) => c.id === expenseForm.categoryId);
    const paymentMethod = paymentMethods.find(
      (p) => p.id === expenseForm.paymentMethodId
    );

    const updatedExpense: Expense = {
      ...selectedExpense,
      details: expenseForm.details,
      amount: parseFloat(expenseForm.amount),
      categoryId: expenseForm.categoryId,
      categoryName: category?.name || "",
      paidBy: expenseForm.paidBy,
      paymentMethodId: expenseForm.paymentMethodId,
      paymentMethodName: paymentMethod?.name || "",
      paymentDate: expenseForm.paymentDate,
      notes: expenseForm.notes,
      updatedAt: new Date().toISOString(),
    };

    setExpenses((prev) =>
      prev.map((exp) => (exp.id === selectedExpense.id ? updatedExpense : exp))
    );
    setShowEditExpense(false);
    setSelectedExpense(null);

    toast({
      title: t("expenses.toast.expenseUpdated"),
      description: t("expenses.toast.expenseUpdatedDesc"),
    });
  };

  // Edit category
  const handleEditCategory = (category: ExpenseCategory) => {
    setSelectedCategoryForEdit(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
    });
    setShowEditCategory(true);
  };

  // Save category changes
  const handleSaveCategoryChanges = () => {
    if (!selectedCategoryForEdit) return;

    const updatedCategory: ExpenseCategory = {
      ...selectedCategoryForEdit,
      name: categoryForm.name,
      description: categoryForm.description,
      updatedAt: new Date().toISOString(),
    };

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === selectedCategoryForEdit.id ? updatedCategory : cat
      )
    );
    setShowEditCategory(false);
    setSelectedCategoryForEdit(null);

    toast({
      title: t("expenses.toast.categoryUpdated"),
      description: t("expenses.toast.categoryUpdatedDesc"),
    });
  };

  // Edit payment method
  const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethodForEdit(paymentMethod);
    setPaymentMethodForm({
      name: paymentMethod.name,
      description: paymentMethod.description || "",
    });
    setShowEditPaymentMethod(true);
  };

  // Save payment method changes
  const handleSavePaymentMethodChanges = () => {
    if (!selectedPaymentMethodForEdit) return;

    const updatedPaymentMethod: PaymentMethod = {
      ...selectedPaymentMethodForEdit,
      name: paymentMethodForm.name,
      description: paymentMethodForm.description,
      updatedAt: new Date().toISOString(),
    };

    setPaymentMethods((prev) =>
      prev.map((pm) =>
        pm.id === selectedPaymentMethodForEdit.id ? updatedPaymentMethod : pm
      )
    );
    setShowEditPaymentMethod(false);
    setSelectedPaymentMethodForEdit(null);

    toast({
      title: t("expenses.toast.paymentMethodUpdated"),
      description: t("expenses.toast.paymentMethodUpdatedDesc"),
    });
  };

  // Delete expense
  const handleDeleteExpense = (expenseId: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
    toast({
      title: t("expenses.toast.expenseDeleted"),
      description: t("expenses.toast.expenseDeletedDesc"),
    });
  };

  // Delete category
  const handleDeleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
    toast({
      title: t("expenses.toast.categoryDeleted"),
      description: t("expenses.toast.categoryDeletedDesc"),
    });
  };

  // Delete payment method
  const handleDeletePaymentMethod = (paymentMethodId: string) => {
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== paymentMethodId));
    toast({
      title: t("expenses.toast.paymentMethodDeleted"),
      description: t("expenses.toast.paymentMethodDeletedDesc"),
    });
  };

  // Export expenses
  const handleExportExpenses = () => {
    toast({
      title: t("expenses.toast.exportSuccess"),
      description: t("expenses.toast.exportSuccessDesc"),
    });
  };

  return (
    <div
      className="space-y-6"
      dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="mb-8 rtl:text-right">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("expenses.title")}
        </h2>
        <p className="text-muted-foreground">{t("expenses.subtitle")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("expenses.stats.totalExpenses")}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold currency-container">
              {formatCurrencyForLocale(totalExpenses, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("expenses.stats.totalAmount")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("expenses.stats.categories")}
              </CardTitle>
            </div>
            <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(totalCategories, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("expenses.stats.activeCategories")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("expenses.stats.paymentMethods")}
              </CardTitle>
            </div>
            <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(totalPaymentMethods, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("expenses.stats.activeMethods")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 rtl:flex-row-reverse">
          <TabsTrigger value="expenses" className="rtl:text-right">
            {t("expenses.tabs.expenses")}
          </TabsTrigger>
          <TabsTrigger value="categories" className="rtl:text-right">
            {t("expenses.tabs.categories")}
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="rtl:text-right">
            {t("expenses.tabs.paymentMethods")}
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold rtl:text-right">
                {t("expenses.expenses.title")}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground rtl:text-right">
                {t("expenses.expenses.subtitle", {
                  count: filteredExpenses.length,
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <ExportDialog
                data={filteredExpenses}
                columns={[
                  { header: "Details", key: "details", width: 30 },
                  {
                    header: "Amount",
                    key: "amount",
                    width: 20,
                    formatter: (value) =>
                      formatCurrencyForLocale(value, i18nInstance.language),
                  },
                  { header: "Category", key: "categoryName", width: 20 },
                  { header: "Paid By", key: "paidBy", width: 20 },
                  {
                    header: "Payment Method",
                    key: "paymentMethodName",
                    width: 20,
                  },
                  {
                    header: "Payment Date",
                    key: "paymentDate",
                    width: 20,
                    formatter: formatDateForLocale,
                  },
                  { header: "Status", key: "status", width: 15 },
                ]}
                title={t("expenses.expenses.title")}
                subtitle={t("expenses.expenses.subtitle", {
                  count: filteredExpenses.length,
                })}
                filename="expenses"
              >
                <Button
                  variant="outline"
                  className="flex items-center gap-2 rtl:flex-row-reverse text-xs sm:text-sm"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">
                    {t("expenses.actions.export")}
                  </span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </ExportDialog>

              <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 rtl:flex-row-reverse text-xs sm:text-sm">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">
                      {t("expenses.actions.addExpense")}
                    </span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {t("expenses.dialogs.addExpense.title")}
                    </DialogTitle>
                    <DialogDescription className="rtl:text-right">
                      {t("expenses.dialogs.addExpense.subtitle")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="details" className="rtl:text-right">
                        {t("expenses.form.details")}
                      </Label>
                      <Textarea
                        id="details"
                        value={expenseForm.details}
                        onChange={(e) =>
                          handleExpenseFormChange("details", e.target.value)
                        }
                        placeholder={t("expenses.form.detailsPlaceholder")}
                        className="rtl:text-right"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="rtl:text-right">
                          {t("expenses.form.amount")}
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          value={expenseForm.amount}
                          onChange={(e) =>
                            handleExpenseFormChange("amount", e.target.value)
                          }
                          placeholder={t("expenses.form.amountPlaceholder")}
                          className="rtl:text-right"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category" className="rtl:text-right">
                          {t("expenses.form.category")}
                        </Label>
                        <Select
                          value={expenseForm.categoryId}
                          onValueChange={(value) =>
                            handleExpenseFormChange("categoryId", value)
                          }
                        >
                          <SelectTrigger className="rtl:text-right">
                            <SelectValue
                              placeholder={t("expenses.form.selectCategory")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                      <div className="space-y-2">
                        <Label htmlFor="paidBy" className="rtl:text-right">
                          {t("expenses.form.paidBy")}
                        </Label>
                        <Input
                          id="paidBy"
                          value={expenseForm.paidBy}
                          onChange={(e) =>
                            handleExpenseFormChange("paidBy", e.target.value)
                          }
                          placeholder={t("expenses.form.paidByPlaceholder")}
                          className="rtl:text-right"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="paymentMethod"
                          className="rtl:text-right"
                        >
                          {t("expenses.form.paymentMethod")}
                        </Label>
                        <Select
                          value={expenseForm.paymentMethodId}
                          onValueChange={(value) =>
                            handleExpenseFormChange("paymentMethodId", value)
                          }
                        >
                          <SelectTrigger className="rtl:text-right">
                            <SelectValue
                              placeholder={t(
                                "expenses.form.selectPaymentMethod"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentDate" className="rtl:text-right">
                        {t("expenses.form.paymentDate")}
                      </Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        value={expenseForm.paymentDate}
                        onChange={(e) =>
                          handleExpenseFormChange("paymentDate", e.target.value)
                        }
                        className="rtl:text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="rtl:text-right">
                        {t("expenses.form.notes")}
                      </Label>
                      <Textarea
                        id="notes"
                        value={expenseForm.notes}
                        onChange={(e) =>
                          handleExpenseFormChange("notes", e.target.value)
                        }
                        placeholder={t("expenses.form.notesPlaceholder")}
                        className="rtl:text-right"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 rtl:flex-row-reverse">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddExpense(false)}
                    >
                      {t("admin.common.cancel")}
                    </Button>
                    <Button onClick={handleAddExpense}>
                      {t("expenses.actions.addExpense")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 rtl:flex-row-reverse">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 rtl:left-auto rtl:right-3" />
              <Input
                placeholder={t("expenses.search.placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pl-3 rtl:pr-10"
              />
            </div>
            <div className="flex gap-2 rtl:flex-row-reverse">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[150px] rtl:text-right">
                  <SelectValue placeholder={t("expenses.filters.category")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("expenses.filters.allCategories")}
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedPaymentMethod}
                onValueChange={setSelectedPaymentMethod}
              >
                <SelectTrigger className="w-[150px] rtl:text-right">
                  <SelectValue
                    placeholder={t("expenses.filters.paymentMethod")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("expenses.filters.allMethods")}
                  </SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[120px] rtl:text-right">
                  <SelectValue placeholder={t("expenses.filters.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("expenses.filters.allStatuses")}
                  </SelectItem>
                  <SelectItem value="paid">
                    {t("expenses.status.paid")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("expenses.status.pending")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("expenses.status.cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expenses Table */}
          <Card>
            <CardContent className="p-0">
              <div className="relative w-full overflow-auto">
                <RTLTable>
                  <TableHeader>
                    <TableRow>
                      <RTLTableHeader>
                        {t("expenses.table.details")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.amount")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.category")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.paidBy")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.paymentMethod")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.paymentDate")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.status")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("admin.common.actions")}
                      </RTLTableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <RTLTableCell>
                          <div>
                            <div className="font-medium">{expense.details}</div>
                            {expense.notes && (
                              <div className="text-sm text-muted-foreground">
                                {expense.notes}
                              </div>
                            )}
                          </div>
                        </RTLTableCell>
                        <RTLTableCell>
                          <div className="font-medium currency-container">
                            {formatCurrencyForLocale(
                              expense.amount,
                              i18nInstance.language
                            )}
                          </div>
                        </RTLTableCell>
                        <RTLTableCell>
                          <Badge variant="secondary">
                            {expense.categoryName}
                          </Badge>
                        </RTLTableCell>
                        <RTLTableCell>{expense.paidBy}</RTLTableCell>
                        <RTLTableCell>{expense.paymentMethodName}</RTLTableCell>
                        <RTLTableCell>
                          {formatDateForLocale(expense.paymentDate)}
                        </RTLTableCell>
                        <RTLTableCell>
                          <Badge
                            variant={
                              expense.status === "paid"
                                ? "default"
                                : expense.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {t(`expenses.status.${expense.status}`)}
                          </Badge>
                        </RTLTableCell>
                        <RTLTableCell>
                          <div className="flex items-center gap-2 rtl:flex-row-reverse">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditExpense(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RTLTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </RTLTable>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {filteredExpenses.length > 0 && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("expenses.pagination.showing")} ${
                startIndex + 1
              }-${Math.min(endIndex, filteredExpenses.length)} ${t(
                "expenses.pagination.of"
              )} ${formatNumberForLocale(
                filteredExpenses.length,
                i18nInstance.language
              )} ${t("expenses.pagination.results")}`}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={filteredExpenses.length}
              itemsPerPage={expensesPerPage}
              className="mt-4"
            />
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {/* Header with Actions */}
          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <div>
              <h3 className="text-lg font-semibold rtl:text-right">
                {t("expenses.categories.title")}
              </h3>
              <p className="text-sm text-muted-foreground rtl:text-right">
                {t("expenses.categories.subtitle", {
                  count: categories.length,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Plus className="h-4 w-4" />
                    {t("expenses.actions.addCategory")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>
                      {t("expenses.dialogs.addCategory.title")}
                    </DialogTitle>
                    <DialogDescription className="rtl:text-right">
                      {t("expenses.dialogs.addCategory.subtitle")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryName" className="rtl:text-right">
                        {t("expenses.form.categoryName")}
                      </Label>
                      <Input
                        id="categoryName"
                        value={categoryForm.name}
                        onChange={(e) =>
                          handleCategoryFormChange("name", e.target.value)
                        }
                        placeholder={t("expenses.form.categoryNamePlaceholder")}
                        className="rtl:text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="categoryDescription"
                        className="rtl:text-right"
                      >
                        {t("expenses.form.description")}
                      </Label>
                      <Textarea
                        id="categoryDescription"
                        value={categoryForm.description}
                        onChange={(e) =>
                          handleCategoryFormChange(
                            "description",
                            e.target.value
                          )
                        }
                        placeholder={t("expenses.form.descriptionPlaceholder")}
                        className="rtl:text-right"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 rtl:flex-row-reverse">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddCategory(false)}
                    >
                      {t("admin.common.cancel")}
                    </Button>
                    <Button onClick={handleAddCategory}>
                      {t("expenses.actions.addCategory")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Categories Table */}
          <Card>
            <CardContent className="p-0">
              <div className="relative w-full overflow-auto">
                <RTLTable>
                  <TableHeader>
                    <TableRow>
                      <RTLTableHeader>
                        {t("expenses.table.name")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.description")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.totalPayments")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.totalAmount")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.status")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("admin.common.actions")}
                      </RTLTableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <RTLTableCell className="font-medium">
                          {category.name}
                        </RTLTableCell>
                        <RTLTableCell>
                          {category.description ||
                            t("expenses.table.noDescription")}
                        </RTLTableCell>
                        <RTLTableCell>
                          {formatNumberForLocale(
                            category.totalPayments,
                            i18nInstance.language
                          )}
                        </RTLTableCell>
                        <RTLTableCell>
                          <div className="font-medium currency-container">
                            {formatCurrencyForLocale(
                              category.totalAmount,
                              i18nInstance.language
                            )}
                          </div>
                        </RTLTableCell>
                        <RTLTableCell>
                          <Badge
                            variant={
                              category.isActive ? "default" : "secondary"
                            }
                          >
                            {category.isActive
                              ? t("expenses.status.active")
                              : t("expenses.status.inactive")}
                          </Badge>
                        </RTLTableCell>
                        <RTLTableCell>
                          <div className="flex items-center gap-2 rtl:flex-row-reverse">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RTLTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </RTLTable>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-6">
          {/* Header with Actions */}
          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <div>
              <h3 className="text-lg font-semibold rtl:text-right">
                {t("expenses.paymentMethods.title")}
              </h3>
              <p className="text-sm text-muted-foreground rtl:text-right">
                {t("expenses.paymentMethods.subtitle", {
                  count: paymentMethods.length,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog
                open={showAddPaymentMethod}
                onOpenChange={setShowAddPaymentMethod}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Plus className="h-4 w-4" />
                    {t("expenses.actions.addPaymentMethod")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>
                      {t("expenses.dialogs.addPaymentMethod.title")}
                    </DialogTitle>
                    <DialogDescription className="rtl:text-right">
                      {t("expenses.dialogs.addPaymentMethod.subtitle")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="paymentMethodName"
                        className="rtl:text-right"
                      >
                        {t("expenses.form.paymentMethodName")}
                      </Label>
                      <Input
                        id="paymentMethodName"
                        value={paymentMethodForm.name}
                        onChange={(e) =>
                          handlePaymentMethodFormChange("name", e.target.value)
                        }
                        placeholder={t(
                          "expenses.form.paymentMethodNamePlaceholder"
                        )}
                        className="rtl:text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="paymentMethodDescription"
                        className="rtl:text-right"
                      >
                        {t("expenses.form.description")}
                      </Label>
                      <Textarea
                        id="paymentMethodDescription"
                        value={paymentMethodForm.description}
                        onChange={(e) =>
                          handlePaymentMethodFormChange(
                            "description",
                            e.target.value
                          )
                        }
                        placeholder={t("expenses.form.descriptionPlaceholder")}
                        className="rtl:text-right"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 rtl:flex-row-reverse">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddPaymentMethod(false)}
                    >
                      {t("admin.common.cancel")}
                    </Button>
                    <Button onClick={handleAddPaymentMethod}>
                      {t("expenses.actions.addPaymentMethod")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Payment Methods Table */}
          <Card>
            <CardContent className="p-0">
              <div className="relative w-full overflow-auto">
                <RTLTable>
                  <TableHeader>
                    <TableRow>
                      <RTLTableHeader>
                        {t("expenses.table.name")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.description")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.totalTransactions")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.totalAmount")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.status")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("admin.common.actions")}
                      </RTLTableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((method) => (
                      <TableRow key={method.id}>
                        <RTLTableCell className="font-medium">
                          {method.name}
                        </RTLTableCell>
                        <RTLTableCell>
                          {method.description ||
                            t("expenses.table.noDescription")}
                        </RTLTableCell>
                        <RTLTableCell>
                          {formatNumberForLocale(
                            method.totalTransactions,
                            i18nInstance.language
                          )}
                        </RTLTableCell>
                        <RTLTableCell>
                          <div className="font-medium currency-container">
                            {formatCurrencyForLocale(
                              method.totalAmount,
                              i18nInstance.language
                            )}
                          </div>
                        </RTLTableCell>
                        <RTLTableCell>
                          <Badge
                            variant={method.isActive ? "default" : "secondary"}
                          >
                            {method.isActive
                              ? t("expenses.status.active")
                              : t("expenses.status.inactive")}
                          </Badge>
                        </RTLTableCell>
                        <RTLTableCell>
                          <div className="flex items-center gap-2 rtl:flex-row-reverse">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPaymentMethod(method)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeletePaymentMethod(method.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RTLTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </RTLTable>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditExpense} onOpenChange={setShowEditExpense}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("expenses.dialogs.editExpense.title")}</DialogTitle>
            <DialogDescription className="rtl:text-right">
              {t("expenses.dialogs.editExpense.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editDetails" className="rtl:text-right">
                {t("expenses.form.details")}
              </Label>
              <Textarea
                id="editDetails"
                value={expenseForm.details}
                onChange={(e) =>
                  handleExpenseFormChange("details", e.target.value)
                }
                placeholder={t("expenses.form.detailsPlaceholder")}
                className="rtl:text-right"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
              <div className="space-y-2">
                <Label htmlFor="editAmount" className="rtl:text-right">
                  {t("expenses.form.amount")}
                </Label>
                <Input
                  id="editAmount"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    handleExpenseFormChange("amount", e.target.value)
                  }
                  placeholder={t("expenses.form.amountPlaceholder")}
                  className="rtl:text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategory" className="rtl:text-right">
                  {t("expenses.form.category")}
                </Label>
                <Select
                  value={expenseForm.categoryId}
                  onValueChange={(value) =>
                    handleExpenseFormChange("categoryId", value)
                  }
                >
                  <SelectTrigger className="rtl:text-right">
                    <SelectValue
                      placeholder={t("expenses.form.selectCategory")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
              <div className="space-y-2">
                <Label htmlFor="editPaidBy" className="rtl:text-right">
                  {t("expenses.form.paidBy")}
                </Label>
                <Input
                  id="editPaidBy"
                  value={expenseForm.paidBy}
                  onChange={(e) =>
                    handleExpenseFormChange("paidBy", e.target.value)
                  }
                  placeholder={t("expenses.form.paidByPlaceholder")}
                  className="rtl:text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPaymentMethod" className="rtl:text-right">
                  {t("expenses.form.paymentMethod")}
                </Label>
                <Select
                  value={expenseForm.paymentMethodId}
                  onValueChange={(value) =>
                    handleExpenseFormChange("paymentMethodId", value)
                  }
                >
                  <SelectTrigger className="rtl:text-right">
                    <SelectValue
                      placeholder={t("expenses.form.selectPaymentMethod")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPaymentDate" className="rtl:text-right">
                {t("expenses.form.paymentDate")}
              </Label>
              <Input
                id="editPaymentDate"
                type="date"
                value={expenseForm.paymentDate}
                onChange={(e) =>
                  handleExpenseFormChange("paymentDate", e.target.value)
                }
                className="rtl:text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNotes" className="rtl:text-right">
                {t("expenses.form.notes")}
              </Label>
              <Textarea
                id="editNotes"
                value={expenseForm.notes}
                onChange={(e) =>
                  handleExpenseFormChange("notes", e.target.value)
                }
                placeholder={t("expenses.form.notesPlaceholder")}
                className="rtl:text-right"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 rtl:flex-row-reverse">
            <Button variant="outline" onClick={() => setShowEditExpense(false)}>
              {t("admin.common.cancel")}
            </Button>
            <Button onClick={handleSaveExpenseChanges}>
              {t("expenses.actions.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditCategory} onOpenChange={setShowEditCategory}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {t("expenses.dialogs.editCategory.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right">
              {t("expenses.dialogs.editCategory.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editCategoryName" className="rtl:text-right">
                {t("expenses.form.categoryName")}
              </Label>
              <Input
                id="editCategoryName"
                value={categoryForm.name}
                onChange={(e) =>
                  handleCategoryFormChange("name", e.target.value)
                }
                placeholder={t("expenses.form.categoryNamePlaceholder")}
                className="rtl:text-right"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="editCategoryDescription"
                className="rtl:text-right"
              >
                {t("expenses.form.description")}
              </Label>
              <Textarea
                id="editCategoryDescription"
                value={categoryForm.description}
                onChange={(e) =>
                  handleCategoryFormChange("description", e.target.value)
                }
                placeholder={t("expenses.form.descriptionPlaceholder")}
                className="rtl:text-right"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setShowEditCategory(false)}
            >
              {t("admin.common.cancel")}
            </Button>
            <Button onClick={handleSaveCategoryChanges}>
              {t("expenses.actions.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Method Dialog */}
      <Dialog
        open={showEditPaymentMethod}
        onOpenChange={setShowEditPaymentMethod}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {t("expenses.dialogs.editPaymentMethod.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right">
              {t("expenses.dialogs.editPaymentMethod.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editPaymentMethodName" className="rtl:text-right">
                {t("expenses.form.paymentMethodName")}
              </Label>
              <Input
                id="editPaymentMethodName"
                value={paymentMethodForm.name}
                onChange={(e) =>
                  handlePaymentMethodFormChange("name", e.target.value)
                }
                placeholder={t("expenses.form.paymentMethodNamePlaceholder")}
                className="rtl:text-right"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="editPaymentMethodDescription"
                className="rtl:text-right"
              >
                {t("expenses.form.description")}
              </Label>
              <Textarea
                id="editPaymentMethodDescription"
                value={paymentMethodForm.description}
                onChange={(e) =>
                  handlePaymentMethodFormChange("description", e.target.value)
                }
                placeholder={t("expenses.form.descriptionPlaceholder")}
                className="rtl:text-right"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setShowEditPaymentMethod(false)}
            >
              {t("admin.common.cancel")}
            </Button>
            <Button onClick={handleSavePaymentMethodChanges}>
              {t("expenses.actions.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensesManagement;
