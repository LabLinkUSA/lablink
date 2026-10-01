import { expect, test } from "@playwright/test";
import path from "node:path";

import { gotoSettled } from "./helpers";

const EXPORT = "file://" + path.resolve(__dirname, "../../docs/design/homepage-redesign/export.html");

test("signed-out homepage matches the design export", async ({ page }, info) => {
  const target = process.env.HOME_BASELINE ? EXPORT : "/";
  await gotoSettled(page, target);
  await expect(page).toHaveScreenshot(`home-${info.project.name}.png`, {
    fullPage: true,
    animations: "disabled",
    maxDiffPixels: 0,
  });
});
