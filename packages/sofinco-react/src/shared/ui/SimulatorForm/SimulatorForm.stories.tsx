import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import SimulatorForm from "./SimulatorForm";

const meta = {
	title: "Shared/UI/SimulatorForm",
	component: SimulatorForm,
	args: {
		amountPlaceholder: "J'ai besoin de",
		amountMin: 100,
		amountMax: 999999,
		ctaLabel: "Je simule mon crédit",
		ctaVariant: "accent",
		ctaSection: "simulator-form-story",
		ctaHref: "#simulation",
	},
	argTypes: {
		errorMessage: { control: "text" },
	},
} satisfies Meta<typeof SimulatorForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bar: Story = {};

/**
 * `amountPlaceholder` omis (ou vide) → placeholder par défaut. Le défaut vit ici
 * et nulle part ailleurs : ni dans les composants parents, ni dans les mappers
 * Jahia, ni en valeur `autocreated` du CND.
 */
export const DefaultPlaceholder: Story = {
	args: {
		amountPlaceholder: undefined,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(canvas.getByPlaceholderText("J'ai besoin de")).toBeInTheDocument();
	},
};

export const ExternalError: Story = {
	args: {
		errorMessage: "Le montant ne doit pas dépasser 10 000€",
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(canvas.getByText("Le montant ne doit pas dépasser 10 000€")).toBeInTheDocument();
	},
};

/**
 * Les erreurs ne sont évaluées qu'à la soumission : passer dans le champ puis en
 * sortir (blur) ne doit rien afficher, seul le clic sur le CTA déclenche.
 */
export const RequiredValidation: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText("J'ai besoin de");

		await userEvent.click(input);
		await userEvent.tab();
		expect(canvas.queryByText("Ce champ est requis")).not.toBeInTheDocument();

		await userEvent.click(canvas.getByRole("button", { name: "Je simule mon crédit" }));
		expect(canvas.getByText("Ce champ est requis")).toBeInTheDocument();
	},
};

export const MinValidation: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText("J'ai besoin de");

		await userEvent.type(input, "50");
		await userEvent.tab();
		expect(canvas.queryByText(/Le montant minimum/)).not.toBeInTheDocument();

		await userEvent.click(canvas.getByRole("button", { name: "Je simule mon crédit" }));
		expect(canvas.getByText("Le montant minimum est de 100€")).toBeInTheDocument();
	},
};

/**
 * La saisie étant plafonnée à 6 chiffres, un dépassement ne peut se produire que
 * sous un `amountMax` lui-même inférieur à 999999 — d'où le plafond resserré ici.
 */
export const MaxValidation: Story = {
	args: {
		amountMax: 50000,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText("J'ai besoin de");
		await userEvent.type(input, "60000");
		await userEvent.click(canvas.getByRole("button", { name: "Je simule mon crédit" }));
		// Borne formatée comme le champ : « 50 000 », pas « 50000 ».
		// Espace ORDINAIRE attendue ici, et non U+202F : le normaliseur par défaut de
		// Testing Library réduit `\s+` — qui inclut l'espace fine insécable — à une
		// espace simple avant comparaison.
		expect(canvas.getByText("Le montant maximum est de 50 000€")).toBeInTheDocument();
	},
};

/**
 * Le champ est dimensionné pour 6 chiffres : la saisie est tronquée au-delà,
 * y compris au collage, et les caractères non numériques sont écartés.
 */
export const SixDigitCap: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText<HTMLInputElement>("J'ai besoin de");

		await userEvent.type(input, "12345678");
		expect(input.value).toBe("123\u202F456");

		await userEvent.clear(input);
		await userEvent.paste("98765432");
		expect(input.value).toBe("987\u202F654");
	},
};

/**
 * Les milliers sont séparés par une espace fine insécable (U+202F, convention
 * typographique FR) à l'affichage — la valeur soumise, elle, reste en chiffres
 * bruts via le champ caché, pour ne pas casser l'URL du simulateur.
 */
export const ThousandsSeparator: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText<HTMLInputElement>("J'ai besoin de");

		await userEvent.type(input, "15000");
		expect(input.value).toBe("15\u202F000");

		const form = input.closest("form") as HTMLFormElement;
		expect(new FormData(form).get("amount")).toBe("15000");

		// Le séparateur suit la longueur du nombre, sans rester collé.
		await userEvent.clear(input);
		await userEvent.type(input, "999999");
		expect(input.value).toBe("999\u202F999");

		await userEvent.clear(input);
		await userEvent.type(input, "999");
		expect(input.value).toBe("999");
	},
};

/**
 * Supprimer un séparateur seul serait sans effet (le formatage le réinsère
 * aussitôt) : on retire le chiffre situé juste au-delà, et le caret reste à sa
 * place logique. Cas limite couvert ici : effacer le chiffre de tête ne doit pas
 * laisser de zéros non significatifs (« 1 000 » → « 0 », pas « 000 »).
 */
export const SeparatorDeletion: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText<HTMLInputElement>("J'ai besoin de");
		const form = input.closest("form") as HTMLFormElement;

		// Backspace juste après le séparateur → efface le chiffre qui le précède.
		await userEvent.type(input, "15000");
		expect(input.value).toBe("15\u202F000");
		input.setSelectionRange(3, 3);
		await userEvent.keyboard("{Backspace}");
		expect(input.value).toBe("1\u202F000");
		expect(new FormData(form).get("amount")).toBe("1000");

		// Delete juste avant le séparateur → efface le chiffre qui le suit.
		await userEvent.clear(input);
		await userEvent.type(input, "123456");
		input.setSelectionRange(3, 3);
		await userEvent.keyboard("{Delete}");
		expect(input.value).toBe("12\u202F356");

		// Chiffre de tête effacé : pas de « 000 » résiduel.
		await userEvent.clear(input);
		await userEvent.type(input, "1000");
		expect(input.value).toBe("1\u202F000");
		input.setSelectionRange(2, 2);
		await userEvent.keyboard("{Backspace}");
		expect(input.value).toBe("0");
		expect(new FormData(form).get("amount")).toBe("0");
	},
};

/**
 * Les trois messages de validation sont surchargeables. `{min}` / `{max}` sont
 * remplacés par la borne effective — jetons plats plutôt que callbacks, pour
 * rester pilotables depuis une propriété JCR côté Jahia.
 */
export const CustomErrorMessages: Story = {
	args: {
		amountMin: 1000,
		requiredErrorMessage: "Merci d'indiquer un montant",
		minErrorMessage: "Nous finançons à partir de {min}€",
		maxErrorMessage: "Nous finançons jusqu'à {max}€",
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText("J'ai besoin de");
		const submit = canvas.getByRole("button", { name: "Je simule mon crédit" });

		await userEvent.click(submit);
		expect(canvas.getByText("Merci d'indiquer un montant")).toBeInTheDocument();

		await userEvent.type(input, "500");
		await userEvent.click(submit);
		expect(canvas.getByText("Nous finançons à partir de 1 000€")).toBeInTheDocument();
	},
};

/**
 * Surcharge partielle : seul `minErrorMessage` est fourni, les deux autres
 * messages retombent sur leur défaut.
 */
export const PartialErrorMessageOverride: Story = {
	args: {
		minErrorMessage: "Minimum {min}€, désolé",
		// Chaîne vide → retombe sur le défaut, comme `errorMessage`.
		requiredErrorMessage: "",
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText("J'ai besoin de");
		const submit = canvas.getByRole("button", { name: "Je simule mon crédit" });

		await userEvent.click(submit);
		expect(canvas.getByText("Ce champ est requis")).toBeInTheDocument();

		await userEvent.type(input, "50");
		await userEvent.click(submit);
		expect(canvas.getByText("Minimum 100€, désolé")).toBeInTheDocument();
	},
};

export const ErrorPrecedence: Story = {
	args: {
		errorMessage: "Erreur serveur externe",
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Je simule mon crédit" }));
		expect(canvas.getByText("Erreur serveur externe")).toBeInTheDocument();
		expect(canvas.queryByText("Ce champ est requis")).not.toBeInTheDocument();
	},
};

export const MinMaxGuard: Story = {
	args: {
		amountMin: 999999,
		amountMax: 100,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText("J'ai besoin de");
		await userEvent.type(input, "5000");
		await userEvent.tab();
		expect(canvas.queryByText(/Le montant/)).not.toBeInTheDocument();
	},
};

export const EmptyErrorMessageFallsThrough: Story = {
	args: {
		errorMessage: "",
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Je simule mon crédit" }));
		expect(canvas.getByText("Ce champ est requis")).toBeInTheDocument();
	},
};

/**
 * Flux conversationnel (ChatBot) : quand `onSubmit` est fourni, la soumission
 * n'entraîne PAS de navigation ; le montant validé est renvoyé au parent (nombre).
 */
export const ConversationalCallback: Story = {
	args: {
		onSubmit: fn(),
	},
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText("J'ai besoin de");
		await userEvent.type(input, "5000");
		await userEvent.click(canvas.getByRole("button", { name: "Je simule mon crédit" }));
		expect(args.onSubmit).toHaveBeenCalledWith(5000);
	},
};
