import { Loader2 } from "lucide-react";

export default function PageLoader() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-zinc-400">
      <Loader2 className="animate-spin text-[#e50914] mb-3" size={48} />
      <p className="text-sm">Loading…</p>
    </div>
  );
}
