import { FC } from "react";
import Link from "next/link";
import { RiDeleteBin6Line } from "react-icons/ri";
import { Product } from "@/store/productSlice";

interface ProductCardProps {
  product: Product;
  onDeleteClick: (product: Product) => void;
}

const ProductCard: FC<ProductCardProps> = ({ product, onDeleteClick }) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteClick(product);
  };

  return (
    <Link href={`/products/${product.slug}`} className="block group">
      <div className="bg-foreground/15 rounded-lg shadow-lg overflow-hidden transition-all duration-200 ease-in-out hover:cursor-pointer hover:scale-[0.992] hover:shadow-2xl relative">
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center relative">
          <button
            onClick={handleDeleteClick}
            className="absolute top-2 right-2 z-10 bg-red-600 text-white p-2 rounded-full
              opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200
              hover:bg-red-700"
            aria-label="Delete product"
          >
            <RiDeleteBin6Line size={16} />
          </button>
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
