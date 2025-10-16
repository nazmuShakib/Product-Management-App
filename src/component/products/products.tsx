"use client";

import { useEffect, FC } from "react";
import { useDispatch } from "react-redux";
import { setProducts, Product } from "@/store/productSlice";

interface ProductsProps {
  products: Product[];
}

const Products: FC<ProductsProps> = ({ products }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setProducts(products));
  }, [dispatch, products]);

  return (
    <div>
      <h1>Products</h1>
      <pre>{JSON.stringify(products, null, 2)}</pre>
    </div>
  );
};

export default Products;
