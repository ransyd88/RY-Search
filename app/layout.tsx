import type { Metadata } from "next";
import "./globals.css";

const title = "R&Y Capital | Sydney Private Investment Company";
const description =
  "R&Y Capital is a privately held investment company based in Sydney, focused on long-term investment across property, public markets, private credit and private enterprise.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://ry-capital.example"),
  alternates: { canonical: "/" },
  icons: {
    icon: "/brand/favicon.png",
    shortcut: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "en_AU",
    images: [{ url: "/og.png", width: 1792, height: 1024, alt: "R&Y Capital — Built for the Long Term" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
