import { render, screen } from "@testing-library/react";

import QueryClientProviderClient from "@/components/QueryClientProviderClient";

describe("QueryClientProviderClient", () => {
  it("provides a query client while rendering children", () => {
    render(
      <QueryClientProviderClient>
        <div>Child content</div>
      </QueryClientProviderClient>,
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});
