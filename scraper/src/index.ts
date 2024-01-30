import { servant } from "@scrapers";

Promise.all([servant()]).then(() => console.log("Done!"));
