require("dotenv").config();

const { MongoClient, ObjectId } = require("mongodb");

const client = new MongoClient(process.env.DB_URI);

(async () => {
  try {
    await client.connect();

    const db = client.db("users");
    const col = db.collection('timers');
    const a = await col.findOne({isActive: false});
    // const res = await db.collection("users").find({}).toArray();
    console.log(a);
  } catch (err) {
    console.error(err);
  }

  await client.close();
})();
