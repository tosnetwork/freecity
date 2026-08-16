import type { ReactNode } from "react";

export const metadata = {
  title: "FreeCity",
  description: "District Zero",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
