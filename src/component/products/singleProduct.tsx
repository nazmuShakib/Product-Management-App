"use client";

import { FC, useEffect, useState } from "react";
import { GrFormPrevious, GrFormNext } from "react-icons/gr";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  setSingleProduct,
  type Product,
  setPage,
  setTotalCount,
  setProducts,
} from "@/store/productSlice";
import { RootState } from "@/store/store";

interface SingleProductProps {
  product: Product;
  slug: string;
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

const SingleProduct: FC<SingleProductProps> = ({ product, slug }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);

  const pages = useSelector((state: RootState) => state.products.pages);
  const totalCount = useSelector(
    (state: RootState) => state.products.totalCount
  );
  const itemsList = useSelector((state: RootState) => state.products.items);

  const cachedProduct = useSelector(
    (state: any) => state.products?.singleProducts?.[slug]
  );
  const singleproduct = cachedProduct || product;

  // local copy so UI updates after edit
  const [localProduct, setLocalProduct] = useState<Product>(singleproduct);

  useEffect(() => {
    setLocalProduct(singleproduct);
    if (singleproduct) {
      dispatch(setSingleProduct(singleproduct));
    }
  }, [singleproduct]);

  const allImages = localProduct.images || [];
  const images = allImages.filter(isValidImageUrl);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState(localProduct.name ?? "");
  const [editDescription, setEditDescription] = useState(
    localProduct.description ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setEditName(localProduct.name ?? "");
    setEditDescription(localProduct.description ?? "");
  }, [localProduct]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      images.length ? (prevIndex === 0 ? images.length - 1 : prevIndex - 1) : 0
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      images.length ? (prevIndex === images.length - 1 ? 0 : prevIndex + 1) : 0
    );
  };

  const openModal = () => {
    setFormError(null);
    setSuccessMessage(null);
    setEditName(localProduct.name ?? "");
    setEditDescription(localProduct.description ?? "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsSubmitting(false);
    setFormError(null);
  };

  const onSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const name = String(editName ?? "").trim();
    const description = String(editDescription ?? "").trim();

    if (!name) {
      setFormError("Name is required");
      return;
    }
    if (!description) {
      setFormError("Description is required");
      return;
    }
    if (!localProduct.id) {
      setFormError("Missing product id");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `https://api.bitechx.com/products/${encodeURIComponent(
          String(localProduct.id)
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name, description }),
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Server responded ${res.status}`);
      }

      const updated = await res.json();
      const merged: Product = {
        ...localProduct,
        ...(updated ?? {}),
        name,
        description,
      };
      setLocalProduct(merged);
      dispatch(setSingleProduct(merged));
      setSuccessMessage("Product updated");
      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message ?? "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // open delete confirmation modal
  const onDeleteClick = () => {
    setFormError(null);
    setIsDeleteModalOpen(true);
  };

  // perform delete after confirmation and update redux cache
  const confirmDelete = async () => {
    setFormError(null);
    if (!localProduct.id) {
      setFormError("Missing product id");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(
        `https://api.bitechx.com/products/${encodeURIComponent(
          String(localProduct.id)
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

      try {
        const removeKey = String(localProduct.id ?? localProduct.slug ?? "");

        // update pages
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

        if (Array.isArray(itemsList) && itemsList.length > 0) {
          const newItems = itemsList.filter(
            (p) => String(p.id ?? p.slug) !== removeKey
          );
          if (newItems.length !== itemsList.length) {
            dispatch(setProducts(newItems));
          }
        }

        if (typeof totalCount === "number") {
          const newTotal = Math.max(0, totalCount - 1);
          dispatch(setTotalCount(newTotal));
        }

        dispatch(setSingleProduct({} as Product));
      } catch (cacheErr) {
        console.error("Failed to update redux cache after delete:", cacheErr);
      }

      router.push("/products");
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message ?? "Failed to delete product");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setFormError(null);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={openModal}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          aria-label="Edit product"
          disabled={isSubmitting || isDeleting}
        >
          Edit
        </button>

        <button
          onClick={onDeleteClick}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
          aria-label="Delete product"
          disabled={isDeleting || isSubmitting}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
      <div className="flex items-center justify-center my-4">
        <h1 className="text-4xl font-bold">{localProduct.name}</h1>
      </div>

      <div className="relative mb-6">
        {images && images.length > 0 ? (
          <img
            src={images[currentIndex]}
            alt={`${localProduct.name} image ${currentIndex + 1}`}
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
              aria-label="Previous image"
            >
              <GrFormPrevious />
            </button>
            <button
              onClick={handleNext}
              className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition"
              aria-label="Next image"
            >
              <GrFormNext />
            </button>
          </>
        )}
      </div>

      <div className="flex mb-4 flex-row items-center justify-between sm:justify-around gap-4">
        <div className="flex flex-col text-lg">
          <span className="text-sm">Price</span>
          <span className="font-semibold">${localProduct.price}</span>
        </div>
        <div className="flex flex-col text-lg">
          <span className="text-sm">Category</span>
          <span className="font-semibold">
            {(localProduct.category as { name?: string } | undefined)?.name}
          </span>
        </div>
      </div>

      <p className="text-base mb-6">{localProduct.description}</p>

      {/* Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => onSave(e)}
            className="w-full max-w-lg bg-background rounded shadow-xl p-6 border-1"
          >
            <h2 className="text-lg font-semibold mb-4">Edit Product</h2>

            {formError && <div className="mb-2 text-red-600">{formError}</div>}
            {successMessage && (
              <div className="mb-2 text-green-600">{successMessage}</div>
            )}

            <label className="block mb-3">
              <span className="text-sm font-medium">Name</span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border rounded outline-0 focus:ring-2 focus:ring-foreground transition duration-200"
                aria-invalid={!editName.trim()}
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm font-medium">Description</span>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border rounded outline-0 focus:ring-2 focus:ring-foreground transition duration-200"
                rows={4}
                aria-invalid={!editDescription.trim()}
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 bg-gray-500 rounded"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-background/70 rounded shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-3">Confirm Delete</h3>
            <p className="text-sm mb-4">
              Are you sure you want to delete "
              <span className="font-medium">{localProduct.name}</span>"? This
              action cannot be undone.
            </p>

            {formError && <div className="mb-2 text-red-600">{formError}</div>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-500 rounded"
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
    </div>
  );
};
export default SingleProduct;
