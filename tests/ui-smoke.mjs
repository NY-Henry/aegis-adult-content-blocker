import { strict as assert } from "node:assert";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { build, preview } from "vite";

// Pass a temporary Playwright installation as the first argument if needed.
const { chromium } = process.argv[2] ? await import(pathToFileURL(process.argv[2]).href) : await import("playwright");
// Build the test page first: slow dependency optimization must not consume the
// browser's navigation timeout. The shipped app's entry remains unchanged.
await build({ build: { outDir: "artifacts/ui-preview-build", rollupOptions: { input: "tests/ui-preview.html" } }, clearScreen: false });
const server = await preview({ build: { outDir: "artifacts/ui-preview-build" }, preview: { host: "127.0.0.1", port: 1421, strictPort: true } });
const browser = await chromium.launch({ headless: true, executablePath: process.env.AEGIS_BROWSER_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1120, height: 850 } });
page.setDefaultNavigationTimeout(60000);
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const output = "artifacts";
await mkdir(output, { recursive: true });
const open = async query => {
  await page.goto("http://127.0.0.1:1421/tests/ui-preview.html" + (query || ""));
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  await page.getByRole("button", { name: "Request pause", exact: true }).waitFor();
};
try {
  await open("");
  assert.equal(await page.getByText("3 of 4 protection layers enabled.", { exact: false }).count(), 1);
  await page.screenshot({ path: output + "/overview.png", fullPage: true });
  await page.getByRole("button", { name: "Request pause", exact: true }).click();
  await page.getByText("Pause available in", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await page.getByRole("button", { name: "Request pause", exact: true }).waitFor();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Window monitoring", exact: true }).check();
  await page.getByText("Unsaved changes", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard unsaved changes?" }).waitFor();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByText("Settings saved.", { exact: true }).waitFor();
  assert.equal(await page.getByText("Unsaved changes", { exact: true }).count(), 0);
  await page.screenshot({ path: output + "/settings.png", fullPage: true });
  await page.getByRole("button", { name: "Blocked sites", exact: true }).click();
  await page.getByRole("textbox", { name: "Website to block" }).fill("youtube.com");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByRole("alert").filter({ hasText: "YouTube" }).waitFor();
  await page.getByRole("searchbox", { name: "Search blocked sites" }).fill("blocked");
  assert.equal(await page.getByRole("button", { name: "Remove blocked.example.com", exact: true }).count(), 1);
  assert.equal(await page.getByRole("button", { name: "Remove example.com", exact: true }).count(), 0);
  await page.getByRole("searchbox", { name: "Search blocked sites" }).fill("");
  await page.screenshot({ path: output + "/blocked-sites.png", fullPage: true });
  await page.getByRole("button", { name: "Quit Aegis Guard", exact: true }).click();
  await page.getByRole("dialog", { name: "Quit Aegis Guard?" }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);

  await open("?pin");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Window monitoring", exact: true }).check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  const pinDialog = page.getByRole("dialog", { name: "Enter your PIN" });
  await pinDialog.waitFor();
  assert.equal(await page.getByText("Settings saved.", { exact: true }).count(), 0);
  await pinDialog.getByLabel("Enter security PIN").fill("0000");
  await pinDialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByText("Invalid security PIN", { exact: true }).waitFor();
  await pinDialog.getByLabel("Enter security PIN").fill("1234");
  await pinDialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByText("Settings saved.", { exact: true }).waitFor();

  await open("?pin&save-error");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Window monitoring", exact: true }).check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Enter security PIN").fill("1234");
  await page.getByRole("dialog").getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByText("Settings could not be applied", { exact: true }).waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.getByText("Settings saved.", { exact: true }).count(), 0);
  await page.getByText("Unsaved changes", { exact: true }).waitFor();

  await open("?restricted&pin");
  await page.getByRole("button", { name: "Restore YouTube", exact: true }).click();
  const repair = page.getByRole("dialog", { name: "Restore YouTube browser settings?" });
  await repair.waitFor();
  await repair.getByRole("button", { name: "Restore YouTube", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Enter security PIN").fill("1234");
  await page.getByRole("dialog").getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Restore YouTube", exact: true }).waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(() => window.__qa.calls.some(call => call.command === "restore_youtube" && call.args.pin === "1234")), true);

  await open("?nonadmin");
  await page.getByRole("button", { name: "Blocked sites", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Sync blocklist", exact: true }).isDisabled(), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({ path: output + "/mobile.png", fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.setViewportSize({ width: 960, height: 680 });
  await open("?unknown-policy&slow-save");
  await page.getByText("Couldn't inspect the current YouTube browser policy.", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Window monitoring", exact: true }).check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Overview", exact: true }).isDisabled(), true);
  await page.getByText("Settings saved.", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Overview", exact: true }).isDisabled(), false);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({ path: output + "/desktop-small.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("UI smoke checks passed: navigation, cooldown, unsaved edits, PIN retry/cancel, YouTube repair, rule errors, admin gating, and mobile overflow.");
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
