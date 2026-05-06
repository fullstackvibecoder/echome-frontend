"use client";

/**
 * Receipt — imperative API for showing structured Receipt Cards.
 * Mirrors sonner's ergonomics so call sites can swap one-line toasts
 * for Receipt Cards without restructuring. The host (`ReceiptHost`)
 * subscribes to this store and renders the cards.
 */

import type { ReceiptCardProps } from "@/components/shared/ReceiptCard";

export interface ReceiptInstance extends Omit<ReceiptCardProps, "onDismiss"> {
  id: string;
}

type Listener = (instances: ReceiptInstance[]) => void;

let instances: ReceiptInstance[] = [];
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener(instances);
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `receipt-${Date.now()}-${counter}`;
}

export const receipt = {
  show(props: Omit<ReceiptCardProps, "onDismiss">): string {
    const id = nextId();
    instances = [...instances, { ...props, id }];
    notify();
    return id;
  },
  dismiss(id: string): void {
    instances = instances.filter((i) => i.id !== id);
    notify();
  },
  dismissAll(): void {
    instances = [];
    notify();
  },
};

export const _receiptStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(instances);
    return () => {
      listeners.delete(listener);
    };
  },
};
