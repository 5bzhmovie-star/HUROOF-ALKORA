import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "حروف الكورة",
  description: "لعبة الحروف والأسئلة الكروية الجماعية.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" style={{ colorScheme: "dark" }}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
