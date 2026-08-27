/**
 * One entry of the ProductFocus grid (label pill + description). "Data" type:
 * what the parent (Jahia mapping or story) contributes for each item before
 * the design system renders it.
 */
export interface ProductFocusItemData {
	/**
	 * Stable identifier used as the React key (JCR UUID on the Jahia side,
	 * where items are an `orderable` child-node list).
	 */
	id: string | number;
	/** Short label in normal case (uppercase is applied by the design system). */
	label: string;
	/** Value or detailed explanation of the item. */
	description: string;
}

/**
 * Effective props of the `<ProductFocusItem>` sub-component. Reuses
 * `ProductFocusItemData` to avoid duplication: the sub-component only
 * consumes `label` and `description` (`id` is the parent's React key, not a
 * DOM prop).
 */
export type ProductFocusItemProps = Pick<ProductFocusItemData, "label" | "description">;
