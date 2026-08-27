import type { Meta, StoryObj } from "@storybook/react-vite";
import { composeStories } from "@storybook/react-vite";
import Header from "./Header";
import AlertBand from "@shared/ui/AlertBand/AlertBand";
import * as MenuStories from "@common/Menu/Menu.stories";

const { Default: Menu } = composeStories(MenuStories);

// The menu region as rendered in Jahia: the TopBar (tabs + search) sits above the nav.
const menuRegion = (
	<>
		<Menu />
	</>
);

const meta = {
	title: "B2C/Header",
	component: Header,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		menu: menuRegion,
	},
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAlert: Story = {
	args: {
		alert: (
			<AlertBand message="Information importante concernant votre espace client." variant="info" />
		),
	},
};
