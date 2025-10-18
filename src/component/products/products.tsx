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
import Loading from "../loading/loading";

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

  // States for delete functionality
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

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

  // Delete functionality handlers
  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteError(null);
  };

  const cancelDelete = () => {
    setProductToDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!productToDelete || !productToDelete.id) {
      setDeleteError("Missing product ID");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(
        `https://api.bitechx.com/products/${encodeURIComponent(
          String(productToDelete.id)
        )}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Server responded ${res.status}`);
      }

      // Update redux cache after successful deletion
      try {
        const removeKey = String(
          productToDelete.id ?? productToDelete.slug ?? ""
        );

        // Update pages in cache
        if (pages && typeof pages === "object") {
          Object.keys(pages).forEach((key) => {
            const items = (pages as Record<string, Product[]>)[key] || [];
            const filtered = items.filter(
              (p) => String(p.id ?? p.slug) !== removeKey
            );
            if (filtered.length !== items.length) {
              dispatch(setPage({ key, items: filtered }));
            }
          });
        }

        // Update items list in redux
        if (Array.isArray(products) && products.length > 0) {
          const newItems = products.filter(
            (p) => String(p.id ?? p.slug) !== removeKey
          );
          if (newItems.length !== products.length) {
            dispatch(setProducts(newItems));
          }
        }

        // Update current displayed products
        setCurrentProducts((prev) =>
          prev.filter((p) => String(p.id ?? p.slug) !== removeKey)
        );

        // Update filtered list if filters are active
        if (filtersActive) {
          // This will be handled by the useMemo dependencies
          // We're updating the underlying data so the filter will rerun
        }

        // Decrement total count
        if (typeof computedTotal === "number") {
          const newTotal = Math.max(0, computedTotal - 1);
          dispatch(setTotalCount(newTotal));
          setLocalTotal((prev) => Math.max(0, prev - 1));
        }
      } catch (cacheErr) {
        console.error("Failed to update redux cache after delete:", cacheErr);
      }

      // Close the modal
      setProductToDelete(null);
    } catch (err: any) {
      console.error(err);
      setDeleteError(err?.message ?? "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const router = useRouter();
  const handleClick = () => {
    router.push("products/create");
  };

  if (products.length === 0) return <Loading />;

  return (
    <>
      <div className="my-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4">
        <div>
          <h2 className="text-4xl">Products</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3 sm:mt-0 w-full sm:justify-end">
          <input
            type="text"
            className="order-last sm:order-first px-3 py-2 rounded-lg bg-foreground/15 outline-0 focus:ring-2 focus:ring-foreground transition"
            placeholder="Search by name..."
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
          />
          <div>
            <button
              type="button"
              className="w-full sm:order-last order-first sm:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-success hover:bg-success/70 focus:outline-none cursor-pointer"
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
              onDeleteClick={handleDeleteClick}
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

      <div className="flex flex-col items-center sm:flex-row sm:justify-end gap-4 mb-4 px-4 w-full">
        {/* Pagination controls */}
        <div className="flex items-center justify-center w-full sm:justify-end">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            className="px-3 py-1 bg-foreground/15 rounded-lg disabled:opacity-50 flex-shrink-0"
            aria-label="Previous page"
          >
            <MdOutlineSkipPrevious size={20} />
          </button>

          <div className="flex items-center overflow-x-auto mx-1 px-1 scrollbar-none max-w-full sm:max-w-none">
            {Array.from(
              { length: Math.min(totalPages, isMobile ? 4 : 7) },
              (_, i) => {
                const visiblePages = isMobile ? 4 : 7;
                const half = Math.floor(visiblePages / 2);
                const start = Math.max(
                  1,
                  Math.min(currentPage - half, totalPages - (visiblePages - 1))
                );
                const pageNum = start + i;
                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-[36px] px-2 py-1 mx-1 rounded-lg flex-shrink-0 text-center ${
                      pageNum === currentPage
                        ? "bg-foreground text-background"
                        : "bg-foreground/15"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
            )}

            {/* Show ellipsis when there are more pages */}
            {totalPages > (isMobile ? 3 : 7) &&
              currentPage < totalPages - 1 && (
                <span className="px-2 flex-shrink-0">...</span>
              )}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            className="px-3 py-1 bg-foreground/15 rounded-lg disabled:opacity-50 flex-shrink-0"
            aria-label="Next page"
          >
            <MdOutlineSkipNext size={20} />
          </button>
        </div>

        {/* Items per page selector */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <label className="text-sm whitespace-nowrap">Items per page:</label>
          <select
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="px-2 py-1 dark:bg-background rounded-lg"
          >
            <option className="text-background dark:text-foreground" value={4}>
              4
            </option>
            <option className="text-background dark:text-foreground" value={8}>
              8
            </option>
            <option className="text-background dark:text-foreground" value={12}>
              12
            </option>
            <option className="text-background dark:text-foreground" value={16}>
              16
            </option>
          </select>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-background rounded shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-3">Confirm Delete</h3>
            <p className="text-sm mb-4">
              Are you sure you want to delete "
              <span className="font-medium">{productToDelete.name}</span>"? This
              action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-2 text-red-600">{deleteError}</div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-500 text-white rounded"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-60"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Products;
