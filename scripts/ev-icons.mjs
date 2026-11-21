/**
 * scripts/ev-icons.mjs — EndaViral icon pass for the generated pages.
 *
 * build-pages.mjs runs every page it writes through iconify(html), so the
 * blog, the SEO landing pages and the Learn hub use the same icons as the app:
 *   • platform emoji (📸 🎵 ▶️ ✈️ 𝕏) → the real logos bundled in /icons/platforms/
 *   • other icon emoji (🔒 ✅ 🎓 …)   → line icons from the app's set, as a small
 *     per-page sprite of only the icons that page uses
 * Only emoji that START a text node (right after a tag, like ">🔒 Safe") are
 * touched; emoji inside sentences, <title>, <option>, <script> and <style>
 * are left alone. Running it twice gives the same page.
 */
export const ICONS = {
  "alarm": "<circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 9v4l2 2M5 3 2 6M22 6l-3-3\"/>",
  "alert": "<path d=\"M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/>",
  "arrow-down": "<path d=\"M12 4v16M6 14l6 6 6-6\"/>",
  "arrow-right": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>",
  "ball": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m12 7 4 3-1.5 4.5h-5L8 10z\"/><path d=\"M12 3v4M21 10.5l-5-.5M18 19l-3.5-4.5M6 19l3.5-4.5M3 10.5l5-.5\"/>",
  "ban": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m5.6 5.6 12.8 12.8\"/>",
  "bank": "<path d=\"M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3\"/>",
  "banknote": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2.5\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/><path d=\"M6 12h.01M18 12h.01\"/>",
  "battery": "<rect x=\"2\" y=\"7\" width=\"17\" height=\"10\" rx=\"2\"/><path d=\"M22 11v2M6 10v4M10 10v4\"/>",
  "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\"/><path d=\"M10.3 21a1.9 1.9 0 0 0 3.4 0\"/>",
  "book": "<path d=\"M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5 2.5 2.5 0 0 0 6.5 24\"/><path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"/>",
  "bookmark": "<path d=\"M6 3h12v18l-6-4-6 4z\"/>",
  "bot": "<rect x=\"4\" y=\"8\" width=\"16\" height=\"12\" rx=\"3\"/><path d=\"M12 8V4M8 4h8M9 14h.01M15 14h.01M2 13v3M22 13v3\"/>",
  "bricks": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"1.5\"/><path d=\"M3 9.3h18M3 14.7h18M9 4v5.3M15 9.3v5.4M9 14.7V20\"/>",
  "briefcase": "<rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"2.5\"/><path d=\"M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/><path d=\"M3 13h18\"/>",
  "broom": "<path d=\"m13 11 8-8M8.5 13.5l2 2M3 21c1-4 3-7 5.5-7.5l2 2C10 18 7 20 3 21z\"/>",
  "building": "<rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><path d=\"M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01\"/>",
  "bulb": "<path d=\"M9 18h6M10 22h4\"/><path d=\"M15.1 14c.2-1 .7-1.7 1.4-2.5A5.8 5.8 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.2 1.5 1.4 2.5\"/>",
  "calendar": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2.5\"/><path d=\"M3 10h18M8 3v4M16 3v4\"/>",
  "camera": "<path d=\"M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/>",
  "card": "<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2.5\"/><path d=\"M2 10h20M6 15h4\"/>",
  "cart": "<circle cx=\"9\" cy=\"20\" r=\"1.5\"/><circle cx=\"18\" cy=\"20\" r=\"1.5\"/><path d=\"M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6\"/>",
  "chart": "<path d=\"M3 3v18h18\"/><path d=\"M8 17v-5M13 17V8M18 17v-8\"/>",
  "chart-up": "<path d=\"M3 3v18h18\"/><path d=\"m7 14 4-4 3 3 6-6\"/>",
  "chat-question": "<path d=\"M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.5-5A8.5 8.5 0 1 1 21 12z\"/><path d=\"M9.5 9.5a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 2.2M12 16h.01\"/>",
  "check": "<path d=\"m5 12 5 5 9-10\"/>",
  "check-circle": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 12 3 3 5-6\"/>",
  "clipboard": "<rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"M9 12h6M9 16h4\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>",
  "cloud": "<path d=\"M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 10a4 4 0 0 1 0 8z\"/>",
  "coins": "<circle cx=\"9\" cy=\"9\" r=\"6\"/><path d=\"M18.1 10.4A6 6 0 1 1 10.3 18\"/><path d=\"M8 7h1.5v4M16.7 13.9l.8.8-2.8 2.8\"/>",
  "comment": "<path d=\"M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/>",
  "compass": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m16 8-2 6-6 2 2-6z\"/>",
  "crown": "<path d=\"m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z\"/>",
  "dashboard": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1.5\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\" rx=\"1.5\"/>",
  "database": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3\"/>",
  "download": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5M12 15V3\"/>",
  "dumbbell": "<path d=\"M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12\"/>",
  "edit": "<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z\"/>",
  "eye": "<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "eye-off": "<path d=\"M10.7 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.2M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6\"/><path d=\"M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20\"/>",
  "film": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2.5\"/><path d=\"M7 3v18M17 3v18M3 8h4M3 12h18M3 16h4M17 8h4M17 16h4\"/>",
  "flag": "<path d=\"M4 22V4a1 1 0 0 1 1-1h13l-3 5 3 5H5\"/>",
  "frown": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01\"/>",
  "gamepad": "<rect x=\"2.5\" y=\"7\" width=\"19\" height=\"11\" rx=\"5\"/><path d=\"M7 11v3M5.5 12.5h3M15.5 11.5h.01M18 13.5h.01\"/>",
  "gem": "<path d=\"M6 3h12l4 6-10 12L2 9z\"/><path d=\"M2 9h20M12 21 8 9l4-6 4 6z\"/>",
  "gift": "<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13\"/><path d=\"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7\"/><path d=\"M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5\"/>",
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18\"/>",
  "graduation": "<path d=\"M22 9 12 4 2 9l10 5z\"/><path d=\"M6 11v5c3 2.5 9 2.5 12 0v-5\"/><path d=\"M22 9v5\"/>",
  "hand": "<path d=\"M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8\"/><path d=\"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15\"/>",
  "handshake": "<path d=\"m11 17 2 2a1 1 0 1 0 3-3\"/><path d=\"m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5.8 5.8 0 0 1 7.1-.9l.5.3a4 4 0 0 0 2.8.5L21 4\"/><path d=\"m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8\"/>",
  "headphones": "<path d=\"M3 18v-6a9 9 0 0 1 18 0v6\"/><rect x=\"3\" y=\"14\" width=\"4\" height=\"7\" rx=\"1.5\"/><rect x=\"17\" y=\"14\" width=\"4\" height=\"7\" rx=\"1.5\"/>",
  "heart": "<path d=\"M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z\"/>",
  "home": "<path d=\"m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><path d=\"M9 22V12h6v10\"/>",
  "hourglass": "<path d=\"M6 3h12M6 21h12\"/><path d=\"M7 3c0 4.5 10 4.5 10 9s-10 4.5-10 9\"/><path d=\"M17 3c0 4.5-10 4.5-10 9s10 4.5 10 9\"/>",
  "image": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2.5\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-5-5L5 21\"/>",
  "inbox": "<path d=\"M22 12h-6l-2 3h-4l-2-3H2\"/><path d=\"M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 16v-4M12 8h.01\"/>",
  "key": "<circle cx=\"7.5\" cy=\"15.5\" r=\"5.5\"/><path d=\"m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3\"/>",
  "landmark": "<path d=\"M3 21h18M5 21v-9M9.5 21v-9M14.5 21v-9M19 21v-9M2 9l10-6 10 6z\"/>",
  "laptop": "<rect x=\"4\" y=\"5\" width=\"16\" height=\"11\" rx=\"1.5\"/><path d=\"M2 19h20\"/>",
  "layers": "<path d=\"M12 3 2 8l10 5 10-5z\"/><path d=\"m2 13 10 5 10-5\"/>",
  "leaf": "<path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z\"/><path d=\"M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12\"/>",
  "lifebuoy": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"m4.9 4.9 4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3\"/>",
  "link": "<path d=\"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1\"/><path d=\"M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1\"/>",
  "lock": "<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>",
  "mail": "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2.5\"/><path d=\"m22 7-10 6L2 7\"/>",
  "medal": "<circle cx=\"12\" cy=\"15\" r=\"6\"/><path d=\"M8.2 10.2 5 2h4l3 6 3-6h4l-3.2 8.2\"/>",
  "megaphone": "<path d=\"M3 10v4a1 1 0 0 0 1 1h3l7 4V5L7 9H4a1 1 0 0 0-1 1z\"/><path d=\"M18 9a4 4 0 0 1 0 6\"/><path d=\"M8 15v4\"/>",
  "meh": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 15h7\"/><path d=\"M9 9.5h.01M15 9.5h.01\"/>",
  "message": "<path d=\"M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.5-5A8.5 8.5 0 1 1 21 12z\"/>",
  "mic": "<rect x=\"9\" y=\"2\" width=\"6\" height=\"12\" rx=\"3\"/><path d=\"M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8\"/>",
  "moon": "<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z\"/>",
  "music": "<path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/>",
  "note": "<path d=\"M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><path d=\"M14 3v6h6M8 13h8M8 17h5\"/>",
  "package": "<path d=\"M21 8 12 3 3 8v8l9 5 9-5z\"/><path d=\"m3 8 9 5 9-5\"/><path d=\"M12 13v8\"/>",
  "palette": "<path d=\"M12 22a10 10 0 1 1 10-10c0 2.2-1.8 3-3.5 3H16a2 2 0 0 0-1.5 3.3c.4.5.5.9.5 1.2 0 1.4-1.3 2.5-3 2.5z\"/><circle cx=\"7.5\" cy=\"10.5\" r=\"1\"/><circle cx=\"12\" cy=\"7.5\" r=\"1\"/><circle cx=\"16.5\" cy=\"10.5\" r=\"1\"/>",
  "paperclip": "<path d=\"m21.4 11-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5\"/>",
  "phone": "<rect x=\"6\" y=\"2\" width=\"12\" height=\"20\" rx=\"2.5\"/><path d=\"M11 18h2\"/>",
  "phone-call": "<path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z\"/>",
  "pin": "<path d=\"M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>",
  "plane": "<path d=\"M10.5 13.5 3 11l1.5-1.5 8 .5 4-4.5a2 2 0 0 1 3 3l-4.5 4 .5 8L14 22l-2.5-7.5L8 18v2.5L6.5 22 5 18.5 1.5 17 3 15.5h2.5z\"/>",
  "play": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M10 8.5v7l6-3.5z\"/>",
  "plug": "<path d=\"M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z\"/>",
  "plus": "<path d=\"M12 5v14M5 12h14\"/>",
  "plus-square": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"4\"/><path d=\"M12 8v8M8 12h8\"/>",
  "pointer": "<path d=\"M9 11V5a2 2 0 0 1 4 0v5M13 9a2 2 0 0 1 4 0v2M17 10a2 2 0 0 1 4 0v4a8 8 0 0 1-8 8h-1a8 8 0 0 1-6.5-3.4L3 15a2 2 0 0 1 3.2-2.4L9 15\"/>",
  "puzzle": "<path d=\"M19.4 14.9c-.2.5 0 1.1.4 1.5l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.6 1.6c-.5.5-1.2.4-1.6 0l-.9-.9a2.4 2.4 0 1 0-3.4 3.4\"/><path d=\"M4 4h6v2a2 2 0 1 0 4 0V4h6v6h-2a2 2 0 1 0 0 4h2v6h-6v-2a2 2 0 1 0-4 0v2H4v-6h2a2 2 0 1 0 0-4H4z\"/>",
  "radio": "<circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5\"/>",
  "receipt": "<path d=\"M4 2v20l3-2 2.5 2 2.5-2 2.5 2 2.5-2 3 2V2l-3 2-2.5-2L12 4 9.5 2 7 4z\"/><path d=\"M8 9h8M8 13h8M8 17h5\"/>",
  "refresh": "<path d=\"M21 12a9 9 0 0 1-15.5 6.3L3 16\"/><path d=\"M3 12a9 9 0 0 1 15.5-6.3L21 8\"/><path d=\"M21 3v5h-5M3 21v-5h5\"/>",
  "repeat": "<path d=\"m17 2 4 4-4 4\"/><path d=\"M3 11V9a3 3 0 0 1 3-3h15\"/><path d=\"m7 22-4-4 4-4\"/><path d=\"M21 13v2a3 3 0 0 1-3 3H3\"/>",
  "rocket": "<path d=\"M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z\"/><path d=\"M12 15 9 12a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z\"/><path d=\"M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5\"/>",
  "satellite": "<path d=\"M5 19a10 10 0 0 1 0-14M8.5 15.5a5 5 0 0 1 0-7\"/><circle cx=\"12\" cy=\"12\" r=\"1.8\"/><path d=\"M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14\"/>",
  "save": "<path d=\"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z\"/><path d=\"M17 21v-8H7v8M7 3v5h8\"/>",
  "scale": "<path d=\"M12 3v18M7 21h10M3 7h18M6 7l-3 7a4 4 0 0 0 6 0zM18 7l-3 7a4 4 0 0 0 6 0z\"/>",
  "scissors": "<circle cx=\"6\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><path d=\"M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12\"/>",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/>",
  "settings": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z\"/>",
  "shield": "<path d=\"M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z\"/>",
  "shield-check": "<path d=\"M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z\"/><path d=\"m9 12 2 2 4-4\"/>",
  "shirt": "<path d=\"M8 3 3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z\"/>",
  "sleep": "<path d=\"M4 4h6l-6 7h6M14 12h6l-6 8h6\"/>",
  "smile": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 14.5a4.5 4.5 0 0 0 7 0\"/><path d=\"M9 9.5h.01M15 9.5h.01\"/>",
  "snowflake": "<path d=\"M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1\"/>",
  "sparkle": "<path d=\"M12 3v4M12 17v4M3 12h4M17 12h4\"/><path d=\"m6 6 2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6\"/>",
  "square-check": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><path d=\"m8 12 3 3 5-6\"/>",
  "star": "<path d=\"m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z\"/>",
  "stop": "<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"1.5\"/>",
  "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/>",
  "sunrise": "<path d=\"M12 2v6M4.9 10.9l1.4 1.4M2 18h2M20 18h2M17.7 12.3l1.4-1.4M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0\"/>",
  "tag": "<path d=\"M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.5\"/>",
  "target": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>",
  "thumbs-up": "<path d=\"M7 10v12M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9z\"/>",
  "ticket": "<path d=\"M3 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z\"/><path d=\"M13 5v2M13 17v2M13 11v2\"/>",
  "timer": "<circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 9v4l2 2M10 2h4\"/>",
  "trash": "<path d=\"M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/>",
  "trending": "<path d=\"m3 17 6-6 4 4 8-8\"/><path d=\"M15 7h6v6\"/>",
  "trending-down": "<path d=\"m3 7 6 6 4-4 8 8\"/><path d=\"M15 17h6v-6\"/>",
  "trophy": "<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18\"/><path d=\"M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2-1.2.5-2 2-2 3.8M14 14.7V17c0 .6.5 1 1 1.2 1.2.5 2 2 2 3.8\"/><path d=\"M18 2H6v7a6 6 0 0 0 12 0z\"/>",
  "tv": "<rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2.5\"/><path d=\"m7 2 5 5 5-5\"/>",
  "unlock": "<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 7.8-1.2\"/>",
  "upload": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m17 8-5-5-5 5M12 3v12\"/>",
  "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>",
  "user-plus": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20a6.5 6.5 0 0 1 13 0\"/><path d=\"M19 8v6M16 11h6\"/>",
  "users": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20a6.5 6.5 0 0 1 13 0\"/><path d=\"M16 4.6a3.5 3.5 0 0 1 0 6.8\"/><path d=\"M18.5 14.6A6.5 6.5 0 0 1 21.5 20\"/>",
  "utensils": "<path d=\"M5 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M7 12v9\"/><path d=\"M17 21V3c-2 1-3 3.5-3 7v3h3\"/>",
  "video": "<rect x=\"2\" y=\"6\" width=\"14\" height=\"12\" rx=\"2.5\"/><path d=\"m22 8-6 4 6 4z\"/>",
  "virus": "<circle cx=\"12\" cy=\"12\" r=\"5\"/><path d=\"M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M5 19l3.5-3.5M15.5 8.5 19 5\"/>",
  "wallet": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"14\" rx=\"2.5\"/><path d=\"M6 6V5a2 2 0 0 1 2-2h9\"/><path d=\"M15 13h3\"/>",
  "wrench": "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z\"/>",
  "x": "<path d=\"M18 6 6 18M6 6l12 12\"/>",
  "x-circle": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m15 9-6 6M9 9l6 6\"/>",
  "zap": "<path d=\"M13 2 4 14h7l-1 8 9-12h-7z\"/>",
};

export const EMOJI_MAP = {"⚠": "alert", "✕": "x", "✖": "x", "✗": "x", "❌": "x-circle", "✅": "check-circle", "✓": "check", "✔": "check", "☑": "square-check", "💬": "message", "↻": "refresh", "⟳": "refresh", "🔄": "refresh", "♻": "refresh", "🔁": "repeat", "💸": "banknote", "💵": "banknote", "📱": "phone", "📲": "phone", "📞": "phone-call", "🎁": "gift", "👥": "users", "👤": "user", "🙋": "hand", "👋": "hand", "🔒": "lock", "🔓": "unlock", "🔐": "lock", "💼": "briefcase", "💳": "card", "✉": "mail", "📧": "mail", "📋": "clipboard", "🎓": "graduation", "💰": "coins", "🚀": "rocket", "⏳": "hourglass", "📊": "chart", "📈": "chart-up", "📉": "trending-down", "💹": "chart-up", "🎤": "mic", "📍": "pin", "📌": "pin", "🔗": "link", "💡": "bulb", "🏆": "trophy", "🏅": "medal", "★": "star", "⭐": "star", "🤝": "handshake", "⚡": "zap", "🛡": "shield", "📦": "package", "🎉": "sparkle", "🏢": "building", "⏱": "clock", "⏰": "alarm", "📭": "inbox", "📥": "download", "📤": "upload", "🔍": "search", "🔎": "search", "🧊": "snowflake", "🎯": "target", "🎟": "ticket", "📣": "megaphone", "📢": "megaphone", "🎧": "headphones", "🏦": "bank", "🛒": "cart", "✏": "edit", "📝": "note", "🧾": "receipt", "📷": "camera", "📸": "camera", "🎵": "music", "▶": "play", "🐢": "timer", "🌿": "leaf", "■": "stop", "🎬": "film", "🎥": "video", "👀": "eye", "🚫": "ban", "⛔": "ban", "📅": "calendar", "👍": "thumbs-up", "📘": "book", "📒": "book", "👑": "crown", "📎": "paperclip", "👉": "arrow-right", "👆": "pointer", "💚": "tag", "🔥": "trending", "🛠": "wrench", "⚙": "settings", "ℹ": "info", "🗑": "trash", "🧩": "puzzle", "🔑": "key", "🔌": "plug", "🔔": "bell", "➕": "plus", "💾": "save", "🦠": "virus", "😔": "frown", "🗄": "database", "🖼": "image", "🌙": "moon", "⚖": "scale", "⚑": "flag", "💤": "sleep", "🧭": "compass", "🧹": "broom", "🏷": "tag", "❤": "heart", "👁": "eye", "🔖": "bookmark", "🏠": "home", "📚": "book", "🙈": "eye-off", "✨": "sparkle", "🌐": "globe", "🌍": "globe", "🧠": "bulb", "🪙": "coins", "🎫": "ticket", "📄": "note", "🗓": "calendar", "🧑": "user", "🧑‍💻": "user", "🎮": "play", "🧵": "comment", "💯": "check-circle", "⌛": "hourglass", "🕐": "clock", "🔃": "refresh", "🆕": "sparkle", "🏁": "flag", "🧪": "puzzle", "🚨": "alert", "❗": "alert", "❓": "chat-question", "🎲": "puzzle", "💎": "gem", "🫂": "users", "🗂": "clipboard", "📁": "clipboard", "📃": "note", "✍": "edit", "🔀": "repeat", "🙏": "hand", "⬆": "upload", "⬇": "download", "⏸": "stop", "⏹": "stop", "↩": "refresh", "🏭": "building", "📐": "chart", "🧮": "chart", "📆": "calendar", "🗳": "square-check", "🔢": "chart", "💲": "coins", "🤑": "coins", "🛍": "cart", "🏪": "building", "🧑‍🤝‍🧑": "users", "👨‍💻": "user", "👩‍💻": "user", "🚑": "lifebuoy", "🤖": "bot", "✂": "scissors", "🎨": "palette", "🌅": "sunrise", "☀": "sun", "📺": "tv", "📗": "book", "🎂": "gift", "🌱": "leaf", "😂": "smile", "😊": "smile", "🙂": "smile", "😐": "meh", "😴": "sleep", "👌": "thumbs-up", "👇": "arrow-down", "👗": "shirt", "💄": "sparkle", "💪": "dumbbell", "🍲": "utensils", "🍟": "utensils", "💻": "laptop", "🎶": "music", "👨‍👩‍👧": "users", "⚽": "ball", "💇": "scissors", "🥉": "medal", "🥈": "medal", "🥇": "medal", "📬": "mail", "📨": "mail", "📡": "satellite", "🧯": "alert", "🔋": "battery", "🧱": "bricks", "🏛": "landmark", "☁": "cloud", "🧑‍💼": "briefcase"};
export const DOTS = {"🟢": "#22c55e", "🟡": "#facc15", "🔵": "#3b82f6", "🔴": "#ef4444", "🟠": "#f97316", "🟣": "#a855f7"};

// Platform emoji → logo file. Dark pages use the white TikTok/X; coloured
// app-icon tiles (blog .pb-icon) use all-white logos.
const PLATFORM = { '📸': 'instagram', '🎵': 'tiktok', '▶': 'youtube', '✈': 'telegram', '𝕏': 'x' };
const WHITE = { instagram: 'instagram-white', youtube: 'youtube-white', telegram: 'telegram-white', facebook: 'facebook-white', tiktok: 'tiktok', x: 'x' };

const logo = (file) => `<img class="ev-logo" src="/icons/platforms/${file}.svg" alt="" style="width:1em;height:1em;vertical-align:-0.15em;display:inline-block">`;
const icon = (name) => `<svg class=ev-i aria-hidden=true><use href=#ev-${name}></use></svg>`;
const dot  = (c) => `<span style="display:inline-block;width:.62em;height:.62em;border-radius:50%;vertical-align:.05em;background:${c}"></span>`;

const KEYS = [...Object.keys(PLATFORM), ...Object.keys(EMOJI_MAP), ...Object.keys(DOTS)]
  .sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const RX = new RegExp(`(?<![=\\-])>([ \\t]*)(${KEYS.join('|')})\\uFE0F?`, 'gu');
const SKIP_TAGS = new Set(['title', 'option', 'textarea', 'script', 'style']);

function tagBefore(html, i) {
  const j = html.lastIndexOf('<', i);
  const m = /^<\/?([a-zA-Z0-9-]+)/.exec(html.slice(j, j + 40));
  return { name: m ? m[1].toLowerCase() : '', open: html.slice(j, i + 1) };
}

// Blog post thumbnails are data in a <script>: thumb: "🎵". They sit on
// coloured gradients, so platforms use their all-white logos.
const THUMB_RX = new RegExp(`((?:thumb|icon):\\s*)(["'])(${KEYS.join('|')})\\uFE0F?\\2`, 'gu');
// thumbnails converted by an earlier version (coloured logos) → white
const THUMB_LOGO_RX = /(thumb:\s*')<img class="ev-logo" src="\/icons\/platforms\/(instagram|youtube|telegram|facebook)\.svg"/g;
const VS16 = /️/g;

// Emoji anywhere in visible text (not only right after a tag). Typographic
// marks (★ ratings, ✓ ✕) are left alone: they're plain glyphs, not emoji.
const TYPO = new Set(['★', '☆', '✓', '✔', '✕', '✗', '✖']);
const TEXT_KEYS = KEYS.filter(k => !TYPO.has(k));
const ANY_RX = new RegExp(`(\\s?)(${TEXT_KEYS.join('|')})\\uFE0F?(\\s?)`, 'gu');
// Strings inside page scripts: drop a decorative emoji at the start or end
// of a label ("📲 Start this month →", "Ready to go viral? 🚀").
const STR_LEAD_RX = new RegExp(`(["'\`])(?:${TEXT_KEYS.join('|')})\\uFE0F?\\s+`, 'gu');
const STR_TRAIL_RX = new RegExp(`\\s+(?:${TEXT_KEYS.join('|')})\\uFE0F?(["'\`])`, 'gu');

// quote-free logo, safe inside any JS string
const logoBare = (file) => `<img class=ev-logo src=/icons/platforms/${file}.svg alt style=width:1em;height:1em;vertical-align:-.15em;display:inline-block>`;
const dotBare  = (c) => `<span style=display:inline-block;width:.62em;height:.62em;border-radius:50%;vertical-align:.05em;background:${c}></span>`;

function iconFor(key, used, white, bare) {
  if (PLATFORM[key]) return (bare ? logoBare : logo)(white ? WHITE[PLATFORM[key]] : PLATFORM[key]);
  if (DOTS[key]) return (bare ? dotBare : dot)(DOTS[key]);
  if (DOTS[key]) return dot(DOTS[key]);
  used.add(EMOJI_MAP[key]);
  return icon(EMOJI_MAP[key]);
}

// Replace emoji in every text node of an HTML string (script/style already held out).
function iconifyText(html, used, bare = false) {
  return html.replace(/>([^<]+)</g, (m, text, offset, str) => {
    ANY_RX.lastIndex = 0; ANY_EMOJI_RX.lastIndex = 0;
    if (!ANY_RX.test(text) && !ANY_EMOJI_RX.test(text)) return m;
    ANY_RX.lastIndex = 0; ANY_EMOJI_RX.lastIndex = 0;
    const t = tagBefore(str, offset);
    if (t.name === 'pre' && /ev-keep/.test(t.open)) return m;   // copyable examples keep their emoji
    if (SKIP_TAGS.has(t.name) && !(bare && t.name === 'script')) {
      // can't hold markup here: just drop the emoji
      return '>' + text.replace(ANY_RX, (x, a, e, b) => (a && b ? ' ' : a || b)) + '<';
    }
    const white = /class="pb-icon"/.test(t.open);
    const trimmed = text.trimEnd();
    const out = text.replace(ANY_RX, (x, a, e, b, pos) => {
      const key = e.replace(VS16, '');
      return a + iconFor(key, used, white, bare) + (b ? ' ' : '');
    }).replace(ANY_EMOJI_RX, e => (/^[ \t]/.test(e) ? ' ' : '') + fallbackIcon(e, used, bare));
    return '>' + out + '<';
  });
}

const EV_CSS = '.ev-i{width:1.1em;height:1.1em;display:inline-block;vertical-align:-0.18em;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}'
  + '.blog-card-thumb,.suggested-thumb{color:#fff}';   // thumbnails are links: keep their icons white

// Last pass, only for places that can't hold an icon (titles, meta tags, alt
// text, JSON-LD, plain script strings): emoji are left out there. Visible
// text has already been turned into icons above. Plain typographic marks
// stay: ✓ ✕ ✗ ★ ☆, © ® ™ and arrows.
const KEEP_MARKS = '©®™★☆✓✕✗';
const ANY_EMOJI_RX = new RegExp(
  `[ \\t]?(?:\\p{Regional_Indicator}{1,2}|(?![${KEEP_MARKS}\\u2190-\\u21FF])\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}\\uFE0F?)*\\uFE0F?|[\\u{1F3FB}-\\u{1F3FF}])`, 'gu');
// Emoji without their own icon still become an icon: 🇰🇪 as a small Kenyan
// flag, any other flag as the flag icon, anything else as the sparkle icon.
function fallbackIcon(e, used, bare) {
  const k = e.trim().replace(/[\uFE0F\u200D]/g, '');
  if (k === '\u{1F1F0}\u{1F1EA}') return bare
    ? '<img class=ev-flag src=/icons/flags/ke.svg alt=Kenya style=width:1.35em;height:.9em;vertical-align:-.1em;border-radius:2px>'
    : '<img class="ev-flag" src="/icons/flags/ke.svg" alt="Kenya" style="width:1.35em;height:.9em;vertical-align:-.1em;border-radius:2px">';
  const name = /\p{Regional_Indicator}/u.test(k) ? 'flag' : 'sparkle';
  used.add(name);
  return icon(name);
}
export function stripEmoji(html) {
  return html.replace(ANY_EMOJI_RX, '').replace(/️/g, '').replace(/(<\/svg>|>)‍/g, '$1');
}

export function iconify(html) {
  html = html.replace(THUMB_LOGO_RX, (m, a, slug) => `${a}<img class="ev-logo" src="/icons/platforms/${slug}-white.svg"`);
  const used = new Set();
  // keep <script>/<style> blocks out of the main pass
  const held = [];
  let out = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (blk) => {
    const fixed = blk.replace(THUMB_RX, (m, a, q, e) => {
      const key = e.replace(VS16, '');
      if (PLATFORM[key]) return `${a}'${logo(WHITE[PLATFORM[key]])}'`;
      if (EMOJI_MAP[key]) { used.add(EMOJI_MAP[key]); return `${a}'${icon(EMOJI_MAP[key])}'`; }
      return m;
    });
    const tidy = /^<script\b(?![^>]*application\/ld\+json)/i.test(fixed)
      ? iconifyText(fixed, used, true) : fixed;
    held.push(tidy); return `\u0000${held.length - 1}\u0000`;
  });
  out = iconifyText(out, used).replace(/(<\/svg>|>)\u200d/g, '$1');
  out = out.replace(/\u0000(\d+)\u0000/g, (m, n) => held[+n]);
  out = stripEmoji(out);
  // icons already on the page from an earlier run
  for (const m of out.matchAll(/href=#ev-([a-z-]+)>/g)) used.add(m[1]);
  out = out.replace(/<svg id="ev-sprite"[\s\S]*?<\/svg>\n?/, '');
  if (used.size) {
    const sprite = `<svg id="ev-sprite" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${
      [...used].sort().map(n => `<symbol id="ev-${n}" viewBox="0 0 24 24">${ICONS[n]}</symbol>`).join('')}</defs></svg>\n`;
    out = out.replace(/(<body[^>]*>\n?)/i, `$1${sprite}`);
    // (re)write the icon styles, so a newer version of this script updates them
    out = out.replace(/<style>\/\* ev-icons \*\/[^<]*<\/style>\n?/, '');
    out = out.replace('</head>', `<style>/* ev-icons */${EV_CSS}</style>\n</head>`);
  }
  return out;
}
