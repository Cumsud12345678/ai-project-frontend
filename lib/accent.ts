/** Vidjetin standart rəngi (backend: DEFAULT_COLOR) və rəngin üstündəki yazı rəngi: önizləmələr saytdakı çatla eyni görünsün. */
export const DEFAULT_ACCENT = "#ea580c";
export const onAccent = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160 ? "#111827" : "#ffffff";
};
/** Rəng fonlu element üçün stil: vidjet rəngi yoxdursa standart narıncı */
export const accentStyle = (accent?: string) => {
  const bg = accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : DEFAULT_ACCENT;
  return { background: bg, color: onAccent(bg) };
};
