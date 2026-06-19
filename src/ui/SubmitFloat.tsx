import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { submitToAgent, pollStatus } from "./api.ts";

export function SubmitFloat({ file }: { file: string }) {
  const [submitted, setSubmitted] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const { data: status } = useQuery({
    queryKey: ["status", file],
    queryFn: () => pollStatus(file),
    refetchInterval: 2000,
  });
  const agentWaiting = (status?.waiters ?? 0) > 0;
  const dirty = status?.dirty ?? false;

  const handleSubmit = useCallback(async () => {
    try {
      await submitToAgent(file);
      setSubmitted(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setSubmitted(false), 1900);
    } catch {
      toast.error("Submit failed");
    }
  }, [file]);

  let label: string;
  let dotClass: string;
  let btnLabel: string;
  if (submitted) {
    label = "Saved locally";
    dotClass = "bg-done";
    btnLabel = "Submitted";
  } else if (agentWaiting) {
    label = dirty ? "Unsaved changes · agent is waiting" : "Agent is waiting";
    dotClass = "bg-accent [animation:lotra-pulse_1.5s_ease-in-out_infinite]";
    btnLabel = "Handoff to agent";
  } else {
    label = dirty ? "Unsaved changes" : "Saved locally";
    dotClass = "bg-accent";
    btnLabel = "Save comments";
  }

  return (
    <div className="fixed bottom-[26px] right-[30px] z-[60] flex flex-col items-end gap-[9px]">
      <div className="flex items-center gap-2 rounded-[20px] border border-line bg-paper py-[5px] pl-[11px] pr-3 text-xs text-muted shadow-[0_4px_14px_-6px_rgba(60,50,40,0.22)]">
        <span className={`size-[7px] rounded-full ${dotClass}`} />
        <span>{label}</span>
      </div>
      <button
        onClick={handleSubmit}
        className={`inline-flex items-center gap-2 rounded-[13px] border px-[18px] py-[11px] text-sm font-semibold text-on-accent shadow-[0_6px_18px_-6px_rgba(217,119,87,0.5)] transition hover:-translate-y-px ${submitted ? "border-done bg-done" : "border-accent bg-accent"}`}
      >
        <span>{btnLabel}</span>
        <ArrowRight size={15} />
      </button>
    </div>
  );
}
