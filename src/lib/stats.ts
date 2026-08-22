import { VENTURES } from "@/lib/ventures";

// Shared with the hero's dashboard panel so the two can't drift out of
// sync the way the hardcoded "6" here once did after The Reaper made it 7.
export const STATS = [
  { value: "14", label: "Appointed CFO", caption: "Of a multi-million dollar company" },
  { value: "$250K", label: "Directed to nonprofits", caption: "15 organizations, over 3 years" },
  {
    value: String(VENTURES.length),
    label: "Ventures & products",
    caption: "Founded, run, or built solo",
  },
] as const;
