import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface TransferState {
  ticketIndexes: number[];
  bookingId: string;
}

export default function TransferTicketsPage() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const { ticketIndexes = [], bookingId = "" } = (state as TransferState) || {};
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!ticketIndexes.length || !bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark text-foreground">
        {t("transferTickets.missingData")}
      </div>
    );
  }

  const handleConfirm = () => {
    if (!email || !agree) {
      toast({
        title: t("transferTickets.toast.incompleteTitle"),
        description: t("transferTickets.toast.incompleteDescription"),
        variant: "destructive",
      });
      return;
    }

    // TODO: call backend API here

    toast({
      title: t("transferTickets.toast.successTitle"),
      description: t("transferTickets.toast.successDescription", {
        tickets: ticketIndexes.join(", "),
        bookingId,
        email,
      }),
    });
    navigate(`/booking/${bookingId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto max-w-md py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("transferTickets.title", {
                count: ticketIndexes.length,
                plural: ticketIndexes.length > 1 ? "s" : "",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                {t("transferTickets.recipientEmail")}
              </label>
              <Input
                type="email"
                placeholder={t("transferTickets.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={agree}
                onCheckedChange={(v) => setAgree(!!v)}
              />
              <span className="text-sm text-muted-foreground">
                {t("transferTickets.checkboxLabel")}
              </span>
            </div>

            <Button
              className="w-full"
              disabled={!email || !agree}
              onClick={handleConfirm}
            >
              {t("transferTickets.confirmButton")}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
