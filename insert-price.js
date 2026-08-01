import { open } from "node:fs/promises";
import { MongoClient } from "mongodb";
import "dotenv/config";

main();

async function main() {
  console.log("start main...");
  console.log(process.argv);
  let fileNm = process.argv[2] ?? "origin-2026.csv";
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
    if (line.startsWith('"기준연도"')) {
      continue;
    }

    let s = new String(line);
    s = line.substring(1, s.length - 1);
    s = s.replaceAll('"|"', "|");
    const w = s.split("|");
    let apt = {};
    apt.basisYr = w[0];
    apt.basisMm = w[1];
    apt.dongCd = w[2];
    apt.stnmAddr = w[3];
    apt.city = w[4];
    apt.sggu = w[5];
    apt.epmn = w[6];
    apt.dnri = w[7];
    apt.spcd = w[8];
    apt.bno = w[9];
    apt.buno = w[10];
    apt.aptNm = w[11];
    apt.dongNm = w[12];
    apt.hoNm = w[13];
    apt.area = Number(w[14]);
    apt.price = Number(w[15]);
    apt.bldgMngNo = w[16];
    apt.stnm = w[17];
    apt.bldgBonNo = w[18];
    apt.bldgBuNo = w[19];
    apt.aptCd = w[20];
    apt.dongNmCd = w[21];
    apt.hoNmCd = w[22];
    apt.stnmAddrCd = w[23];

    const w2 = apt.stnmAddr.split(" ");
    apt.stnmAddr2 = w2[w2.length - 2] + " " + w2[w2.length - 1];

    let aptFilter = structuredClone(apt);
    delete aptFilter.price;

    // await collection.updateOne(aptFilter, { $set: apt }, { upsert: true });
    await collection.insertOne(apt);

    if (i % 1000 == 0) {
      console.log("i = " + i);
      console.log(s);
      console.log("apt = " + JSON.stringify(apt, null, 2));
      console.log(new Date());
    }
  }

  client.close();

  return "done.";
}
