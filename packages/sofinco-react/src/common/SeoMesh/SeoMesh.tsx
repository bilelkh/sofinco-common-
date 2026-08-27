import clsx from "clsx";
import Block from "./Block/Block";

import type { SeoMeshProps } from "./SeoMesh.type";

import styles from "./SeoMesh.module.css";

const SeoMesh = ({ blocks }: SeoMeshProps) => {
	const mainClassName = clsx(styles.seomesh);
	return (
		<div className={mainClassName}>
			{blocks.map((block) => (
				<Block key={block.id} {...block} />
			))}
		</div>
	);
};

export default SeoMesh;
