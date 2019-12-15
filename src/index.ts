import pptr from "./pptr";
import notify from "./notify";
import * as dotenv from "dotenv";

dotenv.config();
const { __DEV__ } = process.env;

(async () => {
  const digicam = await pptr.login(!!__DEV__);
  const infoList = await digicam.getInfoList();
  await digicam.getFiles(infoList.map(info => info.link));

  //console.log(infoList);
  if (!__DEV__) {
    await digicam.close();
    //console.log(`sending "${text}"`);
    //await Promise.all([notify.slack(text), notify.discord(text)]);
  }
})();
