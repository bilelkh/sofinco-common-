import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReassurancePictos } from "./ReassurancePictos";

const meta = {
	title: "B2C/ReassurancePictos",
	component: ReassurancePictos,
	args: {
		ariaLabel: "Nos engagements",
		items: [
			{
				id: "1",
				src: "/images/samples/ReassurancePictos/icon-1.webp",
				label: "Depuis 75 ans à vos côtés",
			},
			{
				id: "2",
				src: "/images/samples/ReassurancePictos/icon-2.webp",
				label: "Parcours 100% sécurisé",
			},
			{
				id: "3",
				src: "/images/samples/ReassurancePictos/icon-3.webp",
				label: "Simulation sans engagement",
			},
			{
				id: "4",
				src: "/images/samples/ReassurancePictos/icon-4.webp",
				label: "Signature électronique",
			},
		],
	},
} satisfies Meta<typeof ReassurancePictos>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
