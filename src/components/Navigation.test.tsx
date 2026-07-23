import { render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navigation } from "./Navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

describe("Navigation", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/videos/strength-session");
  });

  it("preserves all primary routes and marks nested sections active", () => {
    render(<Navigation />);

    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    const sectionList = within(navigation).getByRole("list", { name: "WorkoutDeck sections" });
    const links = within(sectionList).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/videos",
      "/timer",
      "/history",
    ]);
    expect(within(navigation).getByRole("link", { name: "Videos" }).getAttribute("aria-current")).toBe("page");
    expect(within(navigation).getByRole("link", { name: "Home" }).hasAttribute("aria-current")).toBe(false);
    expect(screen.getByRole("link", { name: "WorkoutDeck home" }).getAttribute("href")).toBe("/");
  });
});
