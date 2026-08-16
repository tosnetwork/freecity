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
        {/* tabIndex makes the skip-link target programmatically focusable. */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
