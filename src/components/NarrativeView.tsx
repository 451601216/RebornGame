"use client";

import type { EventUi } from "@/lib/game/types";

type Props = {
  narrative: string;
  epilogue?: string;
  ui?: EventUi;
};

export function NarrativeView({ narrative, epilogue }: Props) {
  return (
    <section className="narrative">
      <p className="narrative-body">{narrative}</p>
      {epilogue ? <p className="narrative-epilogue">{epilogue}</p> : null}
    </section>
  );
}
