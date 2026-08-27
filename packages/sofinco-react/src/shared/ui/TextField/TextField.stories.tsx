import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import TextField from "./TextField";
import { fieldStyles } from "@shared/ui/Field";

const meta = {
	title: "Shared/UI/TextField",
	component: TextField,
	args: {
		label: "Email address",
		icon: "mail",
		placeholder: "placeholder",
	},
	argTypes: {
		label: { control: "text" },
		hint: { control: "text" },
		errorMessage: { control: "text" },
		placeholder: { control: "text" },
		icon: { control: "text" },
		trailingIcon: { control: "text" },
		invalid: { control: "boolean" },
		clearable: { control: "boolean" },
		hideLabel: { control: "boolean" },
		disabled: { control: "boolean" },
		readOnly: { control: "boolean" },
		required: { control: "boolean" },
	},
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Matrix columns. `hovered` and `focused` cannot be triggered in a static
 * sheet: we reuse the CSS module modifiers, which share their rule with
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
	clearable?: boolean;
	invalid?: boolean;
};

const ROWS: Row[] = [
	{ key: "placeholder", placeholder: "placeholder" },
	{ key: "value", defaultValue: "value", clearable: true },
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
				Textfield
			</h3>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(150px, 1fr))`,
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
							<TextField
								key={`${row.key}-${column.key}`}
								label={`${row.key} — ${column.key}`}
								hideLabel
								icon="mail"
								placeholder={row.placeholder}
								defaultValue={row.defaultValue}
								clearable={row.clearable}
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
 * A single field driven by the Storybook controls — this is where hover, focus
 * and typing are exercised for real, the matrix above being frozen.
 */
export const Playground: Story = {
	args: {
		hint: "We will never share your address.",
		clearable: true,
	},
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 360, padding: 24 }}>
				<Story />
			</div>
		),
	],
};

/**
 * Controlled, the component clears nothing by itself: the parent resets the
 * value from `onClear`.
 */
export const Controlled: Story = {
	parameters: { controls: { disable: true } },
	render: (args) => {
		const [value, setValue] = useState("value");

		return (
			<div style={{ maxWidth: 360, padding: 24 }}>
				<TextField
					{...args}
					value={value}
					onChange={(event) => setValue(event.target.value)}
					clearable
					onClear={() => setValue("")}
					hint={`${value.length} character(s)`}
				/>
			</div>
		);
	},
};

/**
 * Digit grouping applied to the display only. The stored value stays bare — the
 * hint below echoes what `onValueChange` hands back, which is what a form would
 * submit and what validation rules see.
 */
export const Masked: Story = {
	parameters: { controls: { disable: true } },
	args: { label: "Téléphone", icon: undefined, placeholder: "06 12 34 56 78" },
	render: (args) => {
		const [phone, setPhone] = useState("");
		const [siret, setSiret] = useState("32476789990963");

		return (
			<div style={{ display: "grid", gap: 24, maxWidth: 360, padding: 24 }}>
				<TextField
					{...args}
					mask="phone"
					inputMode="tel"
					clearable
					value={phone}
					onValueChange={setPhone}
					hint={`valeur stockée : « ${phone} »`}
				/>
				<TextField
					label="Siret"
					mask="siret"
					inputMode="numeric"
					clearable
					value={siret}
					onValueChange={setSiret}
					hint={`valeur stockée : « ${siret} »`}
				/>
			</div>
		);
	},
};
