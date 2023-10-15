require("dotenv").config();
const crypto = require("crypto");
const { ObjectId } = require("mongodb");

const hash = (d) => crypto.createHash("sha256").update(d).digest("hex");

async function getUserData(db, username) {
  return await db.collection("users").findOne({ username });
}

async function getUserDataBySessionId(db, sessionId) {
  const userId = await db.collection("sessions").findOne(
    {
      _id: new ObjectId(sessionId),
    },
    {
      projection: { userId: 1 },
    }
  );
  if (!userId) {
    return;
  }
  return await db.collection("users").findOne({ _id: userId.userId });
}

async function createSession(db, userId) {
  const res = await db.collection("sessions").insertOne({ userId });
  return res.insertedId;
}

async function deleteSession(db, sessionId) {
  await db.collection("sessions").deleteOne({ sessionId });
}

const auth = () => async (req, res, next) => {
  if (!req.cookies["sessionId"]) {
    return next();
  }
  req.user = await getUserDataBySessionId(req.db, req.cookies["sessionId"]);
  req.sessionId = req.cookies["sessionId"];
  next();
};

async function createUser(db, username, password) {
  const res = await db.collection("users").insertOne(
    {
      username,
      password: hash(password),
    },
    {
      projection: { _id: 1 },
    }
  );
  return res.insertedId;
}

module.exports = {
  getUserData,
  createSession,
  deleteSession,
  auth,
  hash,
  createUser,
};
