import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { fieldStyles } from "@shared/ui/Field";

import Textarea from "./Textarea";

const meta = {
	title: "Shared/UI/Textarea",
	component: Textarea,
	args: {
		label: "Your message",
		placeholder: "placeholder",
	},
	argTypes: {
		label: { control: "text" },
		hint: { control: "text" },
		errorMessage: { control: "text" },
		placeholder: { control: "text" },
		rows: { control: { type: "number", min: 2, max: 12 } },
		resize: { control: "inline-radio", options: ["vertical", "none"] },
		showCounter: { control: "boolean" },
		maxLength: { control: "number" },
		invalid: { control: "boolean" },
		hideLabel: { control: "boolean" },
		disabled: { control: "boolean" },
		readOnly: { control: "boolean" },
		required: { control: "boolean" },
	},
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Matrix columns. `hovered` and `focused` cannot be triggered in a static
 * sheet: we reuse the shared `Field` modifiers, which share their rule with
 * `:hover` / `:focus-within` — so the matrix shows the real rendering rather
 * than a lookalike, and cannot drift from the live states.
 */
const COLUMNS = [
	{ key: "enabled", fieldClassName: undefined },
	{ key: "hovered", fieldClassName: fieldStyles["field__box--hovered"] },
	{ key: "focused", fieldClassName: fieldStyles["field__box--focused"] },
	{ key: "disabled", fieldClassName: undefined },
] as const;

type Row = {
	key: string;
	placeholder?: string;
	defaultValue?: string;
	invalid?: boolean;
};

const ROWS: Row[] = [
	{ key: "placeholder", placeholder: "placeholder" },
	{ key: "value", defaultValue: "value" },
	{ key: "error", defaultValue: "value", invalid: true },
];

/**
 * State matrix, mirroring the Figma frame: the four interaction states as
 * columns, the three content states as rows. The `disabled` column holds a
 * single cell — a disabled field is neither hovered nor focused, and its error
 * state is not specified.
 */
export const Matrix: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ padding: 24, background: "var(--color-white)" }}>
			<h3
				style={{
					margin: "0 0 16px",
					font: "var(--font-weight-semibold) var(--text-xl)/var(--leading-normal) var(--font-sans)",
					color: "var(--color-primary-base)",
				}}
			>
				Textarea
			</h3>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(170px, 1fr))`,
					gap: 16,
					padding: 24,
					background: "var(--color-primary-subtle)",
					borderRadius: "var(--radius-lg)",
				}}
			>
				{COLUMNS.map((column) => (
					<span
						key={column.key}
						style={{
							font: "var(--font-weight-medium) var(--text-sm)/var(--text-sm--line-height) var(--font-sans)",
							color: "var(--color-primary-base)",
						}}
					>
						{column.key}
					</span>
				))}

				{ROWS.map((row) =>
					COLUMNS.map((column) => {
						const isDisabledColumn = column.key === "disabled";
						// La colonne `disabled` ne porte que la ligne `value`, comme la maquette.
						if (isDisabledColumn && row.key !== "value") return <span key={column.key} />;

						return (
							<Textarea
								key={`${row.key}-${column.key}`}
								label={`${row.key} — ${column.key}`}
								hideLabel
								rows={3}
								resize="none"
								placeholder={row.placeholder}
								defaultValue={row.defaultValue}
								invalid={row.invalid}
								disabled={isDisabledColumn}
								fieldClassName={column.fieldClassName}
							/>
						);
					}),
				)}
			</div>
		</div>
	),
};

/**
 * A single field driven by the Storybook controls — this is where hover, focus,
 * typing and the resize grip are exercised for real, the matrix above being
 * frozen.
 */
export const Playground: Story = {
	args: {
		hint: "Tell us as much as you can.",
		maxLength: 280,
		showCounter: true,
	},
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 420, padding: 24 }}>
				<Story />
			</div>
		),
	],
};

/**
 * The counter needs `maxLength`: without an upper bound there is nothing to
 * count against, and it is skipped rather than rendered half-empty.
 */
export const WithCounter: Story = {
	parameters: { controls: { disable: true } },
	render: (args) => {
		const [value, setValue] = useState("value");

		return (
			<div style={{ maxWidth: 420, padding: 24 }}>
				<Textarea
					{...args}
					value={value}
					onChange={(event) => setValue(event.target.value)}
					maxLength={120}
					showCounter
					hint="Controlled — the parent owns the value."
				/>
			</div>
		);
	},
};
