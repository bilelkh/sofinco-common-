import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JavaRecord } from "#lib/javaBridge";

vi.mock("@jahia/javascript-modules-library", () => ({
	server: { osgi: { getService: vi.fn() } },
}));

import { server } from "@jahia/javascript-modules-library";
import {
	getRepresentativeExampleBridge,
	toExampleData,
	REPRESENTATIVE_EXAMPLE_BRIDGE,
} from "./representativeExampleBridge";

const mockGetService = vi.mocked(server.osgi.getService);

describe("getRepresentativeExampleBridge", () => {
	beforeEach(() => mockGetService.mockReset());

	it("retourne null quand le service OSGi n'est pas enregistré", () => {
		mockGetService.mockReturnValue(null);
		expect(getRepresentativeExampleBridge()).toBeNull();
		expect(mockGetService).toHaveBeenCalledWith(REPRESENTATIVE_EXAMPLE_BRIDGE);
	});

	it("retourne null si le service existe mais n'a pas la méthode getExample", () => {
		mockGetService.mockReturnValue({ foo: "bar" } as unknown as object);
		expect(getRepresentativeExampleBridge()).toBeNull();
	});

	it("retourne le bridge quand getExample est présent", () => {
		const fakeBridge = { getExample: vi.fn() };
		mockGetService.mockReturnValue(fakeBridge as unknown as object);
		expect(getRepresentativeExampleBridge()).toBe(fakeBridge);
	});
});

describe("toExampleData", () => {
	it("retourne null pour un record null", () => {
		expect(toExampleData(null)).toBeNull();
	});

	it("convertit un record Java complet en ExampleData typé", () => {
		const record: JavaRecord = {
			variant: "pretPerso",
			exampleAmount: "3 000 €",
			insuranceTextOverride: "",
			rows: [
				{ labelKey: "row.monthlyPayment", value: "100", highlighted: false, labelParam: "" },
				{ labelKey: "row.duration", value: "36", highlighted: true, labelParam: "" },
			] as unknown as JavaRecord[],
			insurance: {
				monthlyAmount: "5",
				taea: "0,5%",
				totalInsuranceCost: "180",
			} as unknown as JavaRecord,
		};

		const data = toExampleData(record);
		expect(data).not.toBeNull();
		expect(data!.variant).toBe("pretPerso");
		expect(data!.exampleAmount).toBe("3 000 €");
		expect(data!.rows).toHaveLength(2);
		expect(data!.rows[1].highlighted).toBe(true);
		expect(data!.insurance?.taea).toBe("0,5%");
		expect(data!.insuranceTextOverride).toBeUndefined();
	});

	it("variant fallback sur creditRenouvelable si inconnu", () => {
		const record: JavaRecord = {
			variant: "BOGUS",
			exampleAmount: "0",
			rows: [] as unknown as JavaRecord[],
		};
		expect(toExampleData(record)!.variant).toBe("creditRenouvelable");
	});
});
