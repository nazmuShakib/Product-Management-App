"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.push("/products");
    }, 200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Redirecting to Products...</h1>
        <p className="text-lg text-gray-600">Please wait a moment.</p>
      </div>
    </div>
  );
}
