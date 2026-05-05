import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ProgressSection {
  id: string;
  label: string;
}

interface FormProgressStepperProps {
  sections: ProgressSection[];
}

export function FormProgressStepper({ sections }: FormProgressStepperProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const OFFSET = 160; // px from top of viewport to consider a section "active"

    const handleScroll = () => {
      // Walk backwards: the last section whose top edge is above the offset wins
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= OFFSET) {
          setActiveId(sections[i].id);
          return;
        }
      }
      setActiveId(sections[0]?.id ?? "");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const activeIdx = sections.findIndex((s) => s.id === activeId);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <nav
      aria-label="Form sections"
      className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 overflow-x-auto"
    >
      {sections.map((section, i) => {
        const isActive = section.id === activeId;
        const isDone = i < activeIdx;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollTo(section.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isActive && "bg-blue-600 text-white",
              isDone && !isActive && "text-blue-600 hover:bg-blue-50",
              !isActive && !isDone && "text-slate-500 hover:bg-slate-50"
            )}
          >
            <span
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold leading-none shrink-0",
                isActive && "bg-white/25 text-white",
                isDone && "bg-blue-100 text-blue-700",
                !isActive && !isDone && "bg-slate-200 text-slate-600"
              )}
            >
              {isDone ? "✓" : i + 1}
            </span>
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
