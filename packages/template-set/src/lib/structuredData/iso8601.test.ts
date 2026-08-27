import { describe, it, expect } from "vitest";
import { secondsToIsoDuration } from "./iso8601";

describe("secondsToIsoDuration", () => {
	it("omet les composantes nulles", () => {
		expect(secondsToIsoDuration(45)).toBe("PT45S");
		expect(secondsToIsoDuration(180)).toBe("PT3M");
		expect(secondsToIsoDuration(3600)).toBe("PT1H");
	});

	it("compose heures, minutes et secondes", () => {
		expect(secondsToIsoDuration(90)).toBe("PT1M30S");
		expect(secondsToIsoDuration(3690)).toBe("PT1H1M30S");
		expect(secondsToIsoDuration(114)).toBe("PT1M54S");
	});

	it("tronque les secondes fractionnaires", () => {
		expect(secondsToIsoDuration(90.9)).toBe("PT1M30S");
	});

	it("retourne une chaîne vide pour toute valeur inexploitable", () => {
		expect(secondsToIsoDuration(0)).toBe("");
		expect(secondsToIsoDuration(-10)).toBe("");
		expect(secondsToIsoDuration(Number.NaN)).toBe("");
		expect(secondsToIsoDuration(Number.POSITIVE_INFINITY)).toBe("");
	});
});
