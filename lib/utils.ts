// lib/utils.ts

/**
 * Calculates the cubic volume based on average diameter, length, and quantity.
 * @param diameterFromCm - Diameter from in centimeters.
 * @param diameterToCm - Diameter to in centimeters.
 * @param lengthM - Length in meters.
 * @param quantityPcs - Quantity in pieces.
 * @returns The calculated volume in cubic meters, or 0 if inputs are invalid.
 */
export const calculateVolume = (diameterFromCm: number, diameterToCm: number, lengthM: number, quantityPcs: number): number => {
    if (diameterFromCm <= 0 || diameterToCm <= 0 || lengthM <= 0 || quantityPcs <= 0 || diameterFromCm > diameterToCm) {
        return 0;
    }
    // Convert cm to m for diameter
    const avgDiameterM = (diameterFromCm + diameterToCm) / 2 / 100;
    const volumePerPiece = Math.PI * Math.pow(avgDiameterM / 2, 2) * lengthM;
    return parseFloat((volumePerPiece * quantityPcs).toFixed(3));
};
