import type { Metadata } from "next";
import { Bungee, Inter } from "next/font/google";
import "./globals.css";

const bungee = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bungee-var",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter-var",
});

export const metadata: Metadata = {
  title: "InnoQuiz",
  description: "Live multiplayer quiz — Game Show style",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bungee.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-bungee">{children}</body>
    </html>
  );
}
