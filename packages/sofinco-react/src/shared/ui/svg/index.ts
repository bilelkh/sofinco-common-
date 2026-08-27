import type { FC } from "react";
import ChevronUp from "./chevron-up";
import ChevronRight from "./chevron-right";
import FolderCheck from "./folder-check";
import Loader from "./loader";
import Menu from "./menu";
import MessageCircleQuestionMark from "./message-circle-question-mark";
import MessageCircleBuble from "./message-circle-buble";
import Refreshccw from "./refreshccw";
import X from "./x";
import ArrowLeft from "./arrow-left";
import ArrowRight from "./arrow-right";
import Plus from "./plus";
import Minus from "./minus";
import DownloadIcon from "./download";
import Play from "./play";
import FakeSwitch from "./fake-switch";
import Search from "./search";
import Single from "./single";
import CircleUserSingle from "@/shared/ui/svg/circle-user-single";
import CheckValid from "@/shared/ui/svg/check-valid";
import XInvalid from "@/shared/ui/svg/x-invalid";
import XRound from "@/shared/ui/svg/x-round";
import Check from "./check";
import Warning from "./warning";
import CircleX from "./circle-x";
import CircleAlert from "./circle-alert";
import Lock from "./lock";
import Mail from "./mail";
import ChevronDown from "./chevron-down";
import CheckFilled from "./check-filled";
import ArrowBack from "./arrow-back";
import ArrowForward from "./arrow-forward";

export const ICONS = {
	"chevron-up": ChevronUp,
	"chevron-right": ChevronRight,
	"folder-check": FolderCheck,
	"loader": Loader,
	"menu": Menu,
	"message-circle-question-mark": MessageCircleQuestionMark,
	"message-circle-buble": MessageCircleBuble,
	"refreshccw": Refreshccw,
	"x": X,
	"arrow-left": ArrowLeft,
	"arrow-right": ArrowRight,
	"plus": Plus,
	"minus": Minus,
	"download": DownloadIcon,
	"play": Play,
	"fake-switch": FakeSwitch,
	"search": Search,
	"single": Single,
	"circle-user-single": CircleUserSingle,
	"check-valid": CheckValid,
	"x-invalid": XInvalid,
	"x-round": XRound,
	"check": Check,
	"warning": Warning,
	"circle-x": CircleX,
  "circle-alert": CircleAlert,
  lock: Lock,
  mail: Mail,
  "chevron-down": ChevronDown,
  "check-filled": CheckFilled,
  "arrow-back": ArrowBack,
  "arrow-forward": ArrowForward,
} satisfies Record<string, FC>;

export type IconKey = keyof typeof ICONS;
