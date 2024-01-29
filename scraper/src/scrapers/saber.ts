import { Url, form$ } from "@lib";

async function scrape() {
  let $ = await form$(Url.SaberList);

  let trs = $("table").eq(2).find("tr").toArray();

  trs = trs.filter((_, i) => i % 2 !== 0);

  trs.forEach(tr => {
    console.log($(tr).find("td").text());
  });
}

export { scrape as saber };
