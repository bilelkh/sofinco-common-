import { describe, it, expect, vi } from "vitest";

vi.mock("@jahia/javascript-modules-library", () => ({
	server: { osgi: { getService: vi.fn() } },
}));

import { server } from "@jahia/javascript-modules-library";
import {
	REVIEW_SERVICE_BRIDGE,
	getReviewServiceBridge,
	readString,
	readNumber,
	readBoolean,
	toArray,
} from "./javaBridge";

describe("readString", () => {
	it("coerces to string, defaulting to '' for null/undefined", () => {
		expect(readString({ a: "x" }, "a")).toBe("x");
		expect(readString({ a: 42 }, "a")).toBe("42");
		expect(readString({}, "a")).toBe("");
		expect(readString({ a: null }, "a")).toBe("");
	});
});

describe("readNumber", () => {
	it("coerces to a finite number, defaulting to 0", () => {
		expect(readNumber({ n: 5 }, "n")).toBe(5);
		expect(readNumber({ n: "7" }, "n")).toBe(7);
		expect(readNumber({}, "n")).toBe(0);
		expect(readNumber({ n: "nope" }, "n")).toBe(0);
	});
});

describe("readBoolean", () => {
	it("handles real booleans and 'true'/'false' strings", () => {
		expect(readBoolean({ b: true }, "b")).toBe(true);
		expect(readBoolean({ b: "true" }, "b")).toBe(true);
		expect(readBoolean({ b: "TRUE" }, "b")).toBe(true);
		expect(readBoolean({ b: "false" }, "b")).toBe(false);
		expect(readBoolean({}, "b")).toBe(false);
		expect(readBoolean({ b: 1 }, "b")).toBe(false);
	});
});

describe("toArray", () => {
	it("returns [] for null/undefined/falsy input", () => {
		expect(toArray(null)).toEqual([]);
		expect(toArray(undefined)).toEqual([]);
		expect(toArray(0)).toEqual([]);
	});

	it("returns a real JS array as-is", () => {
		const arr = ["a", "b"];
		expect(toArray<string>(arr)).toBe(arr);
	});

	it("materialises an array-like polyglot proxy (numeric length + indexed access)", () => {
		const javaList = { length: 3, 0: "x", 1: "y", 2: "z" };
		expect(toArray<string>(javaList)).toEqual(["x", "y", "z"]);
	});

	it("handles an empty array-like (length 0)", () => {
		expect(toArray({ length: 0 })).toEqual([]);
	});

	it("falls back to Array.from for an iterable without a numeric length", () => {
		expect(toArray<number>(new Set([1, 2, 3]))).toEqual([1, 2, 3]);
	});

	it("returns [] when the value is neither array-like nor safely iterable", () => {
		// @@iterator present but not callable → Array.from throws → caught → []
		const broken = { [Symbol.iterator]: 42 } as unknown;
		expect(toArray(broken)).toEqual([]);
	});
});

describe("getReviewServiceBridge", () => {
	it("returns the OSGi service when registered", () => {
		const svc = { fetchReviews: vi.fn(), getAverageRate: vi.fn() };
		vi.mocked(server.osgi.getService).mockReturnValue(svc);
		expect(getReviewServiceBridge()).toBe(svc);
		expect(server.osgi.getService).toHaveBeenCalledWith(REVIEW_SERVICE_BRIDGE);
	});

	it("returns null when the service is absent", () => {
		vi.mocked(server.osgi.getService).mockReturnValue(null);
		expect(getReviewServiceBridge()).toBeNull();
	});
});
