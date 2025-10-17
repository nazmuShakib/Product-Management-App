"use client";

import { FC, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setPage,
  setTotalCount,
  setLimit,
  setCurrentPage,
  Product,
  setProducts,
} from "@/store/productSlice";
import { RootState } from "@/store/store";
import ProductCard from "./productCard";
import { MdOutlineSkipPrevious, MdOutlineSkipNext } from "react-icons/md";
import { useRouter } from "next/navigation";

interface ProductsProps {
  products: Product[];
}

const isValidImageUrl = (url?: string) => {
  if (!url || typeof url !== "string") return false;
  if (url.includes("localhost")) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  } catch {
    return false;
  }
  const pathname = url.split("?")[0].split("#")[0];
  return /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(pathname);
};

const sanitizeProductsImages = (items: Product[]): Product[] =>
  items.map((p) => ({
    ...p,
    images: ((p.images || []) as string[]).filter(
      isValidImageUrl
    ) as unknown as Product["images"],
  }));

const Products: FC<ProductsProps> = ({ products: p }) => {
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
  const products = useSelector((state: RootState) => state.products.items);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [localTotal, setLocalTotal] = useState<number>(p.length);

  const [nameQuery, setNameQuery] = useState<string>("");

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
        dispatch(setProducts(items));
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
  }, [products, currentPage, limit, token, pages, dispatch]);

  const computedTotal = storedTotal ?? localTotal;

  const allCachedItems = useMemo(() => {
    const pageValues = pages ? Object.values(pages).flat() : [];
    if (pageValues.length === 0) return sanitizeProductsImages(products);
    const map = new Map<string, Product>();
    for (const p of pageValues) {
      const key = p.id ?? p.slug ?? JSON.stringify(p);
      map.set(String(key), p);
    }
    for (const p of sanitizeProductsImages(products)) {
      const key = p.id ?? p.slug ?? JSON.stringify(p);
      if (!map.has(String(key))) map.set(String(key), p);
    }
    return Array.from(map.values());
  }, [pages, products]);

  const filtersActive = Boolean(nameQuery.trim());

  const filteredAll = useMemo(() => {
    const nq = nameQuery.trim().toLowerCase();
    if (!nq) return allCachedItems;
    return allCachedItems.filter((p) =>
      String(p.name ?? "")
        .toLowerCase()
        .includes(nq)
    );
  }, [allCachedItems, nameQuery]);

  useEffect(() => {
    dispatch(setCurrentPage(1));
  }, [nameQuery]);

  const sourceList = filtersActive ? filteredAll : currentProducts;
  const displayTotal = filtersActive ? filteredAll.length : computedTotal;
  const totalPages = Math.max(1, Math.ceil(displayTotal / limit));

  const displayedProducts = useMemo(() => {
    if (!filtersActive) return sourceList;
    const start = (currentPage - 1) * limit;
    return filteredAll.slice(start, start + limit);
  }, [filtersActive, filteredAll, sourceList, currentPage, limit]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    dispatch(setCurrentPage(page));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setLimit(newLimit));
    dispatch(setCurrentPage(1));
  };

  const router = useRouter();
  const handleClick = () => {
    router.push("products/create");
  };

  return (
    <>
      <div className="my-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4">
        <div>
          <h2 className="text-4xl">Products</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3 sm:mt-0 w-full sm:justify-end">
          <input
            type="text"
            className="px-3 py-2 rounded-lg bg-foreground/15 outline-0 focus:ring-2 focus:ring-foreground transition"
            placeholder="Search by name..."
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
          />
          <div>
            <button
              type="button"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-success  hover:bg-success/70 focus:outline-none cursor-pointer"
              onClick={handleClick}
            >
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {isLoading && !filtersActive ? (
          Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="h-56 bg-foreground/8 rounded-lg animate-pulse"
            />
          ))
        ) : displayedProducts.length > 0 ? (
          displayedProducts.map((product) => (
            <ProductCard
              key={product.id ?? product.slug}
              product={product as unknown as any}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            {error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <p className="text-gray-500">
                {filtersActive
                  ? "No products match your filters."
                  : "No products available."}
              </p>
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
