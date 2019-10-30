import puppeter from "puppeteer";
import { FS } from "../index";
const URL = {
  LOGIN: "https://dh.force.com/digitalCampus/CampusLogin",
  FS: "https://dh.force.com/digitalCampus/CampusDeliveryList?displayType=106"
};

async function sleep(sec: number) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000));
}

async function login() {
  const { DC_NAME, DC_PASSWORD } = process.env;

  if (!DC_NAME || !DC_PASSWORD) {
    throw new Error("Please check your config");
  }

  const browser = await puppeter.launch({
    headless: true,
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
        },
        fillFS() {
          console.log("filling fs~");
          const defaultOptions = {
            name: "新規プリセット",
            q1: "1",
            q2: "5",
            q3: "8",
            q4: "12",
            text1: "特にありません",
            text2: "特にありません"
          };
          const preset = defaultOptions;
          const selectorAnswers = [preset.q1, preset.q2, preset.q3, preset.q4];
          const textboxs = document.querySelectorAll("textarea");
          const next = document.querySelector(".btnNext");
          const selectors = Array.from(document.querySelectorAll("input"));

          if (textboxs) {
            textboxs[0].textContent = preset.text1;
            textboxs[1].textContent = preset.text2;
          }

          if (selectors.length) {
            selectorAnswers.map(i => selectors[parseInt(i, 10)].click());
          }

          if (next) {
            // @ts-ignore
            next.click();
            setTimeout(() => {
              const next = document.querySelector(".btnNext");
              window.confirm = () => true;
              // @ts-ignore
              next.click();
            }, 1000);
          }
        }
      };
    });
  }

  async function getFSList() {
    console.log(`geting FS List`);
    const page = await browser.newPage();
    await page.goto(URL.FS);
    await exposeHelpers(page);

    const FSList: FS[] = await page.$$eval("tbody tr + tr", rows => {
      return rows.map(row => {
        const url: string = (window as any).helpers.getClickURL(
          row.getAttribute("onclick")
        );
        const cells = Array.from(row.getElementsByTagName("td")).map(cell =>
          cell.innerHTML.trim()
        );

        return {
          date: cells[0],
          subject: cells[1],
          time: cells[2],
          deadline: cells[3],
          status: cells[4],
          url
        };
      });
    });
    return FSList;
  }

  async function fillFS(url: string) {
    console.log(`filling FS`);
    const page = await browser.newPage();
    await page.goto(url);
    await exposeHelpers(page);
    await page.evaluate(() => {
      (window as any).helpers.fillFS();
    });
  }

  async function close() {
    await browser.close();
  }
  return { browser, getFSList, fillFS, close };
}
export default { login, sleep };
