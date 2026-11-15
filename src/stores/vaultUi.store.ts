import { create } from "zustand";

/** Abre el diálogo del PIN desde cualquier pantalla (p. ej. el perfil bloqueado). */
export const useVaultUi = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
