import { jahiaComponent, RenderChild, RenderChildren } from "@jahia/javascript-modules-library";
import { ComparativeTable } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import { mapComparativeTableProps } from "./comparativeTable.mapping";
import classes from "./component.module.css";

export default jahiaComponent(
	{ nodeType: "sofnt:comparativeTable", displayName: "Tableau comparatif", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const props = mapComparativeTableProps(currentNode);

		if (isEditMode(renderContext)) {
			return (
				<div className={classes.editPreview}>
					<header className={classes.editHeader}>
						<p className={classes.editTitle}>{props.title || "Tableau comparatif"}</p>
						{props.subtitle ? <p className={classes.editSubtitle}>{props.subtitle}</p> : null}
					</header>
					<div className={classes.editTable}>
						<div className={classes.editHeadRow}>
							<span className={classes.editHeadCell}>{props.rowHeaderLabel}</span>
							<span className={classes.editHeadCell}>{props.leftColumnLabel}</span>
							<span className={classes.editHeadCell}>{props.rightColumnLabel}</span>
						</div>
						<ul className={classes.editRowList}>
							<RenderChildren
								nodeTypes={["sofnt:comparativeTableRow"]}
								filter="sofnt:comparativeTableRow"
							/>
						</ul>
					</div>
					<div className={classes.editActions}>
						<div className={classes.editAction}>
							<RenderChild name="leftColumnButton" nodeTypes={["sofnt:comparativeTableButton"]} />
						</div>
						<div className={classes.editAction}>
							<RenderChild name="rightColumnButton" nodeTypes={["sofnt:comparativeTableButton"]} />
						</div>
					</div>
				</div>
			);
		}

		return <ComparativeTable {...props} />;
	},
);
