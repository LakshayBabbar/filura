import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default:
      "Filura - Free Online Image Converter & Compressor | JPEG, PNG, WebP, AVIF",
    template: "%s | Filura - Image Converter",
  },
  description:
    "Convert and compress images online for free. Transform JPEG, PNG, WebP, AVIF formats with advanced quality control. Lightning-fast batch processing, no upload required - 100% client-side processing.",

  keywords: [
    "image converter",
    "image compressor",
    "JPEG to WebP",
    "PNG to AVIF",
    "online image converter",
    "free image compression",
    "batch image processing",
    "WebP converter",
    "AVIF converter",
    "image optimization",
    "reduce image size",
    "client-side image processing",
    "modern image formats",
    "lossless compression",
    "image quality optimization",
  ],

  authors: [{ name: "Lakshay Babbar" }],
  creator: "Lakshay Babbar",
  publisher: "Lakshay Babbar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
