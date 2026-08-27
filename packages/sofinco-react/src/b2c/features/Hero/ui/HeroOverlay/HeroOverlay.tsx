import React from 'react'
import styles from "@b2c/features/Hero/ui/HeroOverlay/HeroOverlay.module.css"
import type { HeroOverlayProps } from '@b2c/features/Hero/ui/HeroOverlay/HeroOverlay.type'

export const HeroOverlay = ({className}: HeroOverlayProps) => {
  return (
	<div className={`${styles.hero__overlay} ${className ?? ""}`} aria-hidden="true" />
  )
}
