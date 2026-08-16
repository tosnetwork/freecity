"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearToken, getToken } from "../lib/api";

export function NavBar() {
  const [authed, setAuthed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setAuthed(getToken() !== null);
  }, [pathname]);

  if (!authed) return null;

  return (
    <nav className="site-nav" aria-label="Main">
      <Link href="/today" className="city-wordmark" aria-label="FreeCity home">
        <span>F</span> FREECITY <small>D0</small>
      </Link>
      <Link href="/today" aria-current={pathname === "/today" ? "page" : undefined}>
        Tonight
      </Link>
      <Link href="/district" aria-current={pathname === "/district" ? "page" : undefined}>
        District
      </Link>
      <Link href="/archive" aria-current={pathname === "/archive" ? "page" : undefined}>
        Archive
      </Link>
      <span className="spacer" />
      <button
        className="nav-signout"
        type="button"
        onClick={() => {
          clearToken();
          router.push("/login");
        }}
      >
        Sign out
      </button>
    </nav>
  );
}
