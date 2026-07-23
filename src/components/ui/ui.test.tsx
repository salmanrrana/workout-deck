import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, Chip, EmptyState, Input } from "./index";

describe("UI primitives", () => {
  it("disables a loading button and exposes its busy state", () => {
    render(<Button loading>Save video</Button>);

    const button = screen.getByRole("button", { name: "Save video" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("associates input labels and errors with the field", () => {
    render(<Input label="Video title" error="A title is required" />);

    const input = screen.getByRole("textbox", { name: "Video title" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("A title is required").id).toBe(input.getAttribute("aria-describedby"));
  });

  it("activates clickable chips as native buttons with pressed state", () => {
    const onClick = vi.fn();
    render(
      <Chip onClick={onClick} pressed>
        Mobility
      </Chip>,
    );

    const chip = screen.getByRole("button", { name: "Mobility" });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps removable chips free of nested clickable roots", () => {
    const onRemove = vi.fn();
    const { container } = render(<Chip onRemove={onRemove}>Strength</Chip>);

    expect(container.querySelectorAll("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove Strength" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("renders empty-state guidance and its action", () => {
    render(<EmptyState title="Your deck is empty" description="Add a workout video." action={<Button>Add video</Button>} />);

    expect(screen.getByRole("heading", { name: "Your deck is empty" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add video" })).toBeTruthy();
  });
});
