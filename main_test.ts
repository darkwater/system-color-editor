import {
  clampChannel,
  formatAccentConfig,
  formatAccentInstallScript,
  normalizeHexInput,
  parseHexColorOrNull,
  rgbToHex,
} from "./main.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("clampChannel clamps into 0-255 and truncates decimals", () => {
  assertEquals(clampChannel(-4), 0);
  assertEquals(clampChannel(0), 0);
  assertEquals(clampChannel(12.9), 12);
  assertEquals(clampChannel(255), 255);
  assertEquals(clampChannel(900), 255);
});

Deno.test("normalizeHexInput accepts #RRGGBB and RRGGBB", () => {
  assertEquals(normalizeHexInput("#a1B2c3"), "#a1b2c3");
  assertEquals(normalizeHexInput("A1B2C3"), "#a1b2c3");
  assertEquals(normalizeHexInput("#abc"), null);
  assertEquals(normalizeHexInput("xyzxyz"), null);
});

Deno.test("parseHexColorOrNull returns channels for valid hex", () => {
  assertEquals(parseHexColorOrNull("#000000"), { r: 0, g: 0, b: 0 });
  assertEquals(parseHexColorOrNull("ffffff"), { r: 255, g: 255, b: 255 });
  assertEquals(parseHexColorOrNull("#0a64c8"), { r: 10, g: 100, b: 200 });
  assertEquals(parseHexColorOrNull("#zzz999"), null);
});

Deno.test("rgbToHex returns normalized lowercase #RRGGBB", () => {
  assertEquals(rgbToHex(0, 0, 0), "#000000");
  assertEquals(rgbToHex(255, 255, 255), "#ffffff");
  assertEquals(rgbToHex(10, 100, 200), "#0a64c8");
});

Deno.test("formatAccentConfig returns ACCENT_HOSTNAME and color variables", () => {
  const text = formatAccentConfig(
    "build-server-01",
    { r: 208, g: 208, b: 208 },
    { r: 27, g: 31, b: 39 },
  );

  assertEquals(
    text,
    [
      'ACCENT_HOSTNAME="build-server-01"',
      'ACCENT_FG_HEX="#d0d0d0"',
      'ACCENT_BG_HEX="#1b1f27"',
      'ACCENT_FG_RGB="208;208;208"',
      'ACCENT_BG_RGB="27;31;39"',
    ].join("\n"),
  );
});

Deno.test("formatAccentInstallScript wraps config in tee heredoc", () => {
  const config = [
    'ACCENT_HOSTNAME="build-server-01"',
    'ACCENT_FG_HEX="#d0d0d0"',
    'ACCENT_BG_HEX="#1b1f27"',
    'ACCENT_FG_RGB="208;208;208"',
    'ACCENT_BG_RGB="27;31;39"',
  ].join("\n");

  assertEquals(
    formatAccentInstallScript(config),
    [
      "cat <<'EOF' | sudo tee /etc/system-colors.conf >/dev/null",
      'ACCENT_HOSTNAME="build-server-01"',
      'ACCENT_FG_HEX="#d0d0d0"',
      'ACCENT_BG_HEX="#1b1f27"',
      'ACCENT_FG_RGB="208;208;208"',
      'ACCENT_BG_RGB="27;31;39"',
      "EOF",
    ].join("\n"),
  );
});
