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
  singleProducts: Record<string, Product>;
}

const initialState: ProductsState = { items: [], singleProducts: {} };

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
  },
});

export const { setProducts, setSingleProduct } = productsSlice.actions;
export type { Product };
export default productsSlice.reducer;
