import { Loader2 } from "lucide-react";
import { useAuthLoading } from "@/hooks/useAuthLoading";

export function AuthLoadingOverlay() {
  const { isLoading, message } = useAuthLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border rounded-lg shadow-lg p-6 flex flex-col items-center gap-4 min-w-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{message || "Processing..."}</p>
          <p className="text-xs text-muted-foreground mt-1">Please wait</p>
        </div>
      </div>
    </div>
  );
}
