import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, Card, Chip, EmptyState, Input } from "./index";

afterEach(cleanup);

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
    expect(screen.getByText("A title is required").id).toBe(
      input.getAttribute("aria-describedby"),
    );
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
    render(
      <EmptyState
        title="Your deck is empty"
        description="Add a workout video."
        action={<Button>Add video</Button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Your deck is empty" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add video" })).toBeTruthy();
  });

  it("makes interactive cards keyboard-activatable by default", () => {
    const onClick = vi.fn();
    render(
      <Card interactive onClick={onClick}>
        Start a workout
      </Card>,
    );

    const card = screen.getByRole("button", { name: "Start a workout" });
    expect(card.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledOnce();
    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("keeps static cards free of button semantics", () => {
    render(<Card>Glance tile</Card>);

    expect(screen.queryByRole("button", { name: "Glance tile" })).toBeNull();
  });

  it("forwards native anchor props when Card renders as a link", () => {
    render(
      <Card as="a" href="/videos" interactive>
        Videos
      </Card>,
    );

    const link = screen.getByRole("link", { name: "Videos" });
    expect(link.getAttribute("href")).toBe("/videos");
    expect(link.getAttribute("role")).toBeNull();
    expect(link.getAttribute("tabindex")).toBeNull();
  });

  it("defaults button cards to a non-submitting type", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Card as="button" interactive>
          Choose plan
        </Card>
      </form>,
    );

    const card = screen.getByRole("button", { name: "Choose plan" });
    expect(card.getAttribute("type")).toBe("button");
    fireEvent.click(card);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("restricts Card hosts to semantic combinations", () => {
    const Wrapper = (props: React.ComponentPropsWithoutRef<"div">) => (
      <div {...props} />
    );

    const customHost = (
      // @ts-expect-error Custom hosts cannot guarantee the rendered element's semantics.
      <Card as={Wrapper} interactive onClick={() => undefined}>
        Custom
      </Card>
    );
    const staticLink = (
      // @ts-expect-error Native activating hosts must opt into interactive styling.
      <Card as="a" href="/videos">
        Videos
      </Card>
    );
    const hrefLessLink = (
      // @ts-expect-error An anchor without href has no native keyboard semantics.
      <Card as="a" interactive>
        Videos
      </Card>
    );
    const staticButton = (
      // @ts-expect-error Native activating hosts must opt into interactive styling.
      <Card as="button" type="button">
        Start
      </Card>
    );
    const inputHost = (
      // @ts-expect-error Form controls are not supported Card hosts.
      <Card as="input" interactive onClick={() => undefined} />
    );
    const selectHost = (
      // @ts-expect-error Form controls are not supported Card hosts.
      <Card as="select" interactive onClick={() => undefined} />
    );
    const textareaHost = (
      // @ts-expect-error Form controls are not supported Card hosts.
      <Card as="textarea" interactive onClick={() => undefined} />
    );
    const summaryHost = (
      // @ts-expect-error Summary has native disclosure activation semantics.
      <Card as="summary" interactive onClick={() => undefined}>
        Details
      </Card>
    );

    expect([
      customHost,
      staticLink,
      hrefLessLink,
      staticButton,
      inputHost,
      selectHost,
      textareaHost,
      summaryHost,
    ]).toHaveLength(8);
  });
});
