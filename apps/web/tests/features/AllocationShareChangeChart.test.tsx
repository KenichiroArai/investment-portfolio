import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AllocationShareChangeChart } from "@/features/trends/AllocationShareChangeChart";

describe("AllocationShareChangeChart", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders share change ranking", () => {
    render(
      <AllocationShareChangeChart
        changes={[
          {
            key: "equity",
            label: "国内株式",
            startRatio: 0.3,
            endRatio: 0.35,
            deltaRatio: 0.05,
          },
          {
            key: "bond",
            label: "債券",
            startRatio: 0.4,
            endRatio: 0.35,
            deltaRatio: -0.05,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "シェア変化ランキング" })).toBeInTheDocument();
    expect(screen.getByLabelText("シェア変化ランキング")).toBeInTheDocument();
    expect(screen.getByText("国内株式")).toBeInTheDocument();
    expect(screen.getByText("債券")).toBeInTheDocument();
  });
});
