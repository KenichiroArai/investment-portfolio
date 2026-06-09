import type { ReactNode } from "react";

type FormSectionProps = {
  title: string;
  children: ReactNode;
};

export function FormSection({ title, children }: FormSectionProps) {
  let result = (
    <section className="manage-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
  return result;
}
