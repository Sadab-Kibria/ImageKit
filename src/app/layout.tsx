import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer } from "../components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ImageKit — Free Online Image Utilities & AI Enhancer",
  description:
    "Enhance, convert, crop, and resize images directly in your browser. 100% private with Real-ESRGAN AI super-resolution and instant zero-upload processing.",
  keywords: [
    "AI image enhancer",
    "Real-ESRGAN browser",
    "image converter",
    "crop image online",
    "resize image",
    "super-resolution",
    "upscale image",
    "private image editor",
    "photo enhancer",
    "client-side AI",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50/70 text-gray-900 selection:bg-blue-600 selection:text-white">
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
