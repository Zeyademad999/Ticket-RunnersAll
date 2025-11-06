import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface CardExpiredModalProps {
  open: boolean;
  onClose: () => void;
}

export const CardExpiredModal = ({ open, onClose }: CardExpiredModalProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleRenewClick = () => {
    onClose(); // Close the modal
    navigate("/profile#nfc"); // Navigate to renewal page
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cardExpired.title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {t("cardExpired.message")}
        </p>
        <Button onClick={handleRenewClick}>
          {t("cardExpired.renewButton")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
