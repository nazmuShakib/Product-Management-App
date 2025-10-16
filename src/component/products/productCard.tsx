import { FC } from "react";

interface Product {
  name: string;
  price: number;
  images?: string[] | null;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="bg-foreground/15 rounded-lg shadow-lg overflow-hidden transition-transform duration-400 ease-in-out hover:cursor-pointer hover:scale-[0.992] hover:shadow-2xl">
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
      <div className="p-4">
        <h2 className="text-xl font-semibold">{product.name}</h2>
        <p className="text-lg mt-2">${product.price}</p>
        <button className="mt-4 w-full bg-success text-white py-2 rounded hover:bg-success/85 transition-colors duration-300">
          Buy Now
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
