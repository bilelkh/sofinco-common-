import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { fieldStyles } from "@shared/ui/Field";

import Select from "./Select";
import type { SelectOption, SelectOptionGroup } from "./Select.type";

const OPTIONS: SelectOption[] = [
	{ value: "perso", label: "Prêt personnel" },
	{ value: "auto", label: "Crédit auto" },
	{ value: "travaux", label: "Prêt travaux" },
	{ value: "rachat", label: "Rachat de crédits", disabled: true },
];

const RICH_OPTIONS: SelectOption[] = [
	{ value: "perso", label: "Prêt personnel", icon: "check", description: "De 3 000 € à 75 000 €" },
	{ value: "auto", label: "Crédit auto", icon: "check", description: "Neuf ou occasion" },
	{ value: "travaux", label: "Prêt travaux", icon: "check", description: "Rénovation, extension" },
];

const GROUPS: SelectOptionGroup[] = [
	{
		label: "Crédits",
		options: [
			{ value: "perso", label: "Prêt personnel" },
			{ value: "auto", label: "Crédit auto" },
		],
	},
	{ label: "Assurances", options: [{ value: "adi", label: "Assurance ADI" }] },
];

const meta = {
	title: "Shared/UI/Select",
	component: Select,
	args: {
		label: "Project type",
		placeholder: "placeholder",
		options: OPTIONS,
	},
	argTypes: {
		label: { control: "text" },
		hint: { control: "text" },
		errorMessage: { control: "text" },
		placeholder: { control: "text" },
		icon: { control: "text" },
		invalid: { control: "boolean" },
		hideLabel: { control: "boolean" },
		disabled: { control: "boolean" },
		required: { control: "boolean" },
	},
} satisfies Meta<typeof Select>;

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
	defaultValue?: string;
	invalid?: boolean;
};

const ROWS: Row[] = [
	{ key: "placeholder" },
	{ key: "value", defaultValue: "auto" },
	{ key: "error", defaultValue: "auto", invalid: true },
];

/**
 * State matrix of the closed trigger, mirroring the Figma frame: the four
 * interaction states as columns, the three content states as rows. The
 * `disabled` column holds a single cell — a disabled field is neither hovered
 * nor focused.
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
				Select
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
							<Select
								key={`${row.key}-${column.key}`}
								label={`${row.key} — ${column.key}`}
								hideLabel
								placeholder="placeholder"
								options={OPTIONS}
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
 * The panel. It only mounts once opened, so it cannot appear in the static
 * matrix — click the trigger, or focus it and press ↓, to inspect the item
 * states: active (hover *and* keyboard), selected, disabled.
 *
 * Try the keyboard: ↑ ↓ to move, Home / End to jump, Enter to pick, Escape to
 * close, and type "c" repeatedly to cycle through options starting with it.
 */
export const Open: Story = {
	parameters: { controls: { disable: true } },
	render: (args) => (
		<div style={{ minHeight: 340, padding: 24 }}>
			<div style={{ maxWidth: 360 }}>
				<Select {...args} defaultValue="auto" hint="Click, or focus and press ↓." />
			</div>
		</div>
	),
};

/**
 * Options carry an optional icon and a secondary description line, shown in the
 * panel only — the trigger keeps just the label, so the field height never
 * shifts with the selection.
 */
export const RichOptions: Story = {
	parameters: { controls: { disable: true } },
	render: (args) => (
		<div style={{ minHeight: 360, padding: 24 }}>
			<div style={{ maxWidth: 360 }}>
				<Select {...args} options={RICH_OPTIONS} defaultValue="perso" />
			</div>
		</div>
	),
};

/** Options split into labelled groups. Flat `options` render first if both are passed. */
export const Grouped: Story = {
	parameters: { controls: { disable: true } },
	render: (args) => {
		const [value, setValue] = useState("");

		return (
			<div style={{ minHeight: 360, padding: 24 }}>
				<div style={{ maxWidth: 360 }}>
					<Select
						{...args}
						options={undefined}
						groups={GROUPS}
						value={value}
						onValueChange={setValue}
						hint={value ? `Selected: ${value}` : "Controlled — nothing chosen yet."}
					/>
				</div>
			</div>
		);
	},
};

/**
 * With `name`, a hidden native `<select>` mirrors the value so a plain HTML
 * form post carries it — before, and without, hydration. Submit to see the
 * value land in the query string.
 */
export const InAForm: Story = {
	parameters: { controls: { disable: true } },
	render: (args) => (
		<form
			method="GET"
			style={{ minHeight: 360, padding: 24, maxWidth: 360 }}
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				// eslint-disable-next-line no-alert
				alert(`project=${data.get("project") ?? ""}`);
			}}
		>
			<Select {...args} name="project" required hint="Required — try submitting empty." />
			<button type="submit" style={{ marginTop: 16 }}>
				Submit
			</button>
		</form>
	),
};

/**
 * A single field driven by the Storybook controls — this is where hover, focus
 * and opening the panel are exercised for real, the matrix above being frozen.
 */
export const Playground: Story = {
	args: {
		hint: "Pick the project you want to finance.",
	},
	decorators: [
		(Story) => (
			<div style={{ minHeight: 340, maxWidth: 360, padding: 24 }}>
				<Story />
			</div>
		),
	],
};
