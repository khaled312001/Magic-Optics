import "server-only";
import type { Browser } from "puppeteer-core";

const LOCAL_EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core");
  let browser: Browser;

  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || LOCAL_EDGE_PATH,
      headless: true,
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const heightPx = await page.evaluate(() => document.documentElement.scrollHeight);
    const heightMm = Math.ceil((heightPx * 25.4) / 96) + 2;

    const pdf = await page.pdf({
      width: "210mm",
      height: `${heightMm}mm`,
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
      pageRanges: "1",
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
