import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Link,
  Outlet,
  RouterProvider,
  createMemoryRouter,
  useNavigate,
} from "react-router-dom";

import {
  UnsavedChangesGuardProvider,
  usePublishUnsavedChangesGuard,
} from "@/components/App/UnsavedChangesGuardContext";

import type { ReactNode } from "react";

jest.mock("@/components/Modals/ConfirmModal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    title,
    children,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    title: string;
    children: ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <div>{children}</div>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm}>
          Discard
        </button>
      </div>
    ) : null,
}));

beforeAll(() => {
  if (typeof Request === "undefined") {
    class MockRequest {
      body: BodyInit | null;
      credentials: RequestCredentials;
      headers: Headers;
      method: string;
      mode: RequestMode;
      signal: AbortSignal | null;
      url: string;

      constructor(input: string | URL, init: RequestInit = {}) {
        this.url = String(input);
        this.method = (init.method ?? "GET").toUpperCase();
        this.headers = new Headers(init.headers);
        this.body = init.body ?? null;
        this.signal = init.signal ?? null;
        this.mode = init.mode ?? "same-origin";
        this.credentials = init.credentials ?? "same-origin";
      }
    }

    Object.defineProperty(globalThis, "Request", {
      configurable: true,
      writable: true,
      value: MockRequest,
    });
  }
});

function Layout() {
  return (
    <UnsavedChangesGuardProvider>
      <Outlet />
    </UnsavedChangesGuardProvider>
  );
}

function DirtyCardPage() {
  const navigate = useNavigate();

  usePublishUnsavedChangesGuard({
    enabled: true,
    isDirty: true,
    title: "Discard changes?",
    body: "You have unsaved changes.",
  });

  return (
    <div>
      <div>Card page</div>
      <Link to="/assets">Open assets link</Link>
      <button type="button" onClick={() => navigate("/assets")}>
        Open assets button
      </button>
    </div>
  );
}

function CleanCardPage() {
  usePublishUnsavedChangesGuard({
    enabled: true,
    isDirty: false,
    title: "Discard changes?",
    body: "You have unsaved changes.",
  });

  return (
    <div>
      <div>Clean card page</div>
      <Link to="/assets">Open assets link</Link>
    </div>
  );
}

function AssetsPage() {
  return <div>Assets page</div>;
}

describe("UnsavedChangesGuardProvider", () => {
  it("blocks link navigation until discard is confirmed", async () => {
    const router = createMemoryRouter(
      [
        {
          element: <Layout />,
          children: [
            { path: "/cards/1", element: <DirtyCardPage /> },
            { path: "/assets", element: <AssetsPage /> },
          ],
        },
      ],
      { initialEntries: ["/cards/1"] },
    );

    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("link", { name: "Open assets link" }));

    expect(screen.getByRole("dialog", { name: "Discard changes?" })).toBeInTheDocument();
    expect(screen.getByText("Card page")).toBeInTheDocument();
    expect(screen.queryByText("Assets page")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument();
    expect(screen.getByText("Card page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Open assets link" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => {
      expect(screen.getByText("Assets page")).toBeInTheDocument();
    });
  });

  it("blocks programmatic navigation until discard is confirmed", async () => {
    const router = createMemoryRouter(
      [
        {
          element: <Layout />,
          children: [
            { path: "/cards/1", element: <DirtyCardPage /> },
            { path: "/assets", element: <AssetsPage /> },
          ],
        },
      ],
      { initialEntries: ["/cards/1"] },
    );

    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("button", { name: "Open assets button" }));

    expect(screen.getByRole("dialog", { name: "Discard changes?" })).toBeInTheDocument();
    expect(screen.queryByText("Assets page")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => {
      expect(screen.getByText("Assets page")).toBeInTheDocument();
    });
  });

  it("does not block navigation when the route is not dirty", async () => {
    const router = createMemoryRouter(
      [
        {
          element: <Layout />,
          children: [
            { path: "/cards/1", element: <CleanCardPage /> },
            { path: "/assets", element: <AssetsPage /> },
          ],
        },
      ],
      { initialEntries: ["/cards/1"] },
    );

    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("link", { name: "Open assets link" }));

    await waitFor(() => {
      expect(screen.getByText("Assets page")).toBeInTheDocument();
    });
  });

  it("registers beforeunload protection while dirty", () => {
    const router = createMemoryRouter(
      [
        {
          element: <Layout />,
          children: [
            { path: "/cards/1", element: <DirtyCardPage /> },
            { path: "/assets", element: <AssetsPage /> },
          ],
        },
      ],
      { initialEntries: ["/cards/1"] },
    );

    render(<RouterProvider router={router} />);

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    const preventDefault = jest.spyOn(event, "preventDefault");
    Object.defineProperty(event, "returnValue", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    window.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe("");
  });
});
