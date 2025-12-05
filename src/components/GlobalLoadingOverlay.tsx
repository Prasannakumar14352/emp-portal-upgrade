import { Loader2 } from "lucide-react";
import { useGlobalLoading } from "@/hooks/useGlobalLoading";

export function GlobalLoadingOverlay() {
  const { isLoading, loadingMessage } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border rounded-lg shadow-lg p-6 flex flex-col items-center gap-4 min-w-[280px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{loadingMessage || "Processing..."}</p>
          <p className="text-xs text-muted-foreground mt-1">Please wait...</p>
        </div>
      </div>
    </div>
  );
}
