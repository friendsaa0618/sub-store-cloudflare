/**
 * Collects visible text that misses the WCAG AA contrast threshold.
 *
 * Self-contained so Playwright can serialise it into the page: it walks the
 * rendered DOM, resolves each element's effective background, and compares the
 * composited text colour against it. Disabled or faded controls are skipped,
 * because AA does not apply to them.
 */
export const collectContrastViolations = () => {
  const parseColor = (color: string) => {
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(',').map((value) => Number.parseFloat(value));
    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      a: parts.length > 3 ? parts[3] : 1,
    };
  };

  const luminance = (color: { r: number; g: number; b: number }) => {
    const channel = (value: number) => {
      const scaled = value / 255;
      return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  };

  const backgroundOf = (element: Element | null) => {
    let node: Element | null = element;
    while (node) {
      const color = parseColor(getComputedStyle(node).backgroundColor);
      if (color && color.a > 0.5) return color;
      node = node.parentElement;
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  };

  const violations: string[] = [];
  document.querySelectorAll<HTMLElement>('body *').forEach((element) => {
    const text = element.textContent?.trim();
    if (!text || element.children.length > 0) return;
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') return;
    if (Number.parseFloat(style.opacity) < 0.6) return;
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    const foreground = parseColor(style.color);
    if (!foreground) return;
    const background = backgroundOf(element.parentElement);
    const composited = {
      r: foreground.r * foreground.a + background.r * (1 - foreground.a),
      g: foreground.g * foreground.a + background.g * (1 - foreground.a),
      b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    };
    const textLuminance = luminance(composited);
    const backgroundLuminance = luminance(background);
    const ratio =
      (Math.max(textLuminance, backgroundLuminance) + 0.05) /
      (Math.min(textLuminance, backgroundLuminance) + 0.05);

    const size = Number.parseFloat(style.fontSize);
    const bold = Number.parseInt(style.fontWeight, 10) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const required = large ? 3 : 4.5;
    if (ratio < required) {
      violations.push(
        `${ratio.toFixed(2)}:1 (needs ${required}:1) ${size}px "${text.slice(0, 40)}" color ${style.color}`,
      );
    }
  });
  return violations;
};
