import { request } from "undici";
import * as cheerio from "cheerio";
import path from "path";
import { findMarker } from "find-marker";

async function form$(url: string) {
  let res = await request(url, { method: "GET" });
  let html = await res.body.text();
  return cheerio.load(html);
}

function apiPath(fileName: string) {
  return path.join(findMarker()!, "api", "data", fileName);
}

export { form$, apiPath };
