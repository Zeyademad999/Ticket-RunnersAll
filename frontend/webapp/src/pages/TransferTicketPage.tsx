import { useParams } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function TransferTicketPage() {
  const { t } = useTranslation();
  const { bookingId, ticketIndex } = useParams();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleConfirm = () => {
    if (!email || !agreed) {
      toast({
        title: t("transferTicket.toast.errorTitle"),
        description: t("transferTicket.toast.errorDescription"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("transferTicket.toast.successTitle"),
      description: t("transferTicket.toast.successDescription", {
        ticketIndex,
        bookingId,
        email,
      }),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto py-12 px-4 max-w-xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("transferTicket.title", { ticketIndex })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                {t("transferTicket.emailLabel")}
              </label>
              <Input
                placeholder={t("transferTicket.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="policy"
                checked={agreed}
                onCheckedChange={(val) => setAgreed(!!val)}
              />
              <label htmlFor="policy" className="text-sm text-muted-foreground">
                {t("transferTicket.policyLabel")}
              </label>
            </div>

            <div className="text-sm text-muted-foreground">
              {t("transferTicket.feeNotice", { amount: "25 EGP" })}
            </div>

            <Button className="w-full" onClick={handleConfirm}>
              {t("transferTicket.confirmButton")}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
