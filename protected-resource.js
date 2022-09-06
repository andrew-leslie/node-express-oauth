const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { timeout } = require("./utils");

const config = {
  port: 9002,
  publicKey: fs.readFileSync("assets/public_key.pem"),
};

const users = {
  user1: {
    username: "user1",
    name: "User 1",
    date_of_birth: "7th October 1990",
    weight: 57,
  },
  john: {
    username: "john",
    name: "John Appleseed",
    date_of_birth: "12th September 1998",
    weight: 87,
  },
};

const app = express();
app.use(timeout);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/user-info", (req, res) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.slice(7);
    const publicKey = fs.readFileSync("assets/public_key.pem");

    try {
      const verified = jwt.verify(token, publicKey, { algorithm: "RS256" });

      const props = verified.scope.split(" ").map((s) => s.slice(11));

      const profile = Object.keys(users[verified.userName])
        .filter((key) => props.includes(key))
        .reduce((result, key2) => {
          result[key2] = users[verified.userName][key2];
          return result;
        }, {});

      return res.json(profile);
    } catch (error) {
      console.log(error);
    }
  }
  return res.sendStatus(401);
});

const server = app.listen(config.port, "localhost", function () {
  var host = server.address().address;
  var port = server.address().port;
});

// for testing purposes
module.exports = {
  app,
  server,
};
