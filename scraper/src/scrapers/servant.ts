import { Url, apiPath, form$ } from "@lib";
import { CheerioAPI } from "cheerio";
import { CSV } from "csv-rw";

const data = {
  classes: new CSV({
    path: apiPath("classes.csv"),
    headers: ["n:id", "s:name"]
  }),
  stats: new CSV({
    path: apiPath("stats.csv"),
    headers: ["n:id", "s:name"]
  })
};

const csvs = {
  names: new CSV({
    path: apiPath("servant-names.csv"),
    headers: ["n:id", "s:name", "s:japanese-name"],
    deletePrevious: true
  }),

  stars: new CSV({
    path: apiPath("servant-stars.csv"),
    headers: ["n:id", "n:stars"],
    deletePrevious: true
  }),

  aliases: new CSV({
    path: apiPath("servant-aliases.csv"),
    headers: ["n:id", "s:alias"],
    deletePrevious: true
  }),

  stats: new CSV({
    path: apiPath("servant-stats.csv"),
    headers: ["n:servant-id", "n:stat-id", "n:value", "n:max-value?"],
    deletePrevious: true
  })
};

async function getClassHrefs() {
  let $ = await form$(Url.SaberList);

  let table = $("table").first();
  let trs = table.find("tr").toArray();

  let hrefs: string[] = [];

  for (let tr of trs) {
    let anchors = $(tr).find("a");

    for (let a of anchors) {
      let href = $(a).attr("href");

      if (href && !hrefs.includes(href)) hrefs.push(href);
    }
  }

  return hrefs;
}

function getServantHrefs($: CheerioAPI): string[] {
  let urls: string[] = [];
  let trs = $("table").eq(2).find("tr").toArray();
  let odds = trs.filter((_, i) => i % 2 !== 0);

  for (let tr of odds) {
    let tds = $(tr).find("td").toArray();

    for (let td of tds) {
      let a = $(td).find("a").eq(0);
      let url = a.attr("href");

      if (url) urls.push(url);
    }
  }

  return urls;
}

async function scrape() {
  let hrefs = await getClassHrefs();

  for (let href of hrefs) {
    let $ = await form$(Url.Base + href);
    let servantHrefs = getServantHrefs($);

    for (href of servantHrefs) {
      await scrapeServant(href);
    }
  }

  await csvs.names.flush();
  await csvs.stars.flush();
  await csvs.aliases.flush();
  await csvs.stats.flush();
}

async function scrapeServant(href: string) {
  let $ = await form$(Url.Base + href);

  let id = getID($);

  if (id === 0) return;

  let name = getName($);
  let stars = getStars($);
  let japaneseName = getJapaneseName($);

  let aliases = getAliases($);

  let atk = getAtk($);
  let hp = getHp($);

  let cost = getCost($);

  let starAbsorption = getStarAbsorption($);
  let starGeneration = getStarGeneration($);
  let npChargeAtk = getNPChargeAtk($);
  let npChargeDef = getNPChargeDef($);
  let deathRate = getDeathRate($);

  csvs.names.store({ id, name, "japanese-name": japaneseName });
  csvs.stars.store({ id, stars });

  if (aliases) {
    for (let alias of aliases) {
      csvs.aliases.store({ id, alias });
    }
  }

  let stats = await data.stats.read();

  csvs.stats.store({
    "servant-id": id,
    "stat-id": stats.find(stat => stat.name === "cost")!.id,
    value: cost
  });

  csvs.stats.store({
    "servant-id": id,
    "stat-id": stats.find(stat => stat.name === "attack")!.id,
    value: atk.value,
    "max-value": atk.max
  });

  csvs.stats.store({
    "servant-id": id,
    "stat-id": stats.find(stat => stat.name === "hp")!.id,
    value: hp.value,
    "max-value": hp.max
  });

  csvs.stats.store({
    "servant-id": id,
    "stat-id": stats.find(stat => stat.name === "star-absorption")!.id,
    value: starAbsorption
  });

  csvs.stats.store({
    "servant-id": id,
    "stat-id": stats.find(stat => stat.name === "star-generation")!.id,
    value: starGeneration
  });

  csvs.stats.store({
    "servant-id": id,
    "stat-id": stats.find(stat => stat.name === "np-charge-attack")!.id,
    value: npChargeAtk
  });

  csvs.stats.store({
    "servant-id": id,
    "stat-id": stats.find(stat => stat.name === "np-charge-defense")!.id,
    value: npChargeDef
  });

  csvs.stats.store({
    "servant-id": id,
    "stat-id": stats.find(stat => stat.name === "death-rate")!.id,
    value: deathRate
  });
}

function getID($: CheerioAPI): number {
  return +$(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim() === "ID:")
    .parent()
    .text()
    .replace("ID:", "");
}

function getName($: CheerioAPI): string {
  return $(".ServantInfoName").text().trim();
}

function getJapaneseName($: CheerioAPI): string {
  return $(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim() === "Japanese Name:")
    .next()
    .text()
    .split(";")[0]
    .trim();
}

function getStars($: CheerioAPI): number {
  let stars = $(".ServantInfoStars").text().trim().replace(/ /g, "");
  return stars.length;
}

function getAliases($: CheerioAPI) {
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

function getCost($: CheerioAPI): number {
  return +$(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim().toLowerCase() === "cost:")
    .parent()
    .text()
    .split(" ")
    .at(-1)!;
}

function getAtk($: CheerioAPI): { value: number; max: number } {
  let [min, max] = $(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim().toLowerCase() === "atk:")
    .parent()
    .text()
    .split("/")
    .map(s => +s.replace(/\D/g, ""));

  return { value: min, max };
}

function getHp($: CheerioAPI) {
  let [min, max] = $(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim().toLowerCase() === "hp:")
    .parent()
    .text()
    .split("/")
    .map(s => +s.replace(/\D/g, ""));

  return { value: min, max };
}

function getStarAbsorption($: CheerioAPI): number {
  return +$(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim().toLowerCase() === "star absorption:")
    .first()
    .parent()
    .text()
    .split(" ")
    .at(-1)!;
}

function getStarGeneration($: CheerioAPI): number {
  return +$(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim().toLowerCase() === "star generation:")
    .first()
    .parent()
    .text()
    .split(" ")
    .at(-1)!
    .replace("%", "");
}

function getNPChargeAtk($: CheerioAPI): number {
  return +$(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim().toLowerCase() === "np charge atk:")
    .first()
    .parent()
    .text()
    .split(" ")
    .at(-1)!
    .replace("%", "");
}

function getNPChargeDef($: CheerioAPI): number {
  return +$(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim().toLowerCase() === "np charge def:")
    .first()
    .parent()
    .text()
    .split(" ")
    .at(-1)!
    .replace("%", "");
}

function getDeathRate($: CheerioAPI): number {
  return +$(".ServantInfoMain")
    .find("*")
    .filter((_, el) => $(el).text().trim().toLowerCase() === "death rate:")
    .first()
    .parent()
    .text()
    .split(" ")
    .at(-1)!
    .replace("%", "");
}

export { scrape as servant };
