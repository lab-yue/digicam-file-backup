import puppeter from "puppeteer";
import axios from "axios";
import path from "path";
import fs from "fs";

type DC_File = {
  name: string;
  url: string;
};

const URL = {
  LOGIN: "https://dh.force.com/digitalCampus/CampusLogin",
  INFO: "https://dh.force.com/digitalCampus/CampusDeliveryList?displayType=103"
};

const getLocalFiles = () =>
  new Promise<string[]>(ok => {
    fs.readdir(path.resolve(__dirname, "../downloads"), (err, files) => {
      ok(files);
    });
  });

async function sleep(sec: number) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000));
}

async function login(__DEV__: boolean) {
  const { DC_NAME, DC_PASSWORD } = process.env;

  if (!DC_NAME || !DC_PASSWORD) {
    throw new Error("Please check your config");
  }

  const browser = await puppeter.launch({
    headless: false,
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  await page.goto(URL.LOGIN);

  const fields = await page.$$(".loginInput");
  if (fields.length !== 2) {
    throw new Error("Not found");
  }

  await fields[0].type(DC_NAME);
  await fields[1].type(DC_PASSWORD);

  await page.click(".loginBtn");
  await page.waitForNavigation();
  console.log(`logining`);

  async function exposeHelpers(page: puppeter.Page) {
    await page.evaluate(() => {
      (window as any).helpers = {
        getClickURL(raw: string | null) {
          if (!raw) {
            return null;
          }
          const parts = raw.split("'");

          if (parts.length !== 3) {
            return null;
          }
          return "https://dh.force.com" + parts[1];
        }
      };
    });
  }

  async function getInfoList() {
    console.log(`geting FS List`);
    const page = await browser.newPage();
    await page.goto(URL.INFO);
    await exposeHelpers(page);

    const infoList = await page.$$eval("tbody tr + tr", rows => {
      return rows.map(row => {
        const link = (window as any).helpers.getClickURL(
          row.getAttribute("onclick")
        );
        const cells = Array.from(row.getElementsByTagName("td")).map(cell =>
          cell.innerHTML.trim()
        );
        return {
          catagroy: cells[0],
          date: cells[1],
          property: cells[2],
          title: cells[3],
          sender: cells[4],
          status: cells[5],
          link
        };
      });
    });
    return infoList;
  }

  const handlePage = async (url: string) => {
    const page = await browser.newPage();
    await page.goto(url);
    console.log(`AT ${url}`);

    async function download(file: DC_File) {
      const filePath = path.resolve(__dirname, "../downloads", file.name);
      const writer = fs.createWriteStream(filePath);
      const cookies = await page.cookies();
      const Cookie = cookies.map(c => `${c.name}=${c.value}`).join("; ");
      console.log({ Cookie });
      const response = await axios({
        url: file.url,
        method: "GET",
        responseType: "stream",
        headers: {
          Cookie
        }
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    }

    const data = await page.$$eval(".infoBody td", tds => {
      const maybeFiles = tds.pop();

      const [
        info,
        date,
        type,
        available,
        attribute,
        _,
        __,
        title,
        ___,
        body
      ] = tds.map(td => (td.textContent || "").trim());

      const files = maybeFiles ? maybeFiles.querySelectorAll("a") : [];

      const fileLinks = Array.from(files).map(a => ({
        name: a.textContent || title,
        url: a.href
      }));

      return {
        info,
        date,
        type,
        available,
        attribute,
        title,
        body,
        fileLinks
      };
    });
    const localFiles = await getLocalFiles();
    console.log(localFiles);
    await Promise.all(
      data.fileLinks
        .filter(file => {
          if (localFiles.includes(file.name)) {
            console.log(`${file.name} skip`);
            return false;
          }
          return true;
        })
        .map(async file => {
          console.log(`${file.name} start`);
          await download(file);
          console.log(`${file.name} done`);
        })
    );
    await page.close();
    //await Promise.all(urls.map(async url => {}));
  };

  async function getFiles(urls: string[]) {
    for (let url of urls) {
      await handlePage(url);
    }
  }

  async function close() {
    await browser.close();
  }
  return { browser, getInfoList, getFiles, close };
}
export default { login, sleep };
