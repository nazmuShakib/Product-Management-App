"use client";

import { useState, useEffect, FC } from "react";
import { z } from "zod";
import { MdDelete } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { setCategories, Category } from "@/store/categorySlice";

const imageUrlRegex = /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i;

const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  images: z
    .array(z.string().url("Invalid URL"))
    .min(1, "At least one image is required"),
  price: z
    .number("Price must be a number")
    .positive("Price must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
});

type ProductForm = z.infer<typeof ProductSchema>;

const emptyProduct: ProductForm = {
  name: "",
  description: "",
  images: [""],
  price: 0,
  categoryId: "",
};

interface CreateProductProps {
  categories: Category[];
}

const getErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err ?? "Unknown error");

const CreateProduct: FC<CreateProductProps> = ({ categories }) => {
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [errors, setErrors] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);

  const categoriesLoading = useSelector(
    (state: RootState) => state.categories.loading
  );
  const categoriesError = useSelector(
    (state: RootState) => state.categories.error
  );

  useEffect(() => {
    dispatch(setCategories(categories));
  }, [dispatch, categories]);

  const setField = (key: keyof ProductForm, value: ProductForm[typeof key]) => {
    setForm((s) => ({ ...s, [key]: value } as ProductForm));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[key as string];
      return copy;
    });
    setSuccess(null);
    setServerError(null);
  };

  const setImage = (index: number, value: string) => {
    const images = [...form.images];
    images[index] = value;
    setField("images", images);
  };

  const addImage = () => setField("images", [...form.images, ""]);
  const removeImage = (index: number) => {
    const images = form.images.filter((_, i) => i !== index);
    setField("images", images.length ? images : [""]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSuccess(null);
    setServerError(null);

    const payload = {
      ...form,
      price: Number(form.price),
      categoryId: String(form.categoryId || ""),
    };

    const parsed = ProductSchema.safeParse(payload);
    if (!parsed.success) {
      const zodErrors: Record<string, string | string[]> = {};
      for (const issue of parsed.error.issues) {
        const pathKey = String(issue.path[0] ?? 0);
        if (!zodErrors[pathKey]) zodErrors[pathKey] = issue.message;
        else {
          const prev = zodErrors[pathKey];
          zodErrors[pathKey] = Array.isArray(prev)
            ? [...prev, issue.message]
            : [prev, issue.message];
        }
      }
      setErrors(zodErrors);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("https://api.bitechx.com/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Server responded ${res.status}`);
      }

      // consume response but we don't need to use it here
      await res.json();

      setSuccess("Product created successfully.");
      setForm(emptyProduct);
      setErrors({});
    } catch (err: unknown) {
      console.error(err);
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-2xl mx-auto p-6 my-4 sm:my-6 bg-foreground/20 rounded shadow"
    >
      <h2 className="text-2xl font-semibold mb-4">Create Product</h2>

      {serverError && <div className="mb-3 text-red-600">{serverError}</div>}
      {success && <div className="mb-3 text-green-300">{success}</div>}

      <label className="block mb-3">
        <span className="text-sm font-medium">Name</span>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          className="mt-1 block w-full px-3 py-2 border rounded outline-0 focus:ring-2 focus:ring-foreground transition duration-200"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <div className="text-sm text-red-600 mt-1">{String(errors.name)}</div>
        )}
      </label>

      <label className="block mb-3">
        <span className="text-sm font-medium">Description</span>
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          className="mt-1 block w-full px-3 py-2 border rounded outline-0 focus:ring-2 focus:ring-foreground transition duration-200"
          rows={4}
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <div className="text-sm text-red-600 mt-1">
            {String(errors.description)}
          </div>
        )}
      </label>

      <label className="block mb-3">
        <span className="text-sm font-medium">Category</span>
        <select
          value={form.categoryId ?? ""}
          onChange={(e) => setField("categoryId", e.target.value)}
          className="mt-1 block w-full px-3 py-2 border rounded outline-0 focus:ring-2 focus:ring-foreground transition duration-200"
          aria-invalid={!!errors.categoryId}
        >
          <option value="">-- Select category --</option>
          {categoriesLoading ? (
            <option disabled>Loading...</option>
          ) : categoriesError ? (
            <option disabled>Error loading categories</option>
          ) : (
            categories.map((c: Category) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          )}
        </select>
        {errors.categoryId && (
          <div className="text-sm text-red-600 mt-1">
            {String(errors.categoryId)}
          </div>
        )}
      </label>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Images (URLs)</span>
          <button
            type="button"
            onClick={addImage}
            className="text-sm px-2 py-1 bg-blue-600 text-white rounded"
          >
            + Add
          </button>
        </div>

        {form.images.map((img, idx) => {
          const imgErr = Array.isArray(errors.images)
            ? errors.images[idx]
            : undefined;
          return (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={img}
                onChange={(e) => setImage(idx, e.target.value)}
                className="flex-1 px-3 py-2 border rounded outline-0 focus:ring-2 focus:ring-foreground transition duration-200"
                placeholder="https://example.com/image.jpg"
                aria-invalid={!!imgErr}
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="px-2 py-1 bg-red-500 text-white rounded"
              >
                <MdDelete size={20} />
              </button>
              {img && imageUrlRegex.test(img) && (
                <img
                  src={img}
                  alt={`preview-${idx}`}
                  className="w-16 h-12 object-cover rounded ml-2"
                />
              )}
              {imgErr && (
                <div className="text-sm text-red-600 mt-1">
                  {String(imgErr)}
                </div>
              )}
            </div>
          );
        })}
        {typeof errors.images === "string" && (
          <div className="text-sm text-red-600">{errors.images}</div>
        )}
      </div>

      <label className="block mb-4">
        <span className="text-sm font-medium">Price</span>
        <input
          type="number"
          value={form.price}
          onChange={(e) => setField("price", Number(e.target.value) as number)}
          className="mt-1 block w-full px-3 py-2 border rounded outline-0 focus:ring-2 focus:ring-foreground transition duration-200"
          min={0}
          step="0.01"
          aria-invalid={!!errors.price}
        />
        {errors.price && (
          <div className="text-sm text-red-600 mt-1">
            {String(errors.price)}
          </div>
        )}
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create Product"}
        </button>

        <button
          type="button"
          onClick={() => {
            setForm(emptyProduct);
            setErrors({});
            setSuccess(null);
            setServerError(null);
          }}
          className="px-4 py-2 bg-gray-600 rounded"
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default CreateProduct;
