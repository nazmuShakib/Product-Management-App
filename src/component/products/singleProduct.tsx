"use client";

import { FC, useEffect, useState } from "react";
import { GrFormPrevious, GrFormNext } from "react-icons/gr";
import { useDispatch, useSelector } from "react-redux";
import { setSingleProduct } from "@/store/productSlice";

interface Category {
  id: string;
  name: string;
  image: string;
  description: string | null;
}
interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  slug: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

interface SingleProductProps {
  product: Product;
  slug: string;
}

const SingleProduct: FC<SingleProductProps> = ({ product, slug }) => {
  const dispatch = useDispatch();

  const cachedProduct = useSelector(
    (state: any) => state.products?.singleProducts?.[slug]
  );
  const singleproduct = cachedProduct || product;

  useEffect(() => {
    if (singleproduct) {
      dispatch(setSingleProduct(singleproduct));
    }
  }, [dispatch, product]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = product.images || [];

  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4">{product.name}</h1>

      <div className="relative mb-6">
        {images && images.length > 0 ? (
          <img
            src={images[currentIndex]}
            alt={`${product.name} image ${currentIndex + 1}`}
            className="w-full h-80 object-contain rounded shadow-lg"
          />
        ) : (
          <div className="w-full h-80 bg-gray-200 flex items-center justify-center text-gray-500">
            No Image Available
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition"
            >
              <GrFormPrevious />
            </button>
            <button
              onClick={handleNext}
              className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition"
            >
              <GrFormNext />
            </button>
          </>
        )}
      </div>
      <div className="flex mb-4 flex-row items-center justify-between sm:justify-around gap-4">
        <div className="flex flex-col text-lg">
          <span className="text-sm">Price</span>
          <span className="font-semibold">${product.price}</span>
        </div>
        <div className="flex flex-col text-lg">
          <span className="text-sm">Category</span>
          <span className="font-semibold">{product.category.name}</span>
        </div>
      </div>
      <p className="text-base mb-6">{product.description}</p>
    </div>
  );
};
export default SingleProduct;
