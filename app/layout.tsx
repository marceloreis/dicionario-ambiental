import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dicionário de Legislação Ambiental Brasileira",
    template: "%s · Dicionário Ambiental",
  },
  description:
    "Definições, classificações e conceitos da legislação ambiental brasileira, vinculados às respectivas normas e fontes oficiais.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
