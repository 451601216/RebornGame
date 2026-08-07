"use client";

import type { EventUi } from "@/lib/game/types";

type Props = {
  narrative: string;
  epilogue?: string;
  cause?: string;
  ui?: EventUi;
};

export function NarrativeView({ narrative, epilogue, cause }: Props) {
  return (
    <section className="narrative">
      <p className="narrative-body">{narrative}</p>
      {cause ? <p className="narrative-cause">终因：{cause}</p> : null}
      {epilogue ? <p className="narrative-epilogue">{epilogue}</p> : null}
    </section>
  );
}
