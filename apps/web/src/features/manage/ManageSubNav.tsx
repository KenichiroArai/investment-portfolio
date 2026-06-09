"use client";

type ManageSubNavProps = {
  sections: Array<{ id: string; label: string }>;
  activeId: string;
  onSelect: (id: string) => void;
};

export function ManageSubNav({
  sections,
  activeId,
  onSelect,
}: ManageSubNavProps) {
  let result = (
    <nav className="manage-subnav" aria-label="管理メニュー">
      <ul>
        {sections.map((section) => {
          let item = (
            <li key={section.id}>
              <button
                type="button"
                className={activeId === section.id ? "is-active" : undefined}
                aria-current={activeId === section.id ? "page" : undefined}
                onClick={() => {
                  onSelect(section.id);
                }}
              >
                {section.label}
              </button>
            </li>
          );
          return item;
        })}
      </ul>
    </nav>
  );
  return result;
}
