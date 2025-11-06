import React, { useState, useMemo } from "react";
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
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  ResponsivePagination,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import {
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  MoreHorizontal,
  MapPin,
  Building2,
  Wifi,
  Car,
  Accessibility,
  Coffee,
  Music,
  Camera,
  Users,
  Star,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatNumberForLocale } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";

interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  capacity: number;
  facilities: string[];
  status: "active" | "inactive" | "maintenance";
  rating: number;
  totalEvents: number;
  lastEventDate?: string;
  contactPhone: string;
  contactEmail: string;
  website?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

const VenueManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // Test if the keys are working now
  console.log("=== TESTING VENUE MANAGEMENT KEYS ===");
  console.log(
    "venueManagement.header.title:",
    t("venueManagement.header.title")
  );
  console.log(
    "venueManagement.actions.addVenue:",
    t("venueManagement.actions.addVenue")
  );
  console.log(
    "venueManagement.filters.title:",
    t("venueManagement.filters.title")
  );
  console.log("testVenueKey:", t("testVenueKey"));

  // Try alternative access methods
  console.log(
    "Alternative method 1:",
    t("venueManagement.header.title", { defaultValue: "DEFAULT" })
  );
  console.log("Alternative method 2:", i18n.t("venueManagement.header.title"));
  console.log(
    "Alternative method 3:",
    i18n.t("venueManagement.header.title", { defaultValue: "DEFAULT" })
  );

  // Force reload translation resources
  React.useEffect(() => {
    i18n.reloadResources();
  }, [i18n]);

  const [venues, setVenues] = useState<Venue[]>([
    {
      id: "1",
      name: "Cairo International Convention Center",
      description:
        "A state-of-the-art convention center with multiple halls and modern facilities",
      address: "Nasr City, Cairo",
      city: "Cairo",
      capacity: 5000,
      facilities: [
        "WiFi",
        "Parking",
        "Wheelchair Access",
        "Catering",
        "Audio/Visual",
        "Security",
      ],
      status: "active",
      rating: 4.8,
      totalEvents: 45,
      lastEventDate: "2024-01-15",
      contactPhone: "+20 2 2268 0000",
      contactEmail: "info@cicc.com.eg",
      website: "https://cicc.com.eg",
      images: ["/venues/cicc-1.jpg", "/venues/cicc-2.jpg"],
      createdAt: "2023-01-01",
      updatedAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Opera House - Main Hall",
      description:
        "Historic venue with excellent acoustics for classical and contemporary performances",
      address: "El Borg, Cairo",
      city: "Cairo",
      capacity: 1200,
      facilities: [
        "WiFi",
        "Parking",
        "Wheelchair Access",
        "Catering",
        "Audio/Visual",
      ],
      status: "active",
      rating: 4.9,
      totalEvents: 78,
      lastEventDate: "2024-01-20",
      contactPhone: "+20 2 2739 0114",
      contactEmail: "info@cairoopera.org",
      website: "https://cairoopera.org",
      images: ["/venues/opera-1.jpg"],
      createdAt: "2023-01-01",
      updatedAt: "2024-01-20",
    },
    {
      id: "3",
      name: "Giza Pyramids Complex",
      description:
        "Outdoor venue with breathtaking views of the ancient pyramids",
      address: "Giza Plateau, Giza",
      city: "Giza",
      capacity: 10000,
      facilities: [
        "Parking",
        "Security",
        "Catering",
        "Audio/Visual",
        "Transportation",
      ],
      status: "active",
      rating: 4.7,
      totalEvents: 23,
      lastEventDate: "2024-01-10",
      contactPhone: "+20 2 3380 0000",
      contactEmail: "info@giza-pyramids.org",
      images: ["/venues/pyramids-1.jpg"],
      createdAt: "2023-01-01",
      updatedAt: "2024-01-10",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [editingVenue, setEditingVenue] = useState<Partial<Venue>>({});
  const [newVenue, setNewVenue] = useState<Partial<Venue>>({
    name: "",
    description: "",
    address: "",
    city: "",
    capacity: 0,
    facilities: [],
    contactPhone: "",
    contactEmail: "",
    website: "",
    images: [],
  });

  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      const matchesSearch =
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || venue.status === statusFilter;
      const matchesCity = cityFilter === "all" || venue.city === cityFilter;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [venues, searchTerm, statusFilter, cityFilter]);

  const totalPages = Math.ceil(filteredVenues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVenues = filteredVenues.slice(startIndex, endIndex);

  const cities = useMemo(() => {
    const uniqueCities = [...new Set(venues.map((venue) => venue.city))];
    return uniqueCities.sort();
  }, [venues]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("venueManagement.status.active");
      case "inactive":
        return t("venueManagement.status.inactive");
      case "maintenance":
        return t("venueManagement.status.maintenance");
      default:
        return status;
    }
  };

  const getFacilityIcon = (facility: string) => {
    switch (facility.toLowerCase()) {
      case "wifi":
        return <Wifi className="h-4 w-4" />;
      case "parking":
        return <Car className="h-4 w-4" />;
      case "wheelchair access":
        return <Accessibility className="h-4 w-4" />;
      case "catering":
        return <Coffee className="h-4 w-4" />;
      case "audio/visual":
        return <Music className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      case "camera":
        return <Camera className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const handleAddVenue = () => {
    setIsAddDialogOpen(true);
  };

  const handleViewVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setIsViewDialogOpen(true);
  };

  const handleEditVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setEditingVenue({
      name: venue.name,
      description: venue.description,
      facilities: [...venue.facilities],
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteVenue = (venueId: string) => {
    setVenues(venues.filter((venue) => venue.id !== venueId));
    toast({
      title: t("venueManagement.toast.venueDeleted"),
      description: t("venueManagement.toast.venueDeletedDesc"),
    });
  };

  const handleSaveNewVenue = () => {
    if (!newVenue.name || !newVenue.description || !newVenue.address) {
      toast({
        title: t("venueManagement.toast.error"),
        description: t("venueManagement.toast.errorDesc"),
        variant: "destructive",
      });
      return;
    }

    const venue: Venue = {
      id: Date.now().toString(),
      name: newVenue.name!,
      description: newVenue.description!,
      address: newVenue.address!,
      city: newVenue.city!,
      capacity: newVenue.capacity!,
      facilities: newVenue.facilities!,
      status: "active",
      rating: 0,
      totalEvents: 0,
      contactPhone: newVenue.contactPhone!,
      contactEmail: newVenue.contactEmail!,
      website: newVenue.website,
      images: newVenue.images!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setVenues([...venues, venue]);
    setNewVenue({
      name: "",
      description: "",
      address: "",
      city: "",
      capacity: 0,
      facilities: [],
      contactPhone: "",
      contactEmail: "",
      website: "",
      images: [],
    });
    setIsAddDialogOpen(false);
    toast({
      title: t("venueManagement.toast.venueAdded"),
      description: t("venueManagement.toast.venueAddedDesc"),
    });
  };

  const handleSaveVenueEdit = () => {
    if (!editingVenue.name || !editingVenue.description) {
      toast({
        title: t("venueManagement.toast.error"),
        description: t("venueManagement.toast.errorDesc"),
        variant: "destructive",
      });
      return;
    }

    if (selectedVenue) {
      const updatedVenues = venues.map((venue) =>
        venue.id === selectedVenue.id
          ? {
              ...venue,
              name: editingVenue.name!,
              description: editingVenue.description!,
              facilities: editingVenue.facilities || [],
              updatedAt: new Date().toISOString(),
            }
          : venue
      );
      setVenues(updatedVenues);
      setIsEditDialogOpen(false);
      setEditingVenue({});
      toast({
        title: t("venueManagement.toast.venueUpdated"),
        description: t("venueManagement.toast.venueUpdatedDesc"),
      });
    }
  };

  const handleNewVenueChange = (field: string, value: any) => {
    setNewVenue((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditVenueChange = (field: string, value: any) => {
    setEditingVenue((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddFacility = () => {
    const facility = prompt("Enter facility name:");
    if (facility) {
      setNewVenue((prev) => ({
        ...prev,
        facilities: [...(prev.facilities || []), facility],
      }));
    }
  };

  const handleRemoveFacility = (index: number) => {
    setNewVenue((prev) => ({
      ...prev,
      facilities: prev.facilities?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleEditAddFacility = () => {
    const facility = prompt("Enter facility name:");
    if (facility) {
      setEditingVenue((prev) => ({
        ...prev,
        facilities: [...(prev.facilities || []), facility],
      }));
    }
  };

  const handleEditRemoveFacility = (index: number) => {
    setEditingVenue((prev) => ({
      ...prev,
      facilities: prev.facilities?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleExportVenues = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Name,Description,Address,City,Capacity,Status,Rating,Total Events\n" +
      venues
        .map(
          (venue) =>
            `${venue.name},${venue.description},${venue.address},${venue.city},${venue.capacity},${venue.status},${venue.rating},${venue.totalEvents}`
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "venues.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t("venueManagement.toast.exportSuccess"),
      description: t("venueManagement.toast.exportSuccessDesc"),
    });
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("venueManagement.header.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("venueManagement.header.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredVenues}
            columns={commonColumns.venues}
            title="Venues"
            subtitle="Manage event venues and locations"
            filename="venues"
            filters={{
              search: searchTerm,
              status: statusFilter,
              city: cityFilter,
            }}
            onExport={(format) => {
              toast({
                title: t("venueManagement.toast.exportSuccess"),
                description: t("venueManagement.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("venueManagement.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button onClick={handleAddVenue} className="text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("venueManagement.actions.addVenue")}
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
            {t("venueManagement.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("venueManagement.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("venueManagement.filters.status.label")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("venueManagement.filters.status.all")}
                </SelectItem>
                <SelectItem value="active">
                  {t("venueManagement.filters.status.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("venueManagement.filters.status.inactive")}
                </SelectItem>
                <SelectItem value="maintenance">
                  {t("venueManagement.filters.status.maintenance")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("venueManagement.filters.city.label")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("venueManagement.filters.city.all")}
                </SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Venues Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("venueManagement.table.title")}</CardTitle>
          <CardDescription>
            {t("venueManagement.table.subtitle", {
              count: filteredVenues.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("venueManagement.table.headers.venue")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.location")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.capacity")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.facilities")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.status")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.rating")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.events")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVenues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{venue.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {venue.description.substring(0, 50)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{venue.city}</div>
                          <div className="text-sm text-muted-foreground">
                            {venue.address}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {formatNumberForLocale(venue.capacity, i18n.language)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {venue.facilities.slice(0, 3).map((facility, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {facility}
                          </Badge>
                        ))}
                        {venue.facilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{venue.facilities.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(venue.status)}>
                        {getStatusText(venue.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 rtl:flex-row-reverse">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{venue.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">{venue.totalEvents}</div>
                        <div className="text-xs text-muted-foreground">
                          {venue.lastEventDate
                            ? `${t("venueManagement.details.lastEvent")}: ${
                                venue.lastEventDate
                              }`
                            : t("venueManagement.details.noEvents")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            {t("venueManagement.table.headers.actions")}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewVenue(venue)}
                          >
                            <Eye className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                            {t("venueManagement.actions.viewDetails")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditVenue(venue)}
                          >
                            <Edit className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                            {t("venueManagement.actions.editVenue")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteVenue(venue.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                            {t("venueManagement.actions.deleteVenue")}
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
            infoText={`Showing ${startIndex + 1}-${Math.min(
              endIndex,
              filteredVenues.length
            )} of ${filteredVenues.length} venues`}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={filteredVenues.length}
            itemsPerPage={itemsPerPage}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Add Venue Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          className="max-w-2xl"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.add.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.add.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.name")}
                </label>
                <Input
                  value={newVenue.name}
                  onChange={(e) => handleNewVenueChange("name", e.target.value)}
                  placeholder={t("venueManagement.form.placeholders.name")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.description")}
                </label>
                <Textarea
                  value={newVenue.description}
                  onChange={(e) =>
                    handleNewVenueChange("description", e.target.value)
                  }
                  placeholder={t(
                    "venueManagement.form.placeholders.description"
                  )}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.address")}
                </label>
                <Input
                  value={newVenue.address}
                  onChange={(e) =>
                    handleNewVenueChange("address", e.target.value)
                  }
                  placeholder={t("venueManagement.form.placeholders.address")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.city")}
                </label>
                <Input
                  value={newVenue.city}
                  onChange={(e) => handleNewVenueChange("city", e.target.value)}
                  placeholder={t("venueManagement.form.placeholders.city")}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.capacity")}
                </label>
                <Input
                  type="number"
                  value={newVenue.capacity}
                  onChange={(e) =>
                    handleNewVenueChange("capacity", parseInt(e.target.value))
                  }
                  placeholder={t("venueManagement.form.placeholders.capacity")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.contactPhone")}
                </label>
                <Input
                  value={newVenue.contactPhone}
                  onChange={(e) =>
                    handleNewVenueChange("contactPhone", e.target.value)
                  }
                  placeholder={t(
                    "venueManagement.form.placeholders.contactPhone"
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.contactEmail")}
                </label>
                <Input
                  type="email"
                  value={newVenue.contactEmail}
                  onChange={(e) =>
                    handleNewVenueChange("contactEmail", e.target.value)
                  }
                  placeholder={t(
                    "venueManagement.form.placeholders.contactEmail"
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.website")}
                </label>
                <Input
                  value={newVenue.website}
                  onChange={(e) =>
                    handleNewVenueChange("website", e.target.value)
                  }
                  placeholder={t("venueManagement.form.placeholders.website")}
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t("venueManagement.form.facilities")}
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {newVenue.facilities?.map((facility, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {getFacilityIcon(facility)}
                    {facility}
                    <button
                      onClick={() => handleRemoveFacility(index)}
                      className="ml-1 hover:text-red-500 rtl:mr-1 rtl:ml-0"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddFacility}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t("venueManagement.actions.addFacility")}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t("venueManagement.actions.cancel")}
            </Button>
            <Button onClick={handleSaveNewVenue}>
              {t("venueManagement.actions.saveVenue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Venue Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="max-w-2xl"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.edit.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.edit.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("venueManagement.form.name")}
              </label>
              <Input
                value={editingVenue.name}
                onChange={(e) => handleEditVenueChange("name", e.target.value)}
                placeholder={t("venueManagement.form.placeholders.name")}
                className="rtl:text-right ltr:text-left"
              />
            </div>
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("venueManagement.form.description")}
              </label>
              <Textarea
                value={editingVenue.description}
                onChange={(e) =>
                  handleEditVenueChange("description", e.target.value)
                }
                placeholder={t("venueManagement.form.placeholders.description")}
                rows={3}
                className="rtl:text-right ltr:text-left"
              />
            </div>
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("venueManagement.form.facilities")}
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {editingVenue.facilities?.map((facility, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {getFacilityIcon(facility)}
                    {facility}
                    <button
                      onClick={() => handleEditRemoveFacility(index)}
                      className="ml-1 hover:text-red-500 rtl:mr-1 rtl:ml-0"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditAddFacility}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t("venueManagement.actions.addFacility")}
              </Button>
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("venueManagement.actions.cancel")}
            </Button>
            <Button onClick={handleSaveVenueEdit}>
              {t("venueManagement.actions.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Venue Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent
          className="max-w-4xl"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {selectedVenue?.name}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedVenue?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedVenue && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.location")}
                  </h4>
                  <div className="flex items-center gap-2 rtl:flex-row-reverse mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedVenue.address}, {selectedVenue.city}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.capacity")}
                  </h4>
                  <div className="flex items-center gap-2 rtl:flex-row-reverse mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatNumberForLocale(
                        selectedVenue.capacity,
                        i18n.language
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.contact")}
                  </h4>
                  <div className="space-y-1 mt-1">
                    <div>{selectedVenue.contactPhone}</div>
                    <div>{selectedVenue.contactEmail}</div>
                    {selectedVenue.website && (
                      <div>
                        <a
                          href={selectedVenue.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {selectedVenue.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.facilities")}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedVenue.facilities.map((facility, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {getFacilityIcon(facility)}
                        {facility}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.statistics")}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumberForLocale(
                          selectedVenue.rating,
                          i18n.language
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("venueManagement.details.rating")}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumberForLocale(
                          selectedVenue.totalEvents,
                          i18n.language
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("venueManagement.details.totalEvents")}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.table.headers.status")}
                  </h4>
                  <Badge className={getStatusColor(selectedVenue.status)}>
                    {getStatusText(selectedVenue.status)}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              {t("venueManagement.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VenueManagement;
