import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { TicketsService } from "@/lib/api/services/tickets";
import { Loader2, CheckCircle } from "lucide-react";

export default function TransferTicketPage() {
  const { t } = useTranslation();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [transferFee, setTransferFee] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await TicketsService.getTicketDetail(ticketId);
        setTicket(response.ticket);
        
        // Calculate transfer fee if event has transfer fee settings
        // For now, we'll fetch it from the backend response or calculate it
        // The backend will calculate and return it in the transfer response
      } catch (error: any) {
        console.error("Error fetching ticket:", error);
        toast({
          title: t("transferTicket.error.title", "Error"),
          description:
            error?.message ||
            t("transferTicket.error.description", "Failed to load ticket details"),
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId, toast, t, navigate]);

  const calculateTransferFee = () => {
    if (!ticket) return 0;
    
    // This is a placeholder - the actual fee will be calculated by the backend
    // For now, show a default fee or fetch from event
    // The backend will return the actual fee in the transfer response
    return 50; // Default flat fee
  };

  const handleConfirm = async () => {
    if (!recipientPhone || !agreed) {
      toast({
        title: t("transferTicket.toast.errorTitle", "Error"),
        description: t(
          "transferTicket.toast.errorDescription",
          "Please provide recipient phone number and agree to the terms"
        ),
        variant: "destructive",
      });
      return;
    }

    if (!ticketId) {
      toast({
        title: t("transferTicket.toast.errorTitle", "Error"),
        description: t("transferTicket.toast.errorDescription", "Invalid ticket"),
        variant: "destructive",
      });
      return;
    }

    try {
      setTransferring(true);
      const response = await TicketsService.transferTicket(ticketId, {
        recipient_mobile: recipientPhone,
        recipient_name: recipientName || undefined,
      });

      // Update transfer fee from response if available
      if (response.transfer_fee !== undefined) {
        setTransferFee(response.transfer_fee);
      }

      // Show success modal instead of navigating immediately
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast({
        title: t("transferTicket.toast.errorTitle", "Error"),
        description:
          error?.message ||
          t("transferTicket.toast.errorDescription", "Failed to transfer ticket"),
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

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
        {t("transferTicket.notFound", "Ticket not found")}
      </div>
    );
  }

  const fee = transferFee ?? calculateTransferFee();

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto py-12 px-4 max-w-xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("transferTicket.title", "Transfer Ticket")} - {ticket.eventTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                {t("transferTicket.phoneLabel", "Recipient Phone Number")} *
              </label>
              <Input
                type="tel"
                placeholder={t("transferTicket.phonePlaceholder", "e.g., 01123456789")}
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                {t("transferTicket.nameLabel", "Recipient Name")} (Optional)
              </label>
              <Input
                placeholder={t("transferTicket.namePlaceholder", "Recipient's name")}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="policy"
                checked={agreed}
                onCheckedChange={(val) => setAgreed(!!val)}
              />
              <label htmlFor="policy" className="text-sm text-muted-foreground">
                {t("transferTicket.policyLabel", "I agree to the transfer terms and conditions")}
              </label>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                {t("transferTicket.ticketPrice", "Ticket Price")}:
              </div>
              <div className="text-lg font-semibold text-foreground">
                {typeof ticket.price === 'number' ? ticket.price.toFixed(2) : parseFloat(String(ticket.price || 0)).toFixed(2)} EGP
              </div>
              <div className="text-sm text-muted-foreground mt-2 mb-1">
                {t("transferTicket.transferFee", "Transfer Fee")}:
              </div>
              <div className="text-lg font-semibold text-foreground">
                {fee.toFixed(2)} EGP
              </div>
              <div className="border-t border-border mt-3 pt-3">
                <div className="text-sm text-muted-foreground mb-1">
                  {t("transferTicket.total", "Total")}:
                </div>
                <div className="text-xl font-bold text-foreground">
                  {fee.toFixed(2)} EGP
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={!recipientPhone || !agreed || transferring}
            >
              {transferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("transferTicket.transferring", "Transferring...")}
                </>
              ) : (
                t("transferTicket.confirmButton", "Confirm Transfer")
              )}
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              {t("transferTicket.success.title", "Transfer Successful!")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t(
                "transferTicket.success.description",
                "Your ticket has been successfully transferred to the recipient."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/profile#bookings");
              }}
              className="w-full sm:w-auto"
            >
              {t("transferTicket.success.viewBookings", "View My Bookings")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
