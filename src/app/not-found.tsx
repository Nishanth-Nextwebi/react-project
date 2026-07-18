import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 py-16 text-center">
      <div className="max-w-md w-full">
        <h1 className="text-9xl font-extrabold text-neutral-200 tracking-widest">404</h1>
        <div className="bg-blue-600 text-white px-2 text-sm rounded rotate-12 absolute transform -translate-y-20 translate-x-12 inline-block">
          Page Not Found
        </div>
        <h2 className="mt-8 text-2xl font-bold text-neutral-800">
          Looks like you're lost
        </h2>
        <p className="mt-4 text-neutral-500">
          The page you are looking for is not available or has been moved.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
