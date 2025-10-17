import { FC } from "react";
import Link from "next/link";
import { Category } from "@/store/categorySlice";

interface Product {
  name: string;
  price: number;
  slug: string;
  images?: string[] | null;
  category: Category;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: FC<ProductCardProps> = ({ product }) => {
  return (
    <Link href={`/products/${product.slug}`} className="block group">
      <div className="bg-foreground/15 rounded-lg shadow-lg overflow-hidden transition-all duration-200 ease-in-out hover:cursor-pointer hover:scale-[0.992] hover:shadow-2xl">
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-gray-500 text-lg">No Image</span>
          )}
        </div>
        <div className="p-4 transition-all duration-400 ease-in-out group-hover:scale-[1.008]">
          <h2 className="text-xl font-semibold truncate">{product.name}</h2>
          <p className="text-lg mt-2">${product.price}</p>
          <button className="mt-4 w-full bg-success text-white py-2 rounded hover:bg-success/85 transition-colors duration-300">
            Buy Now
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
