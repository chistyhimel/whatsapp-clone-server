//importing
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Pusher from "pusher";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

//app config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: "1115020",
  key: "149a7cfad4ea44dda38d",
  secret: "9ca810beba0b2d2a1f4c",
  cluster: "mt1",
  useTLS: true,
});

//middleware
app.use(express.json());
app.use(cors());

// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Headers", "*");
//   next();
// });
console.log(process.env.DB_USER);
//DB config
const connection_url = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.dgdfa.mongodb.net:27017,cluster0-shard-00-01.dgdfa.mongodb.net:27017,cluster0-shard-00-02.dgdfa.mongodb.net:27017/whatsappdb?ssl=true&replicaSet=atlas-g4jngz-shard-0&authSource=admin&retryWrites=true&w=majority`;
mongoose.connect(connection_url, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once("open", () => {
  console.log("Db is conncected");
  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch();
  changeStream.on("change", (change) => {
    console.log(change);
    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        recieved: messageDetails.recieved,
      });
    } else {
      console.log("Error triggering pusher");
    }
  });
});
//???

//api routes
app.get("/", (req, res) => res.status(200).send("hello world"));

app.get("/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.post("/messages/new", (req, res) => {
  const dbMessage = req.body;
  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.send(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

//listem
app.listen(port, () => console.log(`Listening local host on: ${port}`));
