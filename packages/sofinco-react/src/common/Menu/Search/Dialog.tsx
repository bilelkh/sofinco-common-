import styles from "./Search.module.css";
import clsx from "clsx";
import Cta from "@shared/ui/Cta/Cta";
import Input from "./Input";

import { type InputProps } from "./Input";

import {
	Root,
	Trigger,
	Portal,
	Overlay,
	Content,
	Close,
	Title,
	Description,
} from "@radix-ui/react-dialog";
const Dialog = ({
	inputProps,
	children,
}: {
	inputProps: InputProps;
	children?: React.ReactNode;
}) => {
	return (
		<Root>
			<Trigger asChild>
				<Cta
					className={styles["search__trigger"]}
					label="Ouvrir la recherche"
					iconOnly
					iconLeft="search"
					variant="outlined"
				/>
			</Trigger>
			<Portal>
				<Overlay className={styles["search__dialog__overlay"]} />
				<Content className={styles["search__dialog__content"]}>
					{/* Visually hidden, but required by Radix for screen-reader accessibility. */}
					<Title className={styles["sr-only"]}>Recherche</Title>
					<Description className={styles["sr-only"]}>Rechercher sur le site</Description>
					<div className={clsx(styles["search__dialog__header"])}>
						<Input {...inputProps} />
						<Close asChild>
							<Cta label="Annuler" variant="underlined" />
						</Close>
					</div>
					{children}
				</Content>
			</Portal>
		</Root>
	);
};

export default Dialog;
