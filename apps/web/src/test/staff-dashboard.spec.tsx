import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RequestView } from "../api/types";
import { kk } from "../i18n/messages/kk";
import { I18nProvider } from "../i18n/I18nProvider";
import { StaffDashboardPage } from "../pages/staff/StaffDashboardPage";

function pendingRequest(id: string, fullName: string): RequestView {
  return {
    id,
    certificateType: "ENROLLMENT_CERTIFICATE",
    purpose: "BANK",
    purposeDetails: null,
    language: "KK",
    status: "PENDING",
    currentStepIndex: 0,
    steps: [
      { role: "SPECIALIST", name: "ENROLLMENT_VERIFICATION" },
      { role: "AUTHORIZED_SIGNER", name: "FINAL_APPROVAL" },
    ],
    approvals: [],
    document: null,
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    student: { userId: `u-${id}`, externalStudentId: "PL-100001", fullName },
  };
}

function mockQueue(responses: RequestView[][]) {
  let call = 0;
  const fetchMock = vi.fn(async () => {
    const body = responses[Math.min(call++, responses.length - 1)];
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPage() {
  render(
    <I18nProvider>
      <MemoryRouter>
        <StaffDashboardPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("StaffDashboardPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists the requests waiting for my step", async () => {
    mockQueue([[pendingRequest("r1", "Сейітова Айгерім")]]);
    renderPage();
    expect(await screen.findByText(/Сейітова Айгерім/)).toBeInTheDocument();
  });

  it("shows requests submitted after the page was opened when refreshed", async () => {
    mockQueue([[], [pendingRequest("r2", "Жақсыбеков Данияр")]]);
    renderPage();
    expect(await screen.findByText(kk["staff.empty"])).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: kk["common.refresh"] }));
    expect(await screen.findByText(/Жақсыбеков Данияр/)).toBeInTheDocument();
  });
});
