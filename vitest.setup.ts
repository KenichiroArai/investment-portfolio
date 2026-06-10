import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

vi.mock("next/navigation", () => {
  let result = {
    useRouter: () => ({
      replace: vi.fn(),
      push: vi.fn(),
    }),
    usePathname: () => "/portfolios/ideco/holdings/",
    useSearchParams: () => new URLSearchParams(),
  };
  return result;
});
