/** Preserve numeric zero so absent amplitudes and invalid conduction values remain visible for correction. */
export const displayMeasurementInput = (value: string | number | undefined): string | number => value ?? '';
