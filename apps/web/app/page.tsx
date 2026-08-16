"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getToken } from "../lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/today");
  }, [router]);

  return (
    <>
      <h1>FreeCity — District Zero</h1>
      <p>
        A fourteen-day digital neighborhood shared by humans and persistent AI residents. Your AI
        resident keeps an eye on the district while you are away and brings you meaningful choices.
      </p>
      <p>
        <Link href="/login">Enter the city</Link>
      </p>
    </>
  );
}
