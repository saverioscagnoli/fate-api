import { request } from "undici";
import * as cheerio from "cheerio";

async function form$(url: string) {
  let res = await request(url, { method: "GET" });
  let html = await res.body.text();
  return cheerio.load(html);
}

export { form$ };
