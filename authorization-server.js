const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const {
  randomString,
  containsAll,
  decodeAuthCredentials,
  timeout,
} = require("./utils");

const config = {
  port: 9001,
  privateKey: fs.readFileSync("assets/private_key.pem"),

  clientId: "my-client",
  clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
  redirectUri: "http://localhost:9000/callback",

  authorizationEndpoint: "http://localhost:9001/authorize",
};

const clients = {
  "my-client": {
    name: "Sample Client",
    clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
    scopes: ["permission:name", "permission:date_of_birth"],
  },
  "test-client": {
    name: "Test Client",
    clientSecret: "TestSecret",
    scopes: ["permission:name"],
  },
};

const users = {
  user1: "password1",
  john: "appleseed",
};

const requests = {};
const authorizationCodes = {};

let state = "";

const app = express();
app.set("view engine", "ejs");
app.set("views", "assets/authorization-server");
app.use(timeout);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/authorize", (req, res) => {
  let client_id = req.query.client_id;

  if (clients[client_id]) {
    let scopes = req.query.scope.split(" ");

    if (containsAll(clients[client_id].scopes, scopes)) {
      let requestId = randomString();
      requests[requestId] = req.query;
      return res.render("login", {
        client: clients[client_id],
        scope: req.query.scope,
        requestId: requestId,
      });
    }
  }
  return res.sendStatus(401);
});

app.post("/approve", (req, res) => {
  let userName = req.body.userName;
  let password = req.body.password;
  let requestId = req.body.requestId;

  if (userName && password && users[userName] && requests[requestId]) {
    if (users[userName] === password) {
      let authCode = randomString();

      authorizationCodes[authCode] = {
        clientReq: requests[requestId],
        userName: userName,
      };

      let redirectUrl = new URL(requests[requestId].redirect_uri);
      redirectUrl.searchParams.append("code", authCode);
      redirectUrl.searchParams.append("state", requests[requestId].state);

      delete requests[requestId];

      return res.redirect(redirectUrl.href);
    }
  }

  return res.sendStatus(401);
});

app.post("/token", (req, res) => {
  if (req.headers.authorization) {
    let decoded = decodeAuthCredentials(req.headers.authorization);
    if (
      clients[decoded.clientId].clientSecret === decoded.clientSecret &&
      authorizationCodes[req.body.code]
    ) {
      let code = authorizationCodes[req.body.code];
      let privateKey = fs.readFileSync("assets/private_key.pem");
      let token = jwt.sign(
        {
          userName: code.userName,
          scope: code.clientReq.scope,
        },
        privateKey,
        { algorithm: "RS256" }
      );

      delete authorizationCodes[req.body.code];
      return res.json({
        access_token: token,
        token_type: "Bearer"
      });
    }
  }
  return res.sendStatus(401);
});

const server = app.listen(config.port, "localhost", function () {
  var host = server.address().address;
  var port = server.address().port;
});

// for testing purposes

module.exports = { app, requests, authorizationCodes, server };
