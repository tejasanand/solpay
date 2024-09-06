"use client";
import { useRouter } from "next/navigation";

export default function Success() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-gradient-to-r from-blue-500 to-purple-500">
      <h1 className="text-3xl font-bold text-yellow-300">
        Payment Successful!
      </h1>
      <h2 className="text-white text-lg">
        Congratulations on owning TREIKTO TOKEN!
      </h2>
      <p className="text-white">We appreciate your payment.</p>

      <button
        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-3 px-5 rounded-lg shadow-lg"
        onClick={() => router.push("/")}
      >
        Return Home
      </button>
    </div>
  );
}
