import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  currentNotes?: string | null;
  onSave: (notes: string) => void;
  isLoading?: boolean;
}

export function ItemNotesDialog({
  open,
  onOpenChange,
  itemName,
  currentNotes,
  onSave,
  isLoading,
}: ItemNotesDialogProps) {
  const { t } = useLanguage();
  const [notes, setNotes] = useState(currentNotes || "");

  const handleSave = () => {
    onSave(notes.trim());
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("item_notes")}
          </DialogTitle>
          <DialogDescription>
            {t("notes_placeholder")} "{itemName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="itemNotes">{t("notes")}</Label>
            <Textarea
              id="itemNotes"
              placeholder={t("notes_placeholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t("processing") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
