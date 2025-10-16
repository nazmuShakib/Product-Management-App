"use client";

import { useEffect, FC } from "react";
import { useDispatch } from "react-redux";
import { setProducts, Product } from "@/store/productSlice";
import ProductCard from "./productCard";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default Products;
