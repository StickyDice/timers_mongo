const express = require("express");
const bodyParser = require("body-parser");
const nunjucks = require("nunjucks");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const { createSession, getUserData, deleteSession, auth, createUser } = require("./externalFunctions");
const { MongoClient } = require("mongodb");

const clientPromise = MongoClient.connect(process.env.DB_URI);

const app = express();

nunjucks.configure("views", {
  autoescape: true,
  express: app,
  tags: {
    blockStart: "[%",
    blockEnd: "%]",
    variableStart: "[[",
    variableEnd: "]]",
    commentStart: "[#",
    commentEnd: "#]",
  },
});

app.set("view engine", "njk");

app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());
app.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("users");
    next();
  } catch (err) {
    next(err);
  }
});

const hash = (d) => crypto.createHash("sha256").update(d).digest("hex");

app.get("/", auth(), (req, res) => {
  res.render("index", {
    user: req.user,
    authError: req.query.authError === "true" ? "Wrong username or password" : req.query.authError,
  });
});

app.post("/login", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;

  const user = await getUserData(req.db, username);
  if (!user || user.password !== hash(password)) {
    return res.redirect("/?authError=true");
  }
  const sessionId = await createSession(req.db, user._id);
  res.cookie("sessionId", sessionId, { httpOnly: true }).redirect("/");
});

app.get("/logout", auth(), async (req, res) => {
  if (!req.user) {
    res.redirect("/");
  }
  await deleteSession(req.db, req.sessionId);
  res.clearCookie("sessionId").redirect("/");
});

app.post("/signup", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.redirect("/?authError=true");
  }
  const id = await createUser(req.db, username, password);
  const sessionId = await createSession(req.db, id);
  res.cookie("sessionId", sessionId, { httpOnly: true }).redirect("/");
});

app.use("/api/timers", require("./timers"));

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`  Listening on http://localhost:${port}`);
});
