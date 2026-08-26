"use client";

import { ErrorScreen } from "@/frontend/system/ErrorScreen";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen {...props} />;
}
