import { open } from "node:fs/promises";
import { MongoClient } from "mongodb";
import "dotenv/config";

main();

async function main() {
  console.log("start main...");
  console.log(process.argv);
  let fileNm = process.argv[2] ?? 'input-file.csv';
  await insertPrc(fileNm);
}

async function insertPrc(fileNm) {
  console.log("fileNm = " + fileNm);

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log("Connected successfully to server");
  const db = client.db("dbApt");
  const collection = db.collection("colAptPrc");

  const file = await open(fileNm);
  let i = 0;
  for await (const line of file.readLines()) {
    i++;
    if (line.startsWith('보증번호')) {
      continue;
    }

    let s = new String(line);
    s = s.replaceAll('"|', "|");
    s = s.replaceAll('|"', "|");

    const w = s.split("|");
    let apt = {};
    apt.addr = w[2];
    apt.hsTynm = w[5];

    if(apt.hsTynm != '아파트') continue;

    const addr_w = apt.addr.split(",");
    if(addr_w.length <= 1) continue;

    const stnm_addr_w = addr_w[0].split(" ");

    const stnmAddr2 = stnm_addr_w[stnm_addr_w.length - 2] + " " + stnm_addr_w[stnm_addr_w.length - 1];
    apt.stnmAddr2 = stnmAddr2;

    const dongho_w = addr_w[1].split(" ");

    let dongNm = '';
    let hoNm = '';

    for(let i = 1; i <= 2; i++) {
      let wt = dongho_w[i];
      if(wt == undefined) continue;
      if(wt.endsWith("동")) {
        dongNm = wt;
      }
      if(wt.endsWith("호")) {
        hoNm = wt;
      }
    }

    let aptPrcAr = await collection.find({
      stnmAddr2: stnmAddr2,
      $or: [
        { dongNm: dongNm },
        { dongNm: dongNm.substring(0, dongNm.length - 1)}
      ],
      hoNm: hoNm.substring(0, hoNm.length - 1)
    }).toArray();;

    if(aptPrcAr.length == 1) continue;

    if (i % 1 == 0) {
      console.log("i = " + i);
      console.log(s);
      console.log("apt = " + JSON.stringify(apt, null, 2));
      console.log("aptPrcAr = " + JSON.stringify(aptPrcAr, null, 2));
      console.log(new Date());
    }
  }

  client.close();

  return "done.";
}
