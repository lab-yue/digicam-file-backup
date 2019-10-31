import pptr from "./pptr";
import notify from "./notify";
import * as dotenv from "dotenv";

dotenv.config();
const { __DEV__ } = process.env;

(async () => {
  const digicam = await pptr.login();
  const fsListBefore = await digicam.getFSList();
  const now = new Date();
  const shouldAnwser = fsListBefore.filter(fs => {
    return fs.status !== "回答済" && new Date(fs.deadline) > now;
  });

  let text = `回答が必要なFSはないよ`;

  if (shouldAnwser.length) {
    await Promise.all(shouldAnwser.map(fs => digicam.fillFS(fs.url)));

    const fsListAfter = await digicam.getFSList();

    const answered = fsListAfter.filter(fsAfter => {
      const fsBefore = fsListBefore.find(
        fsBefore => fsBefore.url === fsAfter.url
      );
      if (fsBefore) {
        return fsBefore.status !== fsAfter.status;
      }
    });

    if (answered.length) {
      text = answered
        .map(fs => `${fs.date} ${fs.time} ${fs.subject}のFSを回答したよ`)
        .join("\n");
    }
  } else {
    text = `FSをチェックしたけど何もしなかった`;
  }
  if (!__DEV__) {
    await digicam.close();
    console.log(`sending "${text}"`);
    notify.slack(text);
  }
})();
