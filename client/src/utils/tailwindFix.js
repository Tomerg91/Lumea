/**
 * Utility to fix Tailwind CSS theme color issues
 * This is especially helpful for complex theme color references
 */

/**
 * Creates a CSS class that safely references a theme color
 * @param {string} colorPath - Path to the color in the theme (e.g., "colors.lumea.stone.700")
 * @param {number} opacity - Optional opacity value (0-100)
 * @returns {string} CSS class name that can be used in className
 */
export function themeColor(colorPath, opacity) {
  if (opacity !== undefined) {
    return `theme-color-${colorPath.replace(/\./g, '-')}-${opacity}`;
  }
  return `theme-color-${colorPath.replace(/\./g, '-')}`;
}

/**
 * Creates a dynamic style object that can be used with inline styles
 * @param {string} colorPath - Path to the color in the theme
 * @param {number} opacity - Optional opacity value (0-100)
 * @returns {object} Style object with CSS variable
 */
export function themeColorStyle(colorPath, opacity) {
  const cssVar = `--tw-theme-${colorPath.replace(/\./g, '-')}`;
  if (opacity !== undefined) {
    return {
      [cssVar]: `1`,
      opacity: opacity / 100,
    };
  }
  return { [cssVar]: `1` };
}

/**
 * Add these classes to your tailwind.config.js safelist to avoid purging:
 *
 * safelist: [
 *   'theme-color-colors-lumea-stone-700',
 *   'theme-color-colors-lumea-bone-DEFAULT',
 *   'theme-color-colors-lumea-stone-600'
 * ]
 */

export default {
  themeColor,
  themeColorStyle,
};
