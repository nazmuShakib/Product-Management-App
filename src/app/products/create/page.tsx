import CreateProduct from "@/component/products/createProduct";
import { cookies } from "next/headers";

async function getCategories(token: string | undefined) {
  const res = await fetch("https://api.bitechx.com/categories", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }
  return res.json();
}
export default async function Page() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get("jwt")?.value;
  try {
    const categories = await getCategories(jwt);
    return <CreateProduct categories={categories} />;
  } catch (err) {
    return <div>Error loading categories</div>;
  }
}
