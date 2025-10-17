import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Category {
  id: string;
  name: string;
  image?: string | null;
  description?: string | null;
  cratedAt: string;
}

interface CategoriesState {
  list: Category[];
  loading: boolean;
  error?: string | null;
}

const initialState: CategoriesState = {
  list: [],
  loading: false,
  error: null,
};

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setCategories(state, action: PayloadAction<Category[]>) {
      state.list = action.payload;
      state.loading = false;
      state.error = null;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    clearCategories(state) {
      state.list = [];
      state.error = null;
      state.loading = false;
    },
  },
});

export const { setLoading, setCategories, setError, clearCategories } =
  categoriesSlice.actions;
export default categoriesSlice.reducer;
