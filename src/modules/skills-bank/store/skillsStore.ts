import { create } from "zustand";

interface SkillsBankState {
  selectedSkillId?: string;
  search: string;
  category: string;
  setSelectedSkillId: (id?: string) => void;
  setSearch: (search: string) => void;
  setCategory: (category: string) => void;
}

export const useSkillsStore = create<SkillsBankState>((set) => ({
  selectedSkillId: undefined,
  search: "",
  category: "all",
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
  setSearch: (search) => set({ search }),
  setCategory: (category) => set({ category }),
}));
