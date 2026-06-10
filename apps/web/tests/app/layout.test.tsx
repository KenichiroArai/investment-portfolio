import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "@/app/layout";

describe("RootLayout", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("renders children with Japanese document language", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <span>child</span>
      </RootLayout>,
    );
    expect(html).toContain('lang="ja"');
    expect(html).toContain("<span>child</span>");
  });

  it("exports metadata", () => {
    expect(metadata.title).toBe("investment-portfolio");
    expect(metadata.description).toBe("投資ポートフォリオの管理・分析ツール");
  });
});
