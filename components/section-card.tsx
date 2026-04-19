import { ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-panel p-4 sm:p-6 lg:p-7">
      <div className="mb-4 flex flex-col gap-1 sm:mb-5">
        <h2 className="font-serif text-lg text-ink sm:text-[1.4rem]">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-ink/70 sm:text-sm">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
