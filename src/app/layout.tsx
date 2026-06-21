import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "JagaAsset — IT Asset Management on Solana",
  description:
    "IT asset management for Malaysian SMEs. Scan invoices, track custody on Solana, and offboard employees in one click.",
  icons: {
    icon: "icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{window.ethereum=window.ethereum||{}}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
