import { router } from "expo-router";
import { useEffect } from "react";

export default function NotFoundRecovery() {
  useEffect(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  }, []);

  return null;
}
