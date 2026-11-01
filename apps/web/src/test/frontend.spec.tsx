import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RequestView } from "../api/types";
import { homePathFor } from "../auth/AuthProvider";
import { RequestForm } from "../components/RequestForm";
import { progressSteps } from "../components/WorkflowProgress";
import { en } from "../i18n/messages/en";
import { kk } from "../i18n/messages/kk";
import { ru } from "../i18n/messages/ru";
import { I18nProvider } from "../i18n/I18nProvider";
import { extractToken } from "../pages/VerifyPage";

const steps: RequestView["steps"] = [
  { role: "SPECIALIST", name: "ENROLLMENT_VERIFICATION" },
  { role: "ACCOUNTANT", name: "FINANCIAL_CHECK" },
  { role: "AUTHORIZED_SIGNER", name: "FINAL_APPROVAL" },
];

describe("translations", () => {
  it("define the same keys in every language with no empty values", () => {
    const keys = Object.keys(kk).sort();
    expect(Object.keys(ru).sort()).toEqual(keys);
    expect(Object.keys(en).sort()).toEqual(keys);
    for (const messages of [kk, ru, en]) {
      expect(Object.values(messages).every((value) => value.trim().length > 0)).toBe(true);
    }
  });
});

describe("progressSteps", () => {
  it("marks the current approval step", () => {
    expect(progressSteps({ status: "UNDER_REVIEW", currentStepIndex: 1, steps })).toEqual([
      "done",
      "done",
      "current",
      "todo",
      "todo",
      "todo",
    ]);
  });

  it("marks the rejected step", () => {
    expect(progressSteps({ status: "REJECTED", currentStepIndex: 0, steps })[1]).toBe("rejected");
  });

  it("marks everything done when issued", () => {
    expect(progressSteps({ status: "ISSUED", currentStepIndex: 3, steps }).every((state) => state === "done")).toBe(true);
  });
});

describe("extractToken", () => {
  it("accepts a token or a full verification URL", () => {
    const token = "1dc9e41a-5783-47f8-960a-09f7d3b210c7";
    expect(extractToken(token)).toBe(token);
    expect(extractToken(`https://certificate.aheu.kz/verify/${token}`)).toBe(token);
    expect(extractToken("hello")).toBeNull();
  });
});

describe("homePathFor", () => {
  it("sends each role to its dashboard", () => {
    expect(homePathFor(["STUDENT"])).toBe("/student");
    expect(homePathFor(["SPECIALIST"])).toBe("/staff");
    expect(homePathFor(["AUTHORIZED_SIGNER"])).toBe("/signer");
    expect(homePathFor(["SYSTEM_ADMIN", "SPECIALIST"])).toBe("/admin");
  });
});

describe("RequestForm", () => {
  it("validates required fields before submitting", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <I18nProvider>
        <RequestForm onSubmit={onSubmit} />
      </I18nProvider>,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: kk["request.submit"] }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(kk["request.errorType"])).toBeInTheDocument();
    expect(screen.getByLabelText(kk["request.type"])).toHaveFocus();

    await user.selectOptions(screen.getByLabelText(kk["request.type"]), "ENROLLMENT_CERTIFICATE");
    await user.selectOptions(screen.getByLabelText(kk["request.purpose"]), "BANK");
    await user.click(screen.getByRole("button", { name: kk["request.submit"] }));
    expect(onSubmit).toHaveBeenCalledWith({ certificateType: "ENROLLMENT_CERTIFICATE", purpose: "BANK", language: "KK" });
  });
});
