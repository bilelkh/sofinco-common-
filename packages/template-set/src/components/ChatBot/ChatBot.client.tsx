import { ChatBot, type ChatBotProps } from "sofinco-react";

export type { ChatBotData, ChatBotCategory as Category } from "sofinco-react";

export default function ChatBotJahia(props: ChatBotProps) {
	return <ChatBot {...props} />;
}
