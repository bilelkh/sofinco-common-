import type { Meta, StoryObj } from "@storybook/react-vite";
import SearchBlock from "./SearchBlock";

const meta = {
  title: "B2C/SearchBlock",
  component: SearchBlock,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Que recherchez-vous ?",
    action: "/search",
    initialQuery: "prêt",
    nbResults: 12,
    smartNbResults: 4,
    currentPage: 1,
    totalPages: 3,
    results: [
      {
        title: "Prêt personnel : finance vos projets",
        link: "#offre-pret-personnel",
        excerpt:
          "Découvrez le prêt personnel Sofinco pour financer tous vos projets, du voyage à la rénovation.",
      },
      {
        title: "Crédit travaux",
        link: "#offre-credit-travaux",
        excerpt:
          "Une solution dédiée pour financer vos travaux d'aménagement ou de rénovation énergétique.",
      },
      {
        title: "Actualités : taux 2026",
        link: "#actu-taux-2026",
        excerpt:
          "Tour d'horizon des évolutions de taux et de leurs effets sur votre capacité d'emprunt.",
      },
    ],
    smartResults: [
      {
        title: "Quels documents pour souscrire un prêt ?",
        description:
          "La liste des justificatifs nécessaires pour finaliser votre demande en ligne.",
        canonicalurl: "#faq-documents",
      },
      {
        title: "Combien de temps pour obtenir une réponse ?",
        description:
          "Délais indicatifs entre la demande et l'accord de financement.",
        canonicalurl: "#faq-delais",
      },
    ],
  },
  argTypes: {
    title: { control: "text" },
    action: { control: "text" },
    initialQuery: { control: "text" },
    nbResults: { control: "number" },
    smartNbResults: { control: "number" },
    currentPage: { control: "number" },
    totalPages: { control: "number" },
  },
} satisfies Meta<typeof SearchBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoResults: Story = {
  args: {
    initialQuery: "introuvable",
    results: [],
    smartResults: [],
    nbResults: 0,
    smartNbResults: 0,
    currentPage: 1,
    totalPages: 1,
  },
};

export const SinglePage: Story = {
  args: {
    currentPage: 1,
    totalPages: 1,
  },
};

export const Paginated: Story = {
  args: {
    currentPage: 2,
    totalPages: 5,
  },
};

export const EmptyQuery: Story = {
  args: {
    initialQuery: "",
  },
};
