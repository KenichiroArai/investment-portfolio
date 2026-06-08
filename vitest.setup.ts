import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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
