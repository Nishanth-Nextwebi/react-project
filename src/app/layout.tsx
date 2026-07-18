import "@/index.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Insurance Tracking System",
  description: "A robust policy management and automatic renewal tracking system for small and medium agencies.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-neutral-50/50 text-neutral-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
