"use client";

import { useEffect, useState } from "react";
import { _receiptStore, receipt, type ReceiptInstance } from "@/lib/receipt";
import { ReceiptCard } from "./ReceiptCard";

/**
 * Global Receipt Card host. Mount once near the root (next to Toaster).
 * Subscribes to the receipt store and renders cards in a fixed stack
 * at the top-right (matching the existing Toaster position).
 */
export function ReceiptHost() {
  const [instances, setInstances] = useState<ReceiptInstance[]>([]);

  useEffect(() => _receiptStore.subscribe(setInstances), []);

  if (instances.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-md px-4 sm:px-0 pointer-events-none">
      {instances.map((inst) => (
        <div key={inst.id} className="pointer-events-auto">
          <ReceiptCard
            {...inst}
            onDismiss={() => receipt.dismiss(inst.id)}
          />
        </div>
      ))}
    </div>
  );
}
