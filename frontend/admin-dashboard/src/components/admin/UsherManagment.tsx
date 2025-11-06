import React, { useState, useMemo, useEffect } from "react";
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
  UserCheck,
  UserX,
  Calendar,
  MapPin,
  Users,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO, isAfter } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyForLocale } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";

interface Usher {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "suspended";
  role: "senior" | "junior" | "supervisor" | "coordinator";
  hireDate: string;
  lastActive: string;
  totalEvents: number;
  rating: number;
  assignedEvents: string[];
  location: string;
  experience: number;
  hourlyRate: number;
  totalHours: number;
  performance: "excellent" | "good" | "average" | "needs_improvement";
  isTeamLeader: boolean;
}

type Event = {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  organizer: string;
  category: string;
};

const UsherManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<string>("all");
  const [selectedUsher, setSelectedUsher] = useState<Usher | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignEventsDialogOpen, setIsAssignEventsDialogOpen] =
    useState(false);
  const [isAddUsherDialogOpen, setIsAddUsherDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ushersPerPage, setUshersPerPage] = useState(10);
  const [tempAssignedEvents, setTempAssignedEvents] = useState<string[]>([]);

  // Get date locale based on current language
  const getDateLocale = () => {
    return i18n.language === "ar" ? ar : enUS;
  };

  // Mock ushers data
  const [ushers, setUshers] = useState<Usher[]>([
    {
      id: "1",
      name: t("admin.ushers.mock.ahmedHassan"),
      email: "ahmed.hassan@example.com",
      phone: "+20 10 1234 5678",
      status: "active",
      role: "senior",
      hireDate: "2024-01-15",
      lastActive: "2025-08-15T10:30:00",
      totalEvents: 45,
      rating: 4.8,
      assignedEvents: ["E001", "E002", "E003"],
      location: "Cairo",
      experience: 3,
      hourlyRate: 50,
      totalHours: 1200,
      performance: "excellent",
      isTeamLeader: false,
    },
    {
      id: "2",
      name: t("admin.ushers.mock.sarahMohamed"),
      email: "sarah.mohamed@example.com",
      phone: "+20 10 2345 6789",
      status: "active",
      role: "junior",
      hireDate: "2024-03-20",
      lastActive: "2025-08-14T15:45:00",
      totalEvents: 28,
      rating: 4.2,
      assignedEvents: ["E001", "E004"],
      location: "Alexandria",
      experience: 1,
      hourlyRate: 35,
      totalHours: 800,
      performance: "good",
      isTeamLeader: false,
    },
    {
      id: "3",
      name: t("admin.ushers.mock.omarAli"),
      email: "omar.ali@example.com",
      phone: "+20 10 3456 7890",
      status: "inactive",
      role: "supervisor",
      hireDate: "2023-06-10",
      lastActive: "2025-07-20T09:15:00",
      totalEvents: 62,
      rating: 4.6,
      assignedEvents: ["E002"],
      location: "Giza",
      experience: 4,
      hourlyRate: 60,
      totalHours: 1800,
      performance: "excellent",
      isTeamLeader: false,
    },
    {
      id: "4",
      name: t("admin.ushers.mock.fatimaAhmed"),
      email: "fatima.ahmed@example.com",
      phone: "+20 10 4567 8901",
      status: "active",
      role: "coordinator",
      hireDate: "2023-09-15",
      lastActive: "2025-08-16T11:00:00",
      totalEvents: 78,
      rating: 4.9,
      assignedEvents: ["E001", "E002", "E003", "E004"],
      location: "Cairo",
      experience: 5,
      hourlyRate: 70,
      totalHours: 2200,
      performance: "excellent",
      isTeamLeader: true,
    },
    {
      id: "5",
      name: t("admin.ushers.mock.youssefIbrahim"),
      email: "youssef.ibrahim@example.com",
      phone: "+20 10 5678 9012",
      status: "suspended",
      role: "junior",
      hireDate: "2024-08-05",
      lastActive: "2025-08-10T14:20:00",
      totalEvents: 15,
      rating: 3.2,
      assignedEvents: [],
      location: "Alexandria",
      experience: 1,
      hourlyRate: 35,
      totalHours: 400,
      performance: "needs_improvement",
      isTeamLeader: false,
    },
    {
      id: "6",
      name: t("admin.ushers.mock.nourHassan"),
      email: "nour.hassan@example.com",
      phone: "+20 10 6789 0123",
      status: "active",
      role: "senior",
      hireDate: "2024-05-10",
      lastActive: "2025-08-17T14:30:00",
      totalEvents: 32,
      rating: 4.4,
      assignedEvents: ["E003", "E004"],
      location: "Giza",
      experience: 2,
      hourlyRate: 50,
      totalHours: 950,
      performance: "good",
      isTeamLeader: false,
    },
    {
      id: "7",
      name: t("admin.ushers.mock.mariamAli"),
      email: "mariam.ali@example.com",
      phone: "+20 10 7890 1234",
      status: "active",
      role: "junior",
      hireDate: "2024-07-15",
      lastActive: "2025-08-18T09:15:00",
      totalEvents: 18,
      rating: 4.0,
      assignedEvents: ["E001"],
      location: "Cairo",
      experience: 1,
      hourlyRate: 35,
      totalHours: 600,
      performance: "average",
      isTeamLeader: false,
    },
    {
      id: "8",
      name: t("admin.ushers.mock.karimHassan"),
      email: "karim.hassan@example.com",
      phone: "+20 10 8901 2345",
      status: "active",
      role: "supervisor",
      hireDate: "2023-12-01",
      lastActive: "2025-08-19T10:30:00",
      totalEvents: 55,
      rating: 4.7,
      assignedEvents: ["E002", "E003"],
      location: "Alexandria",
      experience: 3,
      hourlyRate: 60,
      totalHours: 1500,
      performance: "excellent",
      isTeamLeader: false,
    },
    {
      id: "9",
      name: t("admin.ushers.mock.laylaAhmed"),
      email: "layla.ahmed@example.com",
      phone: "+20 10 9012 3456",
      status: "inactive",
      role: "junior",
      hireDate: "2024-02-20",
      lastActive: "2025-07-10T12:20:00",
      totalEvents: 22,
      rating: 3.8,
      assignedEvents: [],
      location: "Giza",
      experience: 1,
      hourlyRate: 35,
      totalHours: 500,
      performance: "average",
      isTeamLeader: false,
    },
    {
      id: "10",
      name: t("admin.ushers.mock.hassanAli"),
      email: "hassan.ali@example.com",
      phone: "+20 10 0123 4567",
      status: "active",
      role: "senior",
      hireDate: "2024-04-05",
      lastActive: "2025-08-20T15:45:00",
      totalEvents: 38,
      rating: 4.5,
      assignedEvents: ["E001", "E004"],
      location: "Cairo",
      experience: 2,
      hourlyRate: 50,
      totalHours: 1100,
      performance: "good",
      isTeamLeader: false,
    },
  ]);

  // Mock events data
  const events = useMemo(
    (): Event[] => [
      {
        id: "E001",
        title: t("admin.ushers.mock.events.concert2025"),
        date: "2025-09-15",
        venue: t("admin.ushers.mock.venues.cairoOpera"),
        status: "upcoming",
        organizer: t("admin.ushers.mock.organizers.musicCorp"),
        category: "Concert",
      },
      {
        id: "E002",
        title: t("admin.ushers.mock.events.festival2025"),
        date: "2025-10-20",
        venue: t("admin.ushers.mock.venues.alexandriaCenter"),
        status: "upcoming",
        organizer: t("admin.ushers.mock.organizers.festivalOrg"),
        category: "Festival",
      },
      {
        id: "E003",
        title: t("admin.ushers.mock.events.exhibition2025"),
        date: "2025-11-10",
        venue: t("admin.ushers.mock.venues.gizaMuseum"),
        status: "upcoming",
        organizer: t("admin.ushers.mock.organizers.artGallery"),
        category: "Exhibition",
      },
      {
        id: "E004",
        title: t("admin.ushers.mock.events.sports2025"),
        date: "2025-12-05",
        venue: t("admin.ushers.mock.venues.cairoStadium"),
        status: "upcoming",
        organizer: t("admin.ushers.mock.organizers.sportsLeague"),
        category: "Sports",
      },
    ],
    [t]
  );

  // Filter ushers based on search and filters
  const filteredUshers = useMemo(() => {
    return ushers.filter((usher) => {
      const matchesSearch =
        usher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usher.phone.includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" || usher.status === statusFilter;
      const matchesRole = roleFilter === "all" || usher.role === roleFilter;
      const matchesPerformance =
        performanceFilter === "all" || usher.performance === performanceFilter;

      return (
        matchesSearch && matchesStatus && matchesRole && matchesPerformance
      );
    });
  }, [ushers, searchTerm, statusFilter, roleFilter, performanceFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredUshers.length / ushersPerPage);
  const startIndex = (currentPage - 1) * ushersPerPage;
  const endIndex = startIndex + ushersPerPage;
  const paginatedUshers = filteredUshers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, performanceFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("admin.ushers.status.active");
      case "inactive":
        return t("admin.ushers.status.inactive");
      case "suspended":
        return t("admin.ushers.status.suspended");
      default:
        return status;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "coordinator":
        return "bg-purple-100 text-purple-800";
      case "supervisor":
        return "bg-blue-100 text-blue-800";
      case "senior":
        return "bg-green-100 text-green-800";
      case "junior":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "coordinator":
        return t("admin.ushers.roles.coordinator");
      case "supervisor":
        return t("admin.ushers.roles.supervisor");
      case "senior":
        return t("admin.ushers.roles.senior");
      case "junior":
        return t("admin.ushers.roles.junior");
      default:
        return role;
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "average":
        return "bg-yellow-100 text-yellow-800";
      case "needs_improvement":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPerformanceText = (performance: string) => {
    switch (performance) {
      case "excellent":
        return t("admin.ushers.performance.excellent");
      case "good":
        return t("admin.ushers.performance.good");
      case "average":
        return t("admin.ushers.performance.average");
      case "needs_improvement":
        return t("admin.ushers.performance.needsImprovement");
      default:
        return performance;
    }
  };

  const handleEditUsher = (usher: Usher) => {
    setSelectedUsher(usher);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUsher = (usherId: string) => {
    toast({
      title: t("admin.ushers.toast.usherDeleted"),
      description: t("admin.ushers.toast.usherDeletedDesc"),
    });
  };

  const handleExportUshers = () => {
    toast({
      title: t("admin.ushers.toast.exportSuccess"),
      description: t("admin.ushers.toast.exportSuccessDesc"),
    });
  };

  const handleAssignEvents = (usher: Usher) => {
    setSelectedUsher(usher);
    // If team leader, assign to all events automatically
    if (usher.isTeamLeader) {
      const allEventIds = events.map((event) => event.id);
      setTempAssignedEvents(allEventIds);
    } else {
      setTempAssignedEvents([...usher.assignedEvents]);
    }
    setIsAssignEventsDialogOpen(true);
  };

  const handleDeactivateUsher = (usherId: string) => {
    toast({
      title: t("admin.ushers.toast.usherDeactivated"),
      description: t("admin.ushers.toast.usherDeactivatedDesc"),
    });
  };

  const handleReactivateUsher = (usherId: string) => {
    toast({
      title: t("admin.ushers.toast.usherReactivated"),
      description: t("admin.ushers.toast.usherReactivatedDesc"),
    });
  };

  const handleAddUsher = () => {
    toast({
      title: t("admin.ushers.toast.usherAdded"),
      description: t("admin.ushers.toast.usherAddedDesc"),
    });
    setIsAddUsherDialogOpen(false);
  };

  const handleAssignEventsToUsher = () => {
    if (selectedUsher) {
      const updatedUsher = {
        ...selectedUsher,
        assignedEvents: tempAssignedEvents,
      };
      setUshers(
        ushers.map((u) => (u.id === selectedUsher.id ? updatedUsher : u))
      );
      setSelectedUsher(updatedUsher);

      toast({
        title: t("admin.ushers.toast.eventsAssigned"),
        description: t("admin.ushers.toast.eventsAssignedDesc"),
      });
    }
    setIsAssignEventsDialogOpen(false);
  };

  const handleSaveUsherChanges = () => {
    toast({
      title: t("admin.ushers.toast.usherUpdated"),
      description: t("admin.ushers.toast.usherUpdatedDesc"),
    });
    setIsEditDialogOpen(false);
  };

  const handleToggleTeamLeader = (usher: Usher) => {
    if (usher.isTeamLeader) {
      // Remove team leader status
      const updatedUsher = {
        ...usher,
        isTeamLeader: false,
        assignedEvents: [],
      };
      setUshers(ushers.map((u) => (u.id === usher.id ? updatedUsher : u)));

      // Update selected usher if it's the same one
      if (selectedUsher && selectedUsher.id === usher.id) {
        setSelectedUsher(updatedUsher);
      }

      toast({
        title: "Team Leader Removed",
        description: `${usher.name} is no longer a team leader`,
      });
    } else {
      // Make team leader and assign to all events
      const allEventIds = events.map((event) => event.id);
      const updatedUsher = {
        ...usher,
        isTeamLeader: true,
        assignedEvents: allEventIds,
      };
      setUshers(ushers.map((u) => (u.id === usher.id ? updatedUsher : u)));

      // Update selected usher if it's the same one
      if (selectedUsher && selectedUsher.id === usher.id) {
        setSelectedUsher(updatedUsher);
      }

      toast({
        title: "Team Leader Assigned",
        description: `${usher.name} is now a team leader and assigned to all events`,
      });
    }
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.ushers.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.ushers.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredUshers}
            columns={commonColumns.ushers}
            title={t("admin.ushers.title")}
            subtitle={t("admin.ushers.subtitle")}
            filename="ushers"
            filters={{
              search: searchTerm,
              status: statusFilter,
              role: roleFilter,
              performance: performanceFilter,
            }}
            onExport={(format) => {
              toast({
                title: t("admin.ushers.toast.exportSuccess"),
                description: t("admin.ushers.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.ushers.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button
            onClick={() => setIsAddUsherDialogOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.ushers.actions.addUsher")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.ushers.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.ushers.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
                dir={i18n.language === "ar" ? "rtl" : "ltr"}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.ushers.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.ushers.filters.allStatus")}
                </SelectItem>
                <SelectItem value="active">
                  {t("admin.ushers.status.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("admin.ushers.status.inactive")}
                </SelectItem>
                <SelectItem value="suspended">
                  {t("admin.ushers.status.suspended")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.ushers.filters.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.ushers.filters.allRoles")}
                </SelectItem>
                <SelectItem value="coordinator">
                  {t("admin.ushers.roles.coordinator")}
                </SelectItem>
                <SelectItem value="supervisor">
                  {t("admin.ushers.roles.supervisor")}
                </SelectItem>
                <SelectItem value="senior">
                  {t("admin.ushers.roles.senior")}
                </SelectItem>
                <SelectItem value="junior">
                  {t("admin.ushers.roles.junior")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={performanceFilter}
              onValueChange={setPerformanceFilter}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.ushers.filters.performance")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.ushers.filters.allPerformance")}
                </SelectItem>
                <SelectItem value="excellent">
                  {t("admin.ushers.performance.excellent")}
                </SelectItem>
                <SelectItem value="good">
                  {t("admin.ushers.performance.good")}
                </SelectItem>
                <SelectItem value="average">
                  {t("admin.ushers.performance.average")}
                </SelectItem>
                <SelectItem value="needs_improvement">
                  {t("admin.ushers.performance.needsImprovement")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ushers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.ushers.table.ushers")} ({filteredUshers.length})
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {t("admin.ushers.pagination.showing")} {startIndex + 1}-
              {Math.min(endIndex, filteredUshers.length)}{" "}
              {t("admin.ushers.pagination.of")} {filteredUshers.length}
            </span>
            <Select
              value={ushersPerPage.toString()}
              onValueChange={(value) => setUshersPerPage(parseInt(value))}
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
            <Table className="w-full rtl:text-right ltr:text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right">
                    {t("admin.ushers.table.usher")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.ushers.table.contact")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.ushers.table.role")}
                  </TableHead>
                  <TableHead className="rtl:text-right">Team Leader</TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.ushers.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.ushers.table.performance")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.ushers.table.events")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.ushers.table.rating")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.ushers.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUshers.map((usher) => (
                  <TableRow key={usher.id}>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="font-medium">{usher.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.ushers.table.id")}: {usher.id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="text-sm">{usher.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {usher.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(usher.role)}>
                        {getRoleText(usher.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            usher.isTeamLeader ? "bg-purple-500" : "bg-gray-300"
                          }`}
                        ></div>
                        <span className="text-xs ml-2 rtl:mr-2 rtl:ml-0">
                          {usher.isTeamLeader ? "Yes" : "No"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(usher.status)}>
                        {getStatusText(usher.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPerformanceColor(usher.performance)}>
                        {getPerformanceText(usher.performance)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="font-medium">{usher.totalEvents}</p>
                        <p className="text-sm text-muted-foreground">
                          {usher.assignedEvents.length}{" "}
                          {t("admin.ushers.table.assigned")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 rtl:flex-row-reverse">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{usher.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            {t("admin.ushers.table.actions")}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleEditUsher(usher)}
                          >
                            <Edit className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.ushers.actions.editUsher")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAssignEvents(usher)}
                          >
                            <Calendar className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.ushers.actions.assignEvents")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleTeamLeader(usher)}
                            className={
                              usher.isTeamLeader
                                ? "text-purple-600"
                                : "text-gray-600"
                            }
                          >
                            <Users className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {usher.isTeamLeader
                              ? "Remove Team Leader"
                              : "Make Team Leader"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {usher.status === "active" && (
                            <DropdownMenuItem
                              onClick={() => handleDeactivateUsher(usher.id)}
                              className="text-yellow-600"
                            >
                              <UserX className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              {t("admin.ushers.actions.deactivateUsher")}
                            </DropdownMenuItem>
                          )}
                          {usher.status === "inactive" && (
                            <DropdownMenuItem
                              onClick={() => handleReactivateUsher(usher.id)}
                              className="text-green-600"
                            >
                              <UserCheck className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              {t("admin.ushers.actions.reactivateUsher")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteUsher(usher.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.ushers.actions.deleteUsher")}
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
            infoText={`${t("admin.ushers.pagination.showing")} ${
              startIndex + 1
            }-${Math.min(endIndex, filteredUshers.length)} ${t(
              "admin.ushers.pagination.of"
            )} ${filteredUshers.length} ${t(
              "admin.ushers.pagination.results"
            )}`}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={filteredUshers.length}
            itemsPerPage={ushersPerPage}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.ushers.stats.totalUshers")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">{ushers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.ushers.stats.activeUshers")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-green-600">
              {ushers.filter((usher) => usher.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.ushers.stats.inactiveUshers")}
            </CardTitle>
            <XCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-yellow-600">
              {ushers.filter((usher) => usher.status === "inactive").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.ushers.stats.suspendedUshers")}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-red-600">
              {ushers.filter((usher) => usher.status === "suspended").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              Team Leaders
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-purple-600">
              {ushers.filter((usher) => usher.isTeamLeader).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Usher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.editUsher")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.editUsherSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedUsher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.fullName")}
                  </label>
                  <Input defaultValue={selectedUsher.name} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.email")}
                  </label>
                  <Input defaultValue={selectedUsher.email} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.phone")}
                  </label>
                  <Input defaultValue={selectedUsher.phone} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.role")}
                  </label>
                  <Select defaultValue={selectedUsher.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coordinator">
                        {t("admin.ushers.roles.coordinator")}
                      </SelectItem>
                      <SelectItem value="supervisor">
                        {t("admin.ushers.roles.supervisor")}
                      </SelectItem>
                      <SelectItem value="senior">
                        {t("admin.ushers.roles.senior")}
                      </SelectItem>
                      <SelectItem value="junior">
                        {t("admin.ushers.roles.junior")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.status")}
                  </label>
                  <Select defaultValue={selectedUsher.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("admin.ushers.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("admin.ushers.status.inactive")}
                      </SelectItem>
                      <SelectItem value="suspended">
                        {t("admin.ushers.status.suspended")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.hourlyRate")}
                  </label>
                  <Input
                    type="number"
                    defaultValue={selectedUsher.hourlyRate.toString()}
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        selectedUsher.isTeamLeader
                          ? "bg-purple-500"
                          : "bg-gray-300"
                      }`}
                    ></div>
                    <span className="text-sm font-medium">
                      Team Leader (Joker)
                    </span>
                    <span className="text-sm text-muted-foreground">
                      - Assigns to all events automatically
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("admin.ushers.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveUsherChanges}>
              {t("admin.ushers.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Usher Dialog */}
      <Dialog
        open={isAddUsherDialogOpen}
        onOpenChange={setIsAddUsherDialogOpen}
      >
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.addUsher")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.addUsherSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.fullName")}
                </label>
                <Input
                  placeholder={t("admin.ushers.form.fullNamePlaceholder")}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.email")}
                </label>
                <Input
                  placeholder={t("admin.ushers.form.emailPlaceholder")}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.phone")}
                </label>
                <Input
                  placeholder={t("admin.ushers.form.phonePlaceholder")}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.role")}
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("admin.ushers.form.selectRole")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coordinator">
                      {t("admin.ushers.roles.coordinator")}
                    </SelectItem>
                    <SelectItem value="supervisor">
                      {t("admin.ushers.roles.supervisor")}
                    </SelectItem>
                    <SelectItem value="senior">
                      {t("admin.ushers.roles.senior")}
                    </SelectItem>
                    <SelectItem value="junior">
                      {t("admin.ushers.roles.junior")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.location")}
                </label>
                <Input
                  placeholder={t("admin.ushers.form.locationPlaceholder")}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.hourlyRate")}
                </label>
                <Input
                  type="number"
                  placeholder={t("admin.ushers.form.hourlyRatePlaceholder")}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.experience")}
                </label>
                <Input
                  type="number"
                  placeholder={t("admin.ushers.form.experiencePlaceholder")}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div className="col-span-2">
                <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
                  <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                  <span className="text-sm font-medium">
                    Team Leader (Joker)
                  </span>
                  <span className="text-sm text-muted-foreground">
                    - Assigns to all events automatically
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsAddUsherDialogOpen(false)}
            >
              {t("admin.ushers.dialogs.cancel")}
            </Button>
            <Button onClick={handleAddUsher}>
              {t("admin.ushers.dialogs.addUsher")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Events Dialog */}
      <Dialog
        open={isAssignEventsDialogOpen}
        onOpenChange={setIsAssignEventsDialogOpen}
      >
        <DialogContent className="rtl:text-right ltr:text-left max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.assignEvents")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.assignEventsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedUsher && (
            <div className="flex-1 overflow-y-auto space-y-4 px-1">
              <div className="space-y-2">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.assignEvents.usherInfo")}
                </h4>
                <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.fullName")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.role")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {getRoleText(selectedUsher.role)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Leader Section */}
              <div className="space-y-2">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  Team Leader Assignment
                </h4>
                <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 rtl:text-right">
                      <p className="font-medium text-purple-800">
                        {selectedUsher.isTeamLeader
                          ? "Current Team Leader"
                          : "Not a Team Leader"}
                      </p>
                      <p className="text-sm text-purple-600">
                        {selectedUsher.isTeamLeader
                          ? "This usher is assigned to all events as a team leader (joker)"
                          : "Make this usher a team leader to assign them to all events at once"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          selectedUsher.isTeamLeader
                            ? "bg-purple-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      <Button
                        variant={
                          selectedUsher.isTeamLeader ? "outline" : "default"
                        }
                        size="sm"
                        onClick={() => handleToggleTeamLeader(selectedUsher)}
                        className={
                          selectedUsher.isTeamLeader
                            ? "text-purple-600 border-purple-600"
                            : "bg-purple-600 hover:bg-purple-700"
                        }
                      >
                        {selectedUsher.isTeamLeader
                          ? "Remove Team Leader"
                          : "Make Team Leader"}
                      </Button>
                    </div>
                  </div>
                </div>
                {selectedUsher.isTeamLeader && (
                  <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Team leaders are automatically
                      assigned to all events and cannot be manually unassigned
                      from individual events.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.assignEvents.availableEvents")}
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 rtl:text-right">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(event.date), "PPP", {
                            locale: getDateLocale(),
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {event.venue}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <Badge
                          className={
                            tempAssignedEvents.includes(event.id)
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {tempAssignedEvents.includes(event.id)
                            ? t("admin.ushers.assignEvents.assigned")
                            : t("admin.ushers.assignEvents.notAssigned")}
                        </Badge>
                        <Button
                          variant={
                            tempAssignedEvents.includes(event.id)
                              ? "outline"
                              : "default"
                          }
                          size="sm"
                          disabled={selectedUsher.isTeamLeader}
                          onClick={() => {
                            if (tempAssignedEvents.includes(event.id)) {
                              setTempAssignedEvents(
                                tempAssignedEvents.filter(
                                  (id) => id !== event.id
                                )
                              );
                            } else {
                              setTempAssignedEvents([
                                ...tempAssignedEvents,
                                event.id,
                              ]);
                            }
                          }}
                        >
                          {selectedUsher.isTeamLeader
                            ? "Auto-Assigned"
                            : tempAssignedEvents.includes(event.id)
                            ? t("admin.ushers.assignEvents.remove")
                            : t("admin.ushers.assignEvents.assign")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.assignEvents.currentAssignments")}
                </h4>
                <div className="space-y-2">
                  {tempAssignedEvents.length > 0 ? (
                    tempAssignedEvents.map((eventId) => {
                      const event = events.find((e) => e.id === eventId);
                      return event ? (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex-1 rtl:text-right">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(event.date), "PPP", {
                                locale: getDateLocale(),
                              })}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {t("admin.ushers.assignEvents.assigned")}
                          </Badge>
                        </div>
                      ) : null;
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {t("admin.ushers.assignEvents.noAssignments")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsAssignEventsDialogOpen(false)}
            >
              {t("admin.ushers.dialogs.cancel")}
            </Button>
            <Button onClick={handleAssignEventsToUsher}>
              {t("admin.ushers.dialogs.saveAssignments")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usher Details Dialog */}
      <Dialog
        open={
          selectedUsher !== null &&
          !isEditDialogOpen &&
          !isAssignEventsDialogOpen
        }
        onOpenChange={() => setSelectedUsher(null)}
      >
        <DialogContent className="rtl:text-right ltr:text-left max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.usherDetails")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.usherDetailsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedUsher && (
            <div className="flex-1 overflow-y-auto space-y-6 px-1">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.details.basicInfo")}
                </h4>
                <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.fullName")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.email")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.phone")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.phone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.role")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {getRoleText(selectedUsher.role)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.status")}
                    </label>
                    <Badge className={getStatusColor(selectedUsher.status)}>
                      {getStatusText(selectedUsher.status)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.location")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.location}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      Team Leader Status
                    </label>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          selectedUsher.isTeamLeader
                            ? "bg-purple-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      <span className="text-sm text-muted-foreground">
                        {selectedUsher.isTeamLeader
                          ? "Team Leader (Joker)"
                          : "Regular Usher"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Information */}
              <div className="space-y-4">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.details.performanceInfo")}
                </h4>
                <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.totalEvents")}
                    </label>
                    <p className="text-2xl font-bold rtl:text-right">
                      {selectedUsher.totalEvents}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.rating")}
                    </label>
                    <div className="flex items-center gap-1 rtl:flex-row-reverse">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="text-2xl font-bold">
                        {selectedUsher.rating}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.experience")}
                    </label>
                    <p className="text-2xl font-bold rtl:text-right">
                      {selectedUsher.experience}{" "}
                      {t("admin.ushers.details.years")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.totalHours")}
                    </label>
                    <p className="text-2xl font-bold rtl:text-right">
                      {selectedUsher.totalHours}{" "}
                      {t("admin.ushers.details.hours")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.hourlyRate")}
                    </label>
                    <p className="text-2xl font-bold rtl:text-right">
                      {formatCurrencyForLocale(
                        selectedUsher.hourlyRate,
                        i18n.language
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.performance")}
                    </label>
                    <Badge
                      className={getPerformanceColor(selectedUsher.performance)}
                    >
                      {getPerformanceText(selectedUsher.performance)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Assigned Events */}
              <div className="space-y-4">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.details.assignedEvents")}
                </h4>
                <div className="space-y-2">
                  {selectedUsher.assignedEvents.length > 0 ? (
                    selectedUsher.assignedEvents.map((eventId) => {
                      const event = events.find((e) => e.id === eventId);
                      return event ? (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1 rtl:text-right">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(event.date), "PPP", {
                                locale: getDateLocale(),
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {event.venue}
                            </p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">
                            {event.status}
                          </Badge>
                        </div>
                      ) : null;
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {t("admin.ushers.details.noAssignedEvents")}
                    </p>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-4">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.details.recentActivity")}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rtl:flex-row-reverse">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 rtl:text-right">
                      <p className="text-sm font-medium">
                        {t("admin.ushers.activity.eventCompleted")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.ushers.activity.concert2025")} -{" "}
                        {format(parseISO("2025-08-15"), "PPP", {
                          locale: getDateLocale(),
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rtl:flex-row-reverse">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 rtl:text-right">
                      <p className="text-sm font-medium">
                        {t("admin.ushers.activity.eventAssigned")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.ushers.activity.festival2025")} -{" "}
                        {format(parseISO("2025-08-10"), "PPP", {
                          locale: getDateLocale(),
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rtl:flex-row-reverse">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 rtl:text-right">
                      <p className="text-sm font-medium">
                        {t("admin.ushers.activity.performanceReview")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.ushers.activity.excellentRating")} -{" "}
                        {format(parseISO("2025-08-05"), "PPP", {
                          locale: getDateLocale(),
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse flex-shrink-0">
            <Button variant="outline" onClick={() => setSelectedUsher(null)}>
              {t("admin.ushers.dialogs.close")}
            </Button>
            <Button onClick={() => handleEditUsher(selectedUsher!)}>
              {t("admin.ushers.actions.editUsher")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsherManagement;
