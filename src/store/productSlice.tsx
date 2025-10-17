import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Product {
  id: string;
  name: string;
  description: string;
  images: [string];
  price: number;
  slug: string;
  category: object;
  createdAt: string;
  updatedAt: string;
}

interface PagePayload {
  key: string;
  items: Product[];
}

interface ProductsState {
  items: Product[];
  singleProducts: Record<string, Product>;
  pages: Record<string, Product[]>;
  totalCount?: number;
  lastLoadedKey?: string;
  limit: number;
  currentPage: number;
}

const initialState: ProductsState = {
  items: [],
  singleProducts: {},
  pages: {},
  totalCount: undefined,
  lastLoadedKey: undefined,
  limit: 8,
  currentPage: 1,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProducts(state, action: PayloadAction<Product[]>) {
      state.items = action.payload;
    },
    setSingleProduct(state, action: PayloadAction<Product>) {
      state.singleProducts[action.payload.slug] = action.payload;
    },
    setPage(state, action: PayloadAction<PagePayload>) {
      state.pages[action.payload.key] = action.payload.items;
      state.lastLoadedKey = action.payload.key;
    },
    setTotalCount(state, action: PayloadAction<number | undefined>) {
      state.totalCount = action.payload;
    },
    clearPages(state) {
      state.pages = {};
      state.lastLoadedKey = undefined;
    },
    setLimit(state, action: PayloadAction<number>) {
      state.limit = action.payload;
    },
    setCurrentPage(state, action: PayloadAction<number>) {
      state.currentPage = action.payload;
    },
  },
});

export const {
  setProducts,
  setSingleProduct,
  setPage,
  setTotalCount,
  clearPages,
  setLimit,
  setCurrentPage,
} = productsSlice.actions;
export type { Product };
export default productsSlice.reducer;
