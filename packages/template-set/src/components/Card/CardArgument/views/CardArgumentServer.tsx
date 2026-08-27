import { CardArgument } from "sofinco-react";
import type { CardArgumentProps } from "sofinco-react";
import classes from "./cardArgument.module.css";

export function CardArgumentServer(arg: CardArgumentProps) {
	return <CardArgument {...arg} className={classes.argumentItem} />;
}
