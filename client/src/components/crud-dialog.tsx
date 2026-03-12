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
  type?: "text" | "number" | "email" | "password" | "textarea" | "select" | "multi-select" | "switch" | "date";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: any;
  readOnly?: boolean;
  onChange?: (value: any, currentForm: Record<string, any>, setForm: (data: any) => void) => void;
}

interface CrudDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldConfig[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  isPending?: boolean;
  errors?: Record<string, string>;
}

export function CrudDialog({ open, onClose, title, fields, initialData, onSubmit, isPending, errors }: CrudDialogProps) {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      const defaults: Record<string, any> = {};
      fields.forEach((f) => {
        let value = initialData?.[f.key] ?? f.defaultValue;
        if (f.type === "multi-select") {
          if (typeof value === "string") {
            value = value.split(",").map(v => v.trim()).filter(Boolean);
          } else if (typeof value === "number") {
            value = [String(value)];
          } else if (!Array.isArray(value)) {
            value = [];
          } else {
            value = value.map(v => String(v));
          }
        } else if (f.type === "switch") {
          value = value ?? false;
        } else {
          value = value ?? "";
        }
        defaults[f.key] = value;
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
              <Label htmlFor={f.key} className={errors?.[f.key] ? "text-destructive" : ""}>
                {f.label}{f.required && " *"}
              </Label>

              {f.type === "multi-select" ? (
                <div className={`space-y-2 p-1 ${errors?.[f.key] ? "border-red-500 rounded-md" : ""}`}>
                  <div className="flex gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => {
                        const allValues = f.options?.map(o => o.value) || [];
                        setForm(p => ({ ...p, [f.key]: allValues }));
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => setForm(p => ({ ...p, [f.key]: [] }))}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto bg-background">
                    {f.options?.map((opt) => {
                      const currentValues = Array.isArray(form[f.key]) ? form[f.key] : [];
                      const isChecked = currentValues.includes(opt.value);
                      return (
                        <label key={opt.value} className="flex items-center gap-3 p-1 hover:bg-accent rounded-sm cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-primary text-primary"
                            checked={isChecked}
                            onChange={(e) => {
                              let nextValues;
                              if (e.target.checked) {
                                nextValues = [...currentValues, opt.value];
                              } else {
                                nextValues = currentValues.filter((v: string) => v !== opt.value);
                              }
                              setForm((p) => ({ ...p, [f.key]: nextValues }));
                            }}
                          />
                          <span className="text-sm font-medium">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : f.type === "select" ? (
                <Select
                  value={String(form[f.key] || "")}
                    // CrudDialog.tsx ke andar
                    onValueChange={(v) => {
                      // 1. Local state update karo (Jo input box mein dikhega)
                      const nextForm = { ...form, [f.key]: v };
                      setForm(nextForm);

                      // 2. onChange trigger karo (Jo displayDevices ko update karega)
                      if (f.onChange) {
                        f.onChange(v, nextForm, setForm);
                      }
                    }}
                >
                  <SelectTrigger className={errors?.[f.key] ? "border-destructive" : ""}>
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
                  />
                  <span className="text-sm text-muted-foreground">{form[f.key] ? "Yes" : "No"}</span>
                </div>
              ) : f.type === "textarea" ? (
                <Textarea
                  id={f.key}
                  className={errors?.[f.key] ? "border-destructive focus-visible:ring-destructive" : ""}
                  value={form[f.key] || ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              ) : (
                <Input
                  id={f.key}
                  type={f.type || "text"}
                  className={errors?.[f.key] ? "border-destructive focus-visible:ring-destructive" : ""}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  required={f.required}
                  placeholder={f.placeholder}
                  readOnly={f.readOnly}
                />
              )}
              {errors?.[f.key] && (
                <p className="text-[12px] font-medium text-destructive mt-1 animate-in fade-in slide-in-from-top-1">
                  {errors[f.key]}
                </p>
              )}
            </div>
          ))}
          <DialogFooter className="sticky bottom-0 bg-background pt-2 border-t mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}