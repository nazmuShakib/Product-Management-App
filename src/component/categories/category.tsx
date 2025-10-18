"use client";

import { FC, useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Category, setCategories } from "@/store/categorySlice";
import Loading from "../loading/loading";
import { MdOutlineSkipPrevious, MdOutlineSkipNext } from "react-icons/md";

interface CategoryListProps {
  categories?: Category[];
}

const CategoryCard: FC<{ c: Category }> = ({ c }) => {
  return (
    <div className="p-3 border rounded-lg bg-background/50">
      {c.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.image}
          alt={c.name}
          className="w-full h-36 object-cover rounded"
        />
      ) : (
        <div className="w-full h-36 bg-gray-200 rounded flex items-center justify-center text-gray-500">
          No Image
        </div>
      )}
      <h3 className="mt-3 font-semibold text-lg">{c.name}</h3>
      {c.description && (
        <p className="mt-1 text-sm text-gray-500">{c.description}</p>
      )}
    </div>
  );
};

const CategoryList: FC<CategoryListProps> = ({ categories: initial = [] }) => {
  const dispatch = useDispatch();
  const token = useSelector((s: RootState) => s.auth.token);
  const cached = useSelector((s: RootState) => s.categories.list);

  // local page cache keyed by `p{page}-l{limit}`
  const [pagesMap, setPagesMap] = useState<Record<string, Category[]>>({});
  const [itemsPage, setItemsPage] = useState<Category[]>(
    initial.length ? initial : cached || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(8);
  const [total, setTotal] = useState<number | null>(
    initial.length ? initial.length : null
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const prefetchAbortRef = useRef<AbortController | null>(null);
  const prefetchDoneRef = useRef(false);

  // debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // fetch a single page (normal pagination)
  useEffect(() => {
    const key = `p${page}-l${limit}`;

    // if cached locally, use it
    if (pagesMap[key] && pagesMap[key].length > 0) {
      setItemsPage(pagesMap[key]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const offset = (page - 1) * limit;
    const url = `https://api.bitechx.com/categories?offset=${offset}&limit=${limit}`;

    async function fetchPage() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok)
          throw new Error(`Failed to load categories: ${res.status}`);
        const data = await res.json();
        const list: Category[] =
          data?.categories ?? data?.items ?? (Array.isArray(data) ? data : []);
        setPagesMap((m) => ({ ...m, [key]: list }));
        setItemsPage(list);

        const serverTotal =
          data?.totalCount ?? data?.meta?.totalCount ?? data?.count ?? null;
        if (typeof serverTotal === "number") setTotal(serverTotal);

        // cache first page in redux when not filtered
        if (page === 1 && !debouncedQuery) {
          dispatch(setCategories(list));
        }
      } catch (err: unknown) {
        // handle AbortError without using `any`
        const name =
          typeof err === "object" && err !== null && "name" in err
            ? (err as { name?: unknown }).name
            : undefined;
        if (name !== "AbortError") {
          console.error(err);
          const msg = err instanceof Error ? err.message : String(err ?? "");
          setError(msg || "Failed to fetch categories");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchPage();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, token, debouncedQuery]);

  // build full cached items from pagesMap + redux cached
  const allCachedItems = useMemo(() => {
    const pageVals = Object.values(pagesMap).flat();
    const base = cached || [];
    const map = new Map<string, Category>();
    for (const c of [...pageVals, ...base]) {
      const key = String(c.id ?? c.name);
      if (!map.has(key)) map.set(key, c);
    }
    for (const c of initial) {
      const key = String(c.id ?? c.name);
      if (!map.has(key)) map.set(key, c);
    }
    return Array.from(map.values());
  }, [pagesMap, cached, initial]);

  // prefetch remaining pages when searching (so local filter uses full dataset)
  useEffect(() => {
    if (!debouncedQuery) {
      prefetchDoneRef.current = false;
      return;
    }

    if (prefetchDoneRef.current) return;

    const totalItems = typeof total === "number" ? total : undefined;
    if (typeof total === "number" && allCachedItems.length >= total) {
      prefetchDoneRef.current = true;
      return;
    }

    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    setIsPrefetching(true);

    const doPrefetch = async () => {
      try {
        const pagesCount = totalItems ? Math.ceil(totalItems / limit) : 10;
        for (let p = 1; p <= pagesCount; p++) {
          const key = `p${p}-l${limit}`;
          if (pagesMap[key]) continue;
          const offset = (p - 1) * limit;
          const url = `https://api.bitechx.com/categories?offset=${offset}&limit=${limit}`;
          try {
            const res = await fetch(url, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              cache: "no-store",
              signal: controller.signal,
            });
            if (!res.ok) {
              console.warn("prefetch page failed", p, res.status);
              break;
            }
            const data = await res.json();
            const list: Category[] =
              data?.categories ??
              data?.items ??
              (Array.isArray(data) ? data : []);
            setPagesMap((m) => ({ ...m, [key]: list }));
            const serverTotal =
              data?.totalCount ??
              data?.meta?.totalCount ??
              data?.count ??
              undefined;
            if (typeof serverTotal === "number") {
              setTotal(serverTotal);
            }
          } catch (e: unknown) {
            const ename =
              typeof e === "object" && e !== null && "name" in e
                ? (e as { name?: unknown }).name
                : undefined;
            if (ename === "AbortError") break;
            console.warn("prefetch error", e);
            break;
          }
        }
        prefetchDoneRef.current = true;
      } finally {
        setIsPrefetching(false);
      }
    };

    doPrefetch();

    return () => {
      controller.abort();
      prefetchAbortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, limit, token, total, pagesMap]);

  // client-side filtered list using local cached items
  const filteredAll = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return allCachedItems.length ? allCachedItems : itemsPage;
    return (allCachedItems.length ? allCachedItems : itemsPage).filter((c) =>
      String(c.name ?? "")
        .toLowerCase()
        .includes(q)
    );
  }, [debouncedQuery, allCachedItems, itemsPage]);

  const filtersActive = Boolean(debouncedQuery);

  // compute displayTotal and totalPages robustly when server total is missing
  const displayTotal = useMemo(() => {
    if (filtersActive) return filteredAll.length;
    if (typeof total === "number") return total;
    const cachedCount = allCachedItems.length;
    const pagesCached = Math.max(1, Math.ceil(cachedCount / limit));
    const estimated = Math.max(cachedCount, pagesCached * limit);
    return Math.max(estimated, itemsPage.length);
  }, [
    filtersActive,
    filteredAll,
    total,
    allCachedItems,
    itemsPage.length,
    limit,
  ]);

  let totalPages = Math.max(1, Math.ceil((displayTotal ?? 0) / limit));
  if (typeof total !== "number" && itemsPage.length === limit) {
    totalPages = Math.max(totalPages, page + 1);
  }

  const hasPrev = page > 1;
  const hasNext =
    typeof total === "number"
      ? page < totalPages
      : itemsPage.length === limit || allCachedItems.length > page * limit;

  // reset page when query or limit changes
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, limit]);

  // the list to display on current page
  const displayed = useMemo(() => {
    if (!filtersActive) return itemsPage;
    const start = (page - 1) * limit;
    return filteredAll.slice(start, start + limit);
  }, [filtersActive, filteredAll, itemsPage, page, limit]);

  const handlePrev = () => {
    if (hasPrev) setPage((p) => Math.max(1, p - 1));
  };
  const handleNext = () => {
    if (hasNext) setPage((p) => Math.min(totalPages, p + 1));
  };

  const handleLimitChange = (n: number) => {
    setLimit(n);
    setPage(1);
    prefetchDoneRef.current = false;
    setPagesMap({});
  };

  if ((!itemsPage || itemsPage.length === 0) && isLoading) return <Loading />;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-3xl font-semibold">Categories</h2>

        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search categories..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              prefetchDoneRef.current = false;
            }}
            className="flex-1 sm:flex-none w-full sm:w-64 px-3 py-2 rounded bg-foreground/10 focus:outline-none"
          />

          <select
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="px-3 py-2 rounded bg-foreground/10"
            aria-label="Items per page"
          >
            <option
              className="text-background dark:bg-background dark:text-foreground"
              value={4}
            >
              4
            </option>
            <option
              className="text-background dark:bg-background dark:text-foreground"
              value={8}
            >
              8
            </option>
            <option
              className="text-background dark:bg-background dark:text-foreground"
              value={12}
            >
              12
            </option>
            <option
              className="text-background dark:bg-background dark:text-foreground"
              value={16}
            >
              16
            </option>
          </select>
        </div>
      </div>

      {error && (
        <div className="my-4 text-red-600 flex justify-center">{error}</div>
      )}
      {isPrefetching && (
        <div className="my-4 text-sm text-gray-600 flex justify-center">
          Preparing local results...
        </div>
      )}
      {debouncedQuery && !isLoading && displayed.length === 0 && (
        <div className="mb-4 text-gray-600">
          No categories match your search.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading && !filtersActive
          ? Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className="h-44 bg-foreground/8 rounded animate-pulse"
              />
            ))
          : displayed.map((c) => <CategoryCard key={c.id} c={c} />)}
      </div>

      <div className="flex items-center justify-end mt-6">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={!hasPrev || isLoading}
            className="px-3 py-1 rounded bg-foreground/10 disabled:opacity-50"
            aria-label="Previous"
          >
            <MdOutlineSkipPrevious />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const visiblePages = 7;
              const half = Math.floor(visiblePages / 2);
              const start = Math.max(
                1,
                Math.min(page - half, totalPages - (visiblePages - 1))
              );
              const pageNum = start + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`min-w-[36px] px-2 py-1 rounded ${
                    pageNum === page
                      ? "bg-foreground text-background"
                      : "bg-foreground/10"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 7 && page < totalPages - 1 && (
              <span className="px-2">...</span>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={!hasNext || isLoading}
            className="px-3 py-1 rounded bg-foreground/10 disabled:opacity-50"
            aria-label="Next"
          >
            <MdOutlineSkipNext />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
