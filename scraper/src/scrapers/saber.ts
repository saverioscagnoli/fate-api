import { Url, form$ } from "@lib";
import * as cheerio from "cheerio";
import { CSV } from "csv-rw";
import { findMarker } from "find-marker";
import path from "path";

async function scrape(): Promise<void> {
  const csvs = {
    names: new CSV({
      path: path.join(findMarker()!, "api", "data", "names.csv"),
      headers: ["n:id", "s:name", "s:jpName"],
      deletePrevious: true
    })
  };

  let $ = await form$(Url.SaberList);

  let hrefs = getAllUrls($);

  for (let i = 0; i < hrefs.length; i++) {
    let href = hrefs[i];

    let servant = await scrapeServant(Url.Base + href);

    csvs.names.store({
      id: i + 1,
      name: servant.name,
      jpName: servant.jpName
    });
  }

  await csvs.names.flush();
}

function getAllUrls($: cheerio.CheerioAPI): string[] {
  let urls: string[] = [];
  let trs = $("table").eq(2).find("tr").toArray();
  let odds = trs.filter((_, i) => i % 2 !== 0);

  odds.forEach(tr => {
    let tds = $(tr).find("td").toArray();

    tds.forEach(td => {
      let a = $(td).find("a").eq(0);
      let url = a.attr("href");

      if (url) urls.push(url);
    });
  });

  return urls;
}

async function scrapeServant(url: string) {
  let $ = await form$(url);
  let stars = getStars($);
  let name = getName($);
  let jpName = getJapaneseName($);
  let aliases = getAliases($);

  return {
    stars,
    name,
    jpName,
    aliases
  };
}

function getName($: cheerio.CheerioAPI): string {
  return $(".ServantInfoName").text().trim();
}

function getStars($: cheerio.CheerioAPI): number {
  let stars = $(".ServantInfoStars").text().trim().replace(/ /g, "");
  return stars.length;
}

function getJapaneseName($: cheerio.CheerioAPI): string {
  return $(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim() === "Japanese Name:")
    .next()
    .text()
    .trim();
}

function getAliases($: cheerio.CheerioAPI) {
  let el = $(".ServantInfoMain").find("*[title='Also Known As']");

  if (!el.text()) return null;

  return el
    .parent()
    .text()
    .trim()
    .replace(/\(.*?\)/g, "")
    .replace("AKA:AKA:Also Known As", "")
    .split(",")
    .map(s => s.trim());
}

export { scrape as saber };
