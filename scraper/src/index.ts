import { saber } from "@scrapers";

Promise.all([saber()]).then(() => console.log("Done!"));
