"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useEffect } from "react";

interface QuickCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (category: { id: string; name: string }) => void;
}

interface CategoryFormData {
  name: string;
}

export function QuickCategoryModal({ open, onOpenChange, onSuccess }: QuickCategoryModalProps) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return (await api.post("/categories", { name: data.name.trim() })).data;
    },
    onSuccess: (newCategory) => {
      toast.success(`Category "${newCategory.name}" created successfully!`);
      qc.invalidateQueries({ queryKey: ["categories"] });
      onSuccess(newCategory);
      onOpenChange(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create category");
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay">
          <Dialog.Content className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Quick Add Category</h2>
              <Dialog.Close asChild>
                <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ borderRadius: "50%", padding: "0.25rem" }}>
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem 1.5rem" }}>
                <div className="form-group">
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.name ? "border-red-500" : ""}`}
                    placeholder="e.g. T-Shirts, Shirts, Jeans"
                    {...register("name", { required: "Category name is required" })}
                  />
                  {errors.name && (
                    <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                      {errors.name.message}
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  padding: "1rem 1.5rem",
                  borderTop: "1px solid var(--border-color)",
                  background: "var(--bg-tertiary)",
                  borderBottomLeftRadius: "var(--radius-xl)",
                  borderBottomRightRadius: "var(--radius-xl)",
                }}
              >
                <Dialog.Close asChild>
                  <button type="button" className="btn btn-secondary">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={mutation.isPending}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
                >
                  {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Save Category
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
