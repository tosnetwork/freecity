"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchWorld, isNotAResident, type CityWorldResponse, type CommandResponse } from "./api";

export function useCityWorld() {
  const router = useRouter();
  const [world, setWorld] = useState<CityWorldResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setWorld(await fetchWorld());
    } catch (error) {
      if (isNotAResident(error)) {
        router.replace("/enter");
        return;
      }
      setNotice("The committed city state could not be reached. Try again.");
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = useCallback(
    async (key: string, command: () => Promise<CommandResponse>) => {
      setBusy(key);
      setNotice(null);
      try {
        const response = await command();
        if (response.status === "applied") {
          setNotice("Committed. The city now remembers this action.");
          await refresh();
          return true;
        }
        setNotice(
          response.result?.message ??
            `The district declined this action (${response.result?.code ?? "REJECTED"}).`,
        );
        await refresh();
        return false;
      } catch {
        setNotice("The action did not reach the city. No duplicate change was made.");
        return false;
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  return { world, busy, notice, setNotice, refresh, act };
}
