import type { Item, ItemInput } from "@/api/items";
import { ItemForm } from "@/components/items/item-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ItemCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: ItemInput) => Promise<Item>;
  onCreated: (item: Item) => void;
};

export function ItemCreateDialog({
  open,
  onOpenChange,
  onCreate,
  onCreated,
}: ItemCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="item-create-description">
        <DialogHeader>
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            New item
          </p>
          <DialogTitle className="text-xl font-semibold">
            Create item
          </DialogTitle>
          <DialogDescription
            id="item-create-description"
            className="text-muted-foreground text-sm"
          >
            Add a snippet, prompt, command, or note.
          </DialogDescription>
        </DialogHeader>
        <ItemForm
          submitLabel="Create item"
          onCancel={() => onOpenChange(false)}
          onSubmit={async (input) => {
            onCreated(await onCreate(input));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
