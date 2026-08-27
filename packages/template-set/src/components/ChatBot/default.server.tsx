import { jahiaComponent, Island, RenderChildren } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import ChatBot from "./ChatBot.client";
import classes from "./component.module.css";
import { mapChatBotData } from "./chatBot.mapping";
import { useAppTranslation } from "#lib/i18n";

interface Props {
	greeting: string;
	question: string;
	avatarUrl: JCRNodeWrapper;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:chatBot",
	},
	({ greeting, question }: Props, { renderContext, currentNode }) => {
		const { t } = useAppTranslation();
		if (renderContext.isEditMode()) {
			return (
				<div className={classes.editPreview}>
					<div className={classes.editAvatar}>
						<span className={classes.avatarText}>S</span>
					</div>
					<p className={classes.editGreeting}>{greeting}</p>
					<p className={classes.editQuestion}>{question}</p>
					<ul className={classes.editCategoryList}>
						<RenderChildren nodeTypes={["sofnt:chatBotCategory"]} />
					</ul>
				</div>
			);
		}

		const data = mapChatBotData(currentNode, greeting, question, renderContext, t);
		return <Island component={ChatBot} props={{ data }} />;
	},
);
