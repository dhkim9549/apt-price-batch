import { open, appendFile } from "node:fs/promises";
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
  let failCnt = 0;

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

    await appendFile('r-list-output.txt', "\n" + w[0], 'utf8');

    if(apt.hsTynm != '아파트') continue;

    const addr_w = apt.addr.split(",");
    if(addr_w.length <= 1) continue;

    let aptNm = addr_w[addr_w.length - 1].slice(0, -1);

    const stnm_addr_w = addr_w[0].split(" ");

    const stnmAddr2 = stnm_addr_w[stnm_addr_w.length - 2] + " " + stnm_addr_w[stnm_addr_w.length - 1];
    apt.stnmAddr2 = stnmAddr2;

    const dongho_w = addr_w[1].split(" ");

    let dongNm = '', dongNm2 = '';
    let hoNm = '', hoNm2 = '';

    for(const wt of dongho_w) {
      if(dongNm == "" && wt.endsWith("동") && !wt.startsWith("(")) {
        dongNm = wt;
        dongNm = dongNm.replaceAll(/[동()]/g, "");
        dongNm2 = dongNm + "동";
      }
      if(hoNm == "" && wt.endsWith("호")) {
        hoNm = wt;
        hoNm = hoNm.replaceAll(/[호()]/g, "");
        hoNm2 = hoNm + "호";
      }
    }

    console.log("\n\n\n\n\n");
    console.log({i, s, aptNm, stnmAddr2, dongNm, hoNm});

    let aptPrcAr = await collection.find({
      stnmAddr2: stnmAddr2,
      dongNm: { $in: [dongNm, dongNm2] },
      hoNm: { $in: [hoNm, hoNm2] }
    }).toArray();

    if(aptPrcAr.length > 1) {
      console.log(aptPrcAr);
      aptPrcAr = aptPrcAr.filter((element) => element.aptNm.indexOf(aptNm.slice(0, 2)) >= 0);
    }

    if(aptPrcAr.length == 0) {
      aptPrcAr = await collection.find({
        stnmAddr2: stnmAddr2,
        hoNm: { $in: [hoNm, hoNm2] }
      }).toArray();
      if(aptPrcAr.length > 0) console.log("flag 1");
    }

    if(aptPrcAr.length != 1 && hoNm != "") {
      aptPrcAr = await collection.find({
        stnmAddr2: stnmAddr2,
        dongNm: { $regex: dongNm, $options: "i" },
        hoNm: { $in: [hoNm, hoNm2] }
      }).toArray();
      if(aptPrcAr.length > 0) console.log("flag 2");
    }

    if(aptPrcAr.length != 1 && hoNm != "") {
      aptPrcAr = await collection.find({
        stnmAddr2: stnmAddr2,
        dongNm: { $in: [dongNm, dongNm2] },
        hoNm: { $regex: hoNm, $options: "i" }
      }).toArray();
      if(aptPrcAr.length > 0) console.log("flag 3");
    }

    if(aptPrcAr.length != 1 && hoNm != "") {
      aptPrcAr = await collection.find({
        stnmAddr2: stnmAddr2,
        dongNm: { $regex: dongNm, $options: "i" },
        hoNm: { $regex: hoNm, $options: "i" }
      }).toArray();
      if(aptPrcAr.length > 0) console.log("flag 4");
    }

    if(aptPrcAr.length != 1 && hoNm != "") {
      aptPrcAr = await collection.find({
        stnmAddr2: stnmAddr2,
        hoNm: { $regex: hoNm, $options: "i" }
      }).toArray();
      if(aptPrcAr.length > 0) console.log("flag 5");
    }

    console.log("aptPrcAr.length = " + aptPrcAr.length);

    let price = "";
 
    if(aptPrcAr.length == 1) {
      price = aptPrcAr[0].price;
    } else {
      failCnt++;
    }

    await appendFile('r-list-output.txt', "," + price, 'utf8');

    if (i % 1 == 0) {
      console.log({failCnt});
      console.log({aptNm});
      console.log({dongho_w});
      console.log("apt = " + JSON.stringify(apt, null, 2));
      console.log("aptPrcAr = " + JSON.stringify(aptPrcAr, null, 2));
      console.log(new Date());
    }
  }

  client.close();

  return "done.";
}
