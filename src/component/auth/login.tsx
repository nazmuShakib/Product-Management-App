"use client";

import { FC, useState } from "react";
import { z, ZodError } from "zod";
import { setCookie } from "cookies-next";
import { useRouter } from "next/navigation";

// A schema for validating the email field with an email regex
const emailSchema = z.object({
  email: z
    .string()
    .min(1, { message: "This field has to be filled." })
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, {
      message: "Invalid email address",
    }),
});

const Login: FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (error) {
      const validation = emailSchema.safeParse({ email: newEmail });
      if (validation.success) {
        setError("");
      } else {
        setError(validation.error.issues[0].message);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      // Validate the email using Zod
      emailSchema.parse({ email });
      console.log("Valid email:", email);

      setCookie("userEmail", email, { maxAge: 60 * 60 * 24 * 7 });
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        console.log(err.issues[0].message);
        setError(err.issues[0].message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="p-4 md:p-6 lg:p-8 bg-foreground/10 rounded-lg shadow-md w-[90%] sm:w-[70%] md:w-[60%] lg:w-[50%] xl:w-[40%]">
        <h1 className="text-3xl font-bold mb-4">Welcome!</h1>
        <form className="mt-4" onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" htmlFor="email">
              Email
            </label>
            <input
              className={`w-full px-3 py-2 border rounded outline-none transition duration-300 ease-linear ${
                error
                  ? "border-error focus:ring-2 focus:ring-error focus:border-error"
                  : "border-gray-300 focus:ring-2 focus:ring-foreground focus:border-foreground"
              }`}
              type="text"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
            />
            {error && (
              <p className="text-error-message text-sm mt-1">{error}</p>
            )}
          </div>
          <button
            className="w-full bg-foreground text-background py-2 rounded hover:bg-foreground/85 transition transform duration-300 hover:cursor-pointer text-lg"
            type="submit"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
