import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import SingleProduct from "@/component/products/singleProduct";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  return {
    title: `Product: ${slug}`,
  };
}

async function getSingleProduct(token: string | undefined, slug: string) {
  const res = await fetch(`https://api.bitechx.com/products/${slug}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch product");
  }
  return res.json();
}
export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await Promise.resolve(params);
  const cookieStore = await cookies();
  const jwt = cookieStore.get("jwt")?.value;
  const product = await getSingleProduct(jwt, slug);

  return <SingleProduct product={product} slug={slug} />;
}
