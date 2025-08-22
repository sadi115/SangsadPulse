
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Website } from "@/lib/types"

type DeleteConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  website: Website | null;
  onConfirmDelete: () => void;
};

export function DeleteConfirmDialog({ isOpen, onOpenChange, website, onConfirmDelete }: DeleteConfirmDialogProps) {
  if (!website) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the monitor for{" "}
            <span className="font-semibold text-foreground">{website.name}</span> and remove all of its data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmDelete}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

    