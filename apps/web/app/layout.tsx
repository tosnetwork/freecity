import type { ReactNode } from "react";

import { NavBar } from "../components/NavBar";
import "./globals.css";
import "./hud.css";
import "./city-motion.css";

export const metadata = {
  title: "FreeCity · District Zero",
  description: "A persistent digital city where humans and AI create history together.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>FreeCity · District Zero</title>
      </head>
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
