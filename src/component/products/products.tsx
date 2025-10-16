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
  if (products.length === 0) {
    return (
      <div className="flex justify-center items-center mt-8">
        <span className="text-2xl">No products available.</span>
      </div>
    );
  }
  return (
    <div>
      <pre>{JSON.stringify(products, null, 2)}</pre>
    </div>
  );
};

export default Products;
