import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Product {
  id: number;
  name: string;
  description: string;
  images: [string];
  price: number;
  slug: string;
  category: object;
  createdAt: string;
  updatedAt: string;
}

interface ProductsState {
  items: Product[];
}

const initialState: ProductsState = { items: [] };

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProducts(state, action: PayloadAction<Product[]>) {
      state.items = action.payload;
    },
  },
});

export const { setProducts } = productsSlice.actions;
export type { Product };
export default productsSlice.reducer;
