import type { ReactNode } from "react";

import { NavBar } from "../components/NavBar";
import "./globals.css";

export const metadata = {
  title: "FreeCity",
  description: "District Zero",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <NavBar />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
