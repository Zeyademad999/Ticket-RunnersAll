import { useState } from "react";
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
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                              Mock Booking Data                             */
/* -------------------------------------------------------------------------- */

const bookings = [
  {
    id: "1",
    title: "Cairo Jazz Festival 2024",
    date: "2024-02-15",
    time: "20:00",
    location: "Cairo Opera House",
    price: 250,
    quantity: 2,
  },
  {
    id: "2",
    title: "Comedy Night with Ahmed Ahmed",
    date: "2024-02-20",
    time: "21:00",
    location: "Al-Azhar Park",
    price: 150,
    quantity: 1,
  },
];

type TicketState = {
  index: number;
  transferred: boolean;
  code?: string;
  owner: {
    name: string;
    mobile: string;
  };
  status: "claimed" | "pending";
};

export default function TicketDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedTicketIndexes, setSelectedTicketIndexes] = useState<number[]>(
    []
  );

  const booking = bookings.find((b) => b.id === id);
  const [tickets, setTickets] = useState<TicketState[]>(() => {
    if (!booking) return [];
    return Array.from({ length: booking.quantity }, (_, i) => ({
      index: i + 1,
      transferred: false,
      code: undefined,
      owner: {
        name: i === 0 ? "Ahmed Hassan" : "Fatima Ali",
        mobile: i === 0 ? "+20 123 456 7890" : "+20 987 654 3210",
      },
      status: i === 0 ? "claimed" : "pending",
    }));
  });

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark text-foreground">
        {t("ticketDetails.notFound")}
      </div>
    );
  }

  const handleSelect = (index: number) => {
    const ticket = tickets.find((t) => t.index === index);
    // Only allow selection of non-claimed tickets
    if (ticket && ticket.status !== "claimed") {
      setSelectedTicketIndexes((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
    }
  };

  const handleNavigateToTransfer = () => {
    navigate("/transfer-tickets", {
      state: { ticketIndexes: selectedTicketIndexes, bookingId: booking.id },
    });
  };

  const handleTransfer = (idx: number) => {
    navigate(`/transfer/${booking.id}/${idx}`);
  };

  const getStatusBadge = (status: "claimed" | "pending") => {
    if (status === "claimed") {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Claimed
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          <Clock className="h-3 w-3 mr-1" />
          Pending
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
              {t("ticketDetails.reference", { id: booking.id })}
            </p>
          </div>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" /> {booking.title}
              </CardTitle>
              <CardDescription>
                {t("ticketDetails.eventInfo.title")}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("ticketDetails.tickets.title")}
              </CardTitle>
              <CardDescription>
                {t("ticketDetails.tickets.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.index}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {!ticket.transferred && ticket.status !== "claimed" && (
                        <input
                          type="checkbox"
                          checked={selectedTicketIndexes.includes(ticket.index)}
                          onChange={() => handleSelect(ticket.index)}
                          className="form-checkbox h-4 w-4 text-primary"
                        />
                      )}
                      <Badge variant="outline">
                        {t("ticketDetails.tickets.ticketNumber", {
                          index: ticket.index,
                        })}
                      </Badge>
                      {getStatusBadge(ticket.status)}
                      {ticket.transferred && ticket.code && (
                        <span className="text-xs text-muted-foreground">
                          {t("ticketDetails.tickets.transferred", {
                            code: ticket.code,
                          })}
                        </span>
                      )}
                    </div>

                    {!ticket.transferred && ticket.status !== "claimed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTransfer(ticket.index)}
                        className="group"
                      >
                        {t("ticketDetails.tickets.transfer")}
                        <Send className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </Button>
                    )}
                  </div>

                  {/* Owner Information */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {ticket.owner.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {ticket.owner.mobile}
                      </span>
                    </div>
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
                <span>{booking.price * booking.quantity} EGP</span>
              </div>
              <div className="flex justify-between">
                <span>{t("ticketDetails.summary.vat")}</span>
                <span>
                  {(booking.price * booking.quantity * 0.14).toFixed(2)} EGP
                </span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t("ticketDetails.summary.total")}</span>
                <span>
                  {(booking.price * booking.quantity * 1.14).toFixed(2)} EGP
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
