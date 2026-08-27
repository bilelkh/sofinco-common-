import { Root, List, Trigger, Content } from "@radix-ui/react-tabs";
import { Root as ScrollRoot, Viewport, Scrollbar } from "@radix-ui/react-scroll-area";
import clsx from "clsx";

import { type TabsProps } from "./Tabs.type";
import styles from "./Tabs.module.css";

import slugify from "@utils/slugify";

const Tabs = ({ className, tabs, children }: TabsProps) => {
	const mainClassName = clsx(styles.menu__tabs, className);
	const childrenArray = Array.isArray(children) ? children : [children];

	return (
		<Root className={mainClassName} defaultValue={slugify(`${tabs[0]}--0`)}>
			<ScrollRoot>
				<Viewport>
					<List className={styles.menu__tabs__list}>
						{tabs.map((tab, index) => (
							<Trigger
								key={tab}
								className={styles.menu__tabs__trigger}
								value={slugify(`${tab}--${index}`)}
							>
								{tab}
							</Trigger>
						))}
					</List>
					<Scrollbar orientation="horizontal" />
				</Viewport>
			</ScrollRoot>

			{childrenArray.map((child, index) => (
				<Content
					key={tabs[index]}
					className={styles.menu__tabs__content}
					value={slugify(`${tabs[index]}--${index}`)}
				>
					{child}
				</Content>
			))}
		</Root>
	);
};

export default Tabs;
