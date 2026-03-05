import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "select" | "switch" | "textarea" | "date" | "time";
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  readOnly?: boolean;
}

interface CrudDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldConfig[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  isPending?: boolean;
}

export function CrudDialog({ open, onClose, title, fields, initialData, onSubmit, isPending }: CrudDialogProps) {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      const defaults: Record<string, any> = {};
      fields.forEach((f) => {
        defaults[f.key] = initialData?.[f.key] ?? f.defaultValue ?? (f.type === "switch" ? false : f.type === "number" ? "" : "");
      });
      setForm(defaults);
    }
  }, [open, initialData, fields]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const processed: Record<string, any> = {};
    fields.forEach((f) => {
      const val = form[f.key];
      if (f.type === "number" && val !== "" && val !== undefined) {
        processed[f.key] = Number(val);
      } else if (f.type === "switch") {
        processed[f.key] = !!val;
      } else if (val !== "" && val !== undefined) {
        processed[f.key] = val;
      }
    });
    onSubmit(processed);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}{f.required && " *"}</Label>
              {f.type === "select" ? (
                <Select
                  value={String(form[f.key] || "")}
                  onValueChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                >
                  <SelectTrigger data-testid={`select-${f.key}`}>
                    <SelectValue placeholder={f.placeholder || `Select ${f.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "switch" ? (
                <div className="flex items-center gap-2">
                  <Switch
                    id={f.key}
                    checked={!!form[f.key]}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                    data-testid={`switch-${f.key}`}
                  />
                  <span className="text-sm text-muted-foreground">{form[f.key] ? "Yes" : "No"}</span>
                </div>
              ) : f.type === "textarea" ? (
                <Textarea
                  id={f.key}
                  value={form[f.key] || ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  data-testid={`textarea-${f.key}`}
                />
              ) : (
                <Input
                  id={f.key}
                  type={f.type || "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  required={f.required}
                  placeholder={f.placeholder}
                  readOnly={f.readOnly}
                  data-testid={`input-${f.key}`}
                />
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">Cancel</Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit">
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
