"use client";

import { FC, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setPage,
  setTotalCount,
  setLimit,
  setCurrentPage,
  Product,
} from "@/store/productSlice";
import { RootState } from "@/store/store";
import ProductCard from "./productCard";
import { MdOutlineSkipPrevious, MdOutlineSkipNext } from "react-icons/md";

interface ProductsProps {
  products: Product[];
}

/** Validate image URL: only accept absolute http(s) and common image extensions */
const isValidImageUrl = (url?: string) => {
  if (!url || typeof url !== "string") return false;
  if (url.includes("localhost")) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  } catch {
    return false;
  }
  return true;
};

const sanitizeProductsImages = (items: Product[]): Product[] =>
  items.map((p) => ({
    ...p,
    images: ((p.images || []) as string[]).filter(
      isValidImageUrl
    ) as unknown as Product["images"],
  }));

const Products: FC<ProductsProps> = ({ products }) => {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const pages = useSelector((state: RootState) => state.products.pages);
  const storedTotal = useSelector(
    (state: RootState) => state.products.totalCount
  );

  const currentPage = useSelector(
    (state: RootState) => state.products.currentPage ?? 1
  );
  const limit = useSelector((state: RootState) => state.products.limit ?? 8);

  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [localTotal, setLocalTotal] = useState<number>(
    storedTotal ?? products.length
  );

  // Seed Redux cache for page 1 with sanitized images (runs when products or limit change)
  useEffect(() => {
    const key = `p1-l${limit}`;
    const seeded = sanitizeProductsImages(products).slice(0, limit);
    dispatch(setPage({ key, items: seeded }));
    setCurrentProducts(seeded);
    // if server provided total elsewhere, it should be dispatched by the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, products, limit]);

  useEffect(() => {
    const key = `p${currentPage}-l${limit}`;

    if (pages && pages[key]) {
      setCurrentProducts(pages[key]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const offset = (currentPage - 1) * limit;
    const url = `https://api.bitechx.com/products?offset=${offset}&limit=${limit}`;

    async function fetchPage() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);

        const data = await res.json();

        const items: Product[] =
          data?.products ?? data?.items ?? (Array.isArray(data) ? data : []);
        const sanitizedItems = sanitizeProductsImages(items);

        const serverTotal =
          data?.totalCount ??
          data?.meta?.totalCount ??
          data?.count ??
          undefined;
        if (typeof serverTotal === "number") {
          dispatch(setTotalCount(serverTotal));
          setLocalTotal(serverTotal);
        }

        dispatch(setPage({ key, items: sanitizedItems }));
        setCurrentProducts(sanitizedItems);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
          setError(err.message ?? "Failed to load products");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchPage();
    return () => controller.abort();
  }, [currentPage, limit, token, pages, dispatch]);

  const computedTotal = storedTotal ?? localTotal;
  const totalPages = Math.max(1, Math.ceil(computedTotal / limit));

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    dispatch(setCurrentPage(page));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setLimit(newLimit));
    dispatch(setCurrentPage(1));
  };

  return (
    <>
      <div className="my-4">
        <span className="text-4xl">Products</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {isLoading ? (
          Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="h-56 bg-foreground/8 rounded-lg animate-pulse"
            />
          ))
        ) : currentProducts.length > 0 ? (
          currentProducts.map((product) => (
            <ProductCard key={product.id ?? product.slug} product={product} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            {error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <p className="text-gray-500">No products available.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 mb-4 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            className="px-4 py-2 bg-foreground/15 rounded-lg disabled:opacity-50"
            aria-label="Previous page"
          >
            <MdOutlineSkipPrevious size={20} />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const half = Math.floor(7 / 2);
              const start = Math.max(
                1,
                Math.min(currentPage - half, totalPages - 6)
              );
              const pageNum = start + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 rounded-lg ${
                    pageNum === currentPage
                      ? "bg-foreground text-background"
                      : "bg-foreground/15"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            className="px-4 py-2 bg-foreground/15 rounded-lg disabled:opacity-50"
            aria-label="Next page"
          >
            <MdOutlineSkipNext size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Items per page:</label>
          <select
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="px-2 py-1 bg-foreground/15 rounded-lg"
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={16}>16</option>
          </select>
        </div>
      </div>
    </>
  );
};
export default Products;
