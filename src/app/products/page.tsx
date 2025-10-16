import { cookies } from "next/headers";
import ProductsClient from "@/component/products/products";

async function getProducts(token: string | undefined) {
  const res = await fetch("https://api.bitechx.com/products", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }
  return res.json();
}

export default async function Page() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get("jwt")?.value;
  const products = await getProducts(jwt);

  return <ProductsClient products={products} />;
}
