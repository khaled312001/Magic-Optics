"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { startStockCount } from "@/server/stockCount";

export function StartStockCountButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { show } = useToast();

  return (
    <Button
      loading={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await startStockCount();
          if (result.ok) router.push(`/stock-count/${result.data.id}`);
          else show(result.error, "error");
        })
      }
    >
      <ClipboardPlus className="size-4" />
      بدء جرد جديد
    </Button>
  );
}
