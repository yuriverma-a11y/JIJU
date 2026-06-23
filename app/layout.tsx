import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JIJU — Atlys CLP Content Studio",
  description:
    "Keyword-rich, human, dash-free FAQs and CLP content grounded on live atlys.com facts, with JSON-LD FAQPage schema.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
