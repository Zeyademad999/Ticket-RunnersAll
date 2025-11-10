import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Ticket,
  Send,
  ArrowRight,
  Users,
  User,
  Phone,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { TicketsService } from "@/lib/api/services/tickets";
import { Ticket as TicketType } from "@/lib/api/types";
import { format } from "date-fns";

export default function TicketDetails() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<TicketType[]>([]);
  const [selectedTicketIndexes, setSelectedTicketIndexes] = useState<string[]>(
    []
  );

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch the ticket detail
        const ticketData = await TicketsService.getTicketDetail(id);
        setTicket(ticketData);

        // Fetch all user tickets to find related ones (same event, same purchase date)
        const allTickets = await TicketsService.getUserTickets();
        
        // Filter tickets from the same event and purchase date
        const purchaseDate = ticketData.purchaseDate?.split('T')[0]; // Get date part only
        const related = allTickets.filter(
          (t) =>
            t.eventId === ticketData.eventId &&
            t.purchaseDate?.split('T')[0] === purchaseDate &&
            t.id !== ticketData.id
        );
        
        // Store related tickets (excluding the main ticket)
        setRelatedTickets(related);
      } catch (error: any) {
        console.error("Error fetching ticket details:", error);
        toast({
          title: t("ticketDetails.error.title", "Error"),
          description:
            error?.message ||
            t("ticketDetails.error.description", "Failed to load ticket details"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [id, toast, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark text-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark text-foreground">
        {t("ticketDetails.notFound")}
      </div>
    );
  }

  const allTickets = [ticket, ...relatedTickets.filter(t => t.id !== ticket.id)];
  const totalAmount = allTickets.reduce((sum, t) => {
    const price = typeof t.price === 'number' ? t.price : parseFloat(String(t.price || 0));
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  const handleSelect = (ticketId: string) => {
    const ticket = allTickets.find((t) => t.id === ticketId);
    // Only allow selection of valid tickets (not used, refunded, or banned)
    if (ticket && ticket.status === "valid") {
      setSelectedTicketIndexes((prev) =>
        prev.includes(ticketId)
          ? prev.filter((id) => id !== ticketId)
          : [...prev, ticketId]
      );
    }
  };

  const handleNavigateToTransfer = () => {
    navigate("/transfer-tickets", {
      state: { ticketIds: selectedTicketIndexes, bookingId: ticket.id },
    });
  };

  const handleTransfer = (ticketId: string) => {
    navigate(`/transfer/${ticket.id}/${ticketId}`);
  };

  const getStatusBadge = (status: TicketType["status"]) => {
    if (status === "used") {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t("ticketDetails.status.used", "Used")}
        </Badge>
      );
    } else if (status === "valid") {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          <Clock className="h-3 w-3 mr-1" />
          {t("ticketDetails.status.valid", "Valid")}
        </Badge>
      );
    } else if (status === "refunded") {
      return (
        <Badge variant="destructive">
          {t("ticketDetails.status.refunded", "Refunded")}
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          {t("ticketDetails.status.banned", "Banned")}
        </Badge>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Heading */}
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              {t("ticketDetails.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("ticketDetails.reference", { id: ticket.id })}
            </p>
          </div>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" /> {ticket.eventTitle}
              </CardTitle>
              <CardDescription>
                {t("ticketDetails.eventInfo.title")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {t("ticketDetails.eventInfo.category")}:{" "}
                  </span>
                  <span className="font-medium">{ticket.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("ticketDetails.eventInfo.purchaseDate")}:{" "}
                  </span>
                  <span className="font-medium">
                    {ticket.purchaseDate
                      ? format(new Date(ticket.purchaseDate), "MMM dd, yyyy")
                      : "-"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("ticketDetails.tickets.title")} ({allTickets.length})
              </CardTitle>
              <CardDescription>
                {t("ticketDetails.tickets.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allTickets.map((ticketItem, index) => (
                <div
                  key={ticketItem.id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {ticketItem.status === "valid" && (
                        <input
                          type="checkbox"
                          checked={selectedTicketIndexes.includes(ticketItem.id)}
                          onChange={() => handleSelect(ticketItem.id)}
                          className="form-checkbox h-4 w-4 text-primary"
                        />
                      )}
                      <Badge variant="outline">
                        {t("ticketDetails.tickets.ticketNumber", {
                          index: index + 1,
                        })}
                      </Badge>
                      {getStatusBadge(ticketItem.status)}
                      {ticketItem.ticketNumber && (
                        <span className="text-xs text-muted-foreground">
                          #{ticketItem.ticketNumber}
                        </span>
                      )}
                    </div>

                    {ticketItem.status === "valid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTransfer(ticketItem.id)}
                        className="group"
                      >
                        {t("ticketDetails.tickets.transfer")}
                        <Send className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </Button>
                    )}
                  </div>

                  {/* Ticket Information */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {ticketItem.customerName || ticket.customerName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("ticketDetails.tickets.price")}:
                      </span>
                      <span className="font-medium">{ticketItem.price || 0} EGP</span>
                    </div>
                    {ticketItem.checkInTime && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">
                          {t("ticketDetails.tickets.checkedIn")}:{" "}
                          {format(new Date(ticketItem.checkInTime), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {selectedTicketIndexes.length > 0 && (
                <div className="text-right pt-4">
                  <Button onClick={handleNavigateToTransfer}>
                    {t("ticketDetails.tickets.transferSelected")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t("ticketDetails.summary.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("ticketDetails.summary.subtotal")}</span>
                <span>{Number(totalAmount).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span>{t("ticketDetails.summary.vat")}</span>
                <span>{(Number(totalAmount) * 0.14).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t("ticketDetails.summary.total")}</span>
                <span>{(Number(totalAmount) * 1.14).toFixed(2)} EGP</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

