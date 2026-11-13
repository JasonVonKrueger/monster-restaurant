// Renders the SVG sources in artwork/svg to the PNGs the game loads.
// Uses headless Chrome; set CHROME to its binary if it is not in the default macOS location.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MONSTERS } from "../shared/monsters.js";

const chrome =
  process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const root = fileURLToPath(new URL("..", import.meta.url));
const jobs = [
  // [source, output, width, height, transparent]
  [
    "artwork/svg/pip-sheet.svg",
    "client/public/assets/monsters/pip/sheet.png",
    1840,
    500,
    true,
  ],
  ...MONSTERS.map(({ id }) => [
    `artwork/svg/${id}-sheet.svg`,
    `client/public/assets/monsters/${id}/sheet.png`,
    2800,
    400,
    true,
  ]),
  [
    "artwork/svg/menu-sheet.svg",
    "client/public/assets/props/menu.png",
    400,
    150,
    true,
  ],
  [
    "artwork/svg/kitchen-back.svg",
    "client/public/assets/backgrounds/kitchen-back.png",
    540,
    800,
    false,
  ],
  [
    "artwork/svg/kitchen-front.svg",
    "client/public/assets/backgrounds/kitchen-front.png",
    540,
    800,
    true,
  ],
  [
    "artwork/svg/dining-back.svg",
    "client/public/assets/backgrounds/dining-back.png",
    540,
    800,
    false,
  ],
  [
    "artwork/svg/dining-front.svg",
    "client/public/assets/backgrounds/dining-front.png",
    540,
    800,
    true,
  ],
];

for (const [source, output, width, height, transparent] of jobs) {
  // Chrome writes nothing, without an error, if the folder is missing.
  mkdirSync(dirname(`${root}${output}`), { recursive: true });
  rmSync(`${root}${output}`, { force: true });
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      ...(transparent ? ["--default-background-color=00000000"] : []),
      `--window-size=${width},${height}`,
      `--screenshot=${root}${output}`,
      `file://${root}${source}`,
    ],
    { stdio: "ignore" },
  );
  if (!existsSync(`${root}${output}`))
    throw new Error(`Chrome did not write ${output}`);
  console.log(`${source} → ${output}`);
}
