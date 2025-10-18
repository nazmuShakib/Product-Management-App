"use client";

import { FC, useEffect, useMemo, useState, useRef } from "react";
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
import { Category, setCategories } from "@/store/categorySlice";
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

// small helpers to avoid using `any`
const isAbortError = (err: unknown) =>
  typeof err === "object" &&
  err !== null &&
  "name" in err &&
  (err as { name?: unknown }).name === "AbortError";

const getErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err ?? "");

const getProductCategoryId = (p: Product): string | undefined => {
  const asRecord = p as unknown as Record<string, unknown>;
  const catObj = asRecord.category;
  if (catObj && typeof catObj === "object") {
    const id = (catObj as Record<string, unknown>).id;
    if (id !== undefined) return String(id);
  }
  const catId = asRecord.categoryId;
  if (catId !== undefined) return String(catId);
  return undefined;
};

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
  const categories = useSelector((state: RootState) => state.categories.list);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [localTotal, setLocalTotal] = useState<number>(p.length);

  // Category search states
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);

  // States for delete functionality
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [nameQuery, setNameQuery] = useState<string>("");

  // Prefetch states to ensure client-side search covers all items
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchDone, setPrefetchDone] = useState(false);
  const prefetchAbortRef = useRef<AbortController | null>(null);

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
      } catch (err: unknown) {
        if (!isAbortError(err)) {
          console.error(err);
          setError(getErrorMessage(err) || "Failed to load products");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchPage();
    return () => controller.abort();
  }, [products, currentPage, limit, token, pages, dispatch]);

  // fetch categories for dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      setIsCategoriesLoading(true);
      try {
        const res = await fetch("https://api.bitechx.com/categories", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!res.ok)
          throw new Error(`Failed to fetch categories: ${res.status}`);
        const data = await res.json();
        const items: Category[] =
          data?.categories ?? data?.items ?? (Array.isArray(data) ? data : []);
        dispatch(setCategories(items));
      } catch (err: unknown) {
        // do not treat AbortError specially here; just log
        console.error("Failed to fetch categories:", err);
      } finally {
        setIsCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [token, dispatch]);

  const computedTotal = storedTotal ?? localTotal;

  const allCachedItems = useMemo(() => {
    const pageValues = pages ? Object.values(pages).flat() : [];
    if (pageValues.length === 0) return sanitizeProductsImages(products);
    const map = new Map<string, Product>();
    for (const prod of pageValues) {
      const key = prod.id ?? prod.slug ?? JSON.stringify(prod);
      map.set(String(key), prod);
    }
    for (const prod of sanitizeProductsImages(products)) {
      const key = prod.id ?? prod.slug ?? JSON.stringify(prod);
      if (!map.has(String(key))) map.set(String(key), prod);
    }
    return Array.from(map.values());
  }, [pages, products]);

  // include categoryFilter in filtersActive
  const filtersActive = Boolean(nameQuery.trim() || categoryFilter);

  const filteredAll = useMemo(() => {
    const nq = nameQuery.trim().toLowerCase();
    const catId = categoryFilter;
    return allCachedItems.filter((prod) => {
      const nameMatch =
        !nq ||
        String(prod.name ?? "")
          .toLowerCase()
          .includes(nq);

      let categoryMatch = true;
      if (catId) {
        const prodCatId = getProductCategoryId(prod);
        categoryMatch =
          String(prodCatId ?? "").toLowerCase() === String(catId).toLowerCase();
      }

      return nameMatch && categoryMatch;
    });
  }, [allCachedItems, nameQuery, categoryFilter]);

  useEffect(() => {
    dispatch(setCurrentPage(1));
  }, [nameQuery, categoryFilter, dispatch]);

  // Prefetch missing pages into local cache when user starts filtering
  useEffect(() => {
    if (!filtersActive) return;
    if (prefetchDone) return;
    const total = typeof computedTotal === "number" ? computedTotal : undefined;
    if (typeof total === "number") {
      const cachedCount = allCachedItems.length;
      if (cachedCount >= total) {
        setPrefetchDone(true);
        return;
      }
    }

    let aborted = false;
    const controller = new AbortController();
    prefetchAbortRef.current = controller;

    const doPrefetch = async () => {
      setIsPrefetching(true);
      try {
        const totalItems =
          typeof computedTotal === "number" ? computedTotal : undefined;
        const pagesCount = totalItems ? Math.ceil(totalItems / limit) : 10;
        for (let page = 1; page <= pagesCount; page++) {
          if (aborted) break;
          const key = `p${page}-l${limit}`;
          if (pages && pages[key]) continue;
          const offset = (page - 1) * limit;
          const url = `https://api.bitechx.com/products?offset=${offset}&limit=${limit}`;
          try {
            const res = await fetch(url, {
              headers: { Authorization: token ? `Bearer ${token}` : "" },
              cache: "no-store",
              signal: controller.signal,
            });
            if (!res.ok) {
              console.warn("prefetch page failed", page, res.status);
              break;
            }
            const data = await res.json();
            const items: Product[] =
              data?.products ??
              data?.items ??
              (Array.isArray(data) ? data : []);
            const sanitizedItems = sanitizeProductsImages(items);
            dispatch(setPage({ key, items: sanitizedItems }));
            dispatch(setProducts([...(products || []), ...items]));
            const serverTotal =
              data?.totalCount ??
              data?.meta?.totalCount ??
              data?.count ??
              undefined;
            if (typeof serverTotal === "number") {
              dispatch(setTotalCount(serverTotal));
              setLocalTotal(serverTotal);
            }
          } catch (e: unknown) {
            if (isAbortError(e)) {
              aborted = true;
              break;
            }
            console.warn("prefetch error", e);
            break;
          }
        }
        setPrefetchDone(true);
      } finally {
        setIsPrefetching(false);
      }
    };

    doPrefetch();

    return () => {
      aborted = true;
      controller.abort();
      prefetchAbortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersActive, dispatch]);

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
  const totalPages = Math.max(1, Math.ceil((displayTotal ?? 0) / limit));

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
    setPrefetchDone(false);
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
              (it) => String(it.id ?? it.slug) !== removeKey
            );
            if (filtered.length !== items.length) {
              dispatch(setPage({ key, items: filtered }));
            }
          });
        }

        // Update items list in redux
        if (Array.isArray(products) && products.length > 0) {
          const newItems = products.filter(
            (it) => String(it.id ?? it.slug) !== removeKey
          );
          if (newItems.length !== products.length) {
            dispatch(setProducts(newItems));
          }
        }

        // Update current displayed products
        setCurrentProducts((prev) =>
          prev.filter((it) => String(it.id ?? it.slug) !== removeKey)
        );

        // Decrement total count
        if (typeof computedTotal === "number") {
          const newTotal = Math.max(0, computedTotal - 1);
          dispatch(setTotalCount(newTotal));
          setLocalTotal((prev) => Math.max(0, prev - 1));
        }
      } catch (cacheErr: unknown) {
        console.error("Failed to update redux cache after delete:", cacheErr);
      }

      // Close the modal
      setProductToDelete(null);
    } catch (err: unknown) {
      console.error(err);
      setDeleteError(getErrorMessage(err) ?? "Failed to delete product");
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3 sm:mt-0 sm:justify-end">
          <div className="order-last sm:order-first flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              className="px-3 py-2 rounded-lg bg-foreground/15 outline-0 focus:ring-2 focus:ring-foreground transition w-full sm:max-w-xs"
              placeholder="Search by name..."
              value={nameQuery}
              onChange={(e) => {
                setNameQuery(e.target.value);
                setPrefetchDone(false);
              }}
            />

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPrefetchDone(false);
              }}
              className="w-full sm:w-48 px-3 py-2 rounded-lg bg-foreground/15 outline-0 focus:ring-2 focus:ring-foreground transition"
              disabled={isCategoriesLoading}
            >
              <option
                value=""
                className="text-background dark:text-foreground dark:bg-background"
              >
                All Categories
              </option>
              {categories.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  className="text-background dark:text-foreground dark:bg-background"
                >
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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

      {isPrefetching && (
        <div className="px-4 text-sm text-gray-500">Preparing results...</div>
      )}

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
              product={product}
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
              Are you sure you want to delete{" "}
              <span className="font-medium">{productToDelete.name}</span>? This
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
