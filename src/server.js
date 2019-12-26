const express = require("express"),
  bodyParser = require("body-parser"),
  morgan = require("morgan"),
  Blockchain = require("./blockchain"),
  Wallet = require("./wallet");
P2P = require("./p2p");

const { getBlockchain, createNewBlock, getAccountBalance, sendTx } = Blockchain;
const { startP2PServer, connectToPeers } = P2P;
const { initWallet } = Wallet;

// Psssst. Don't forget about typing 'export HTTP_PORT=4000' in your console
const PORT = process.env.HTTP_PORT || 3000;

const app = express();
app.use(bodyParser.json());
app.use(morgan("combined"));

app
  .route("/blocks")
  .get("/blocks", (req, res) => {
    res.send(getBlockchain());
  })
  .post("/blocks", (req, res) => {
    const newBlock = createNewBlock();
    res.send(newBlock);
  });

app.post("/peers", (req, res) => {
  const {
    body: { peer }
  } = req;
  connectToPeers(peer);
  res.send();
});

app.get("/me/balance", (req, res) => {
  const balance = getAccountBalance();
  res.send({balance});
})

app.route("/transaction")
  .get((req, res) => {})
  .post((req, res) => {
    try{
      const { bdoy: {address, amount} } = req;
      if (address === undefined || amount === undefined){
        throw Error("Plz specify an address and an amount");
      }else{
        const res = sendTx(address, amount);
      }
    } catch(e){
      res.status(400).send(e.message);
    }
  });

const server = app.listen(PORT, () =>
  console.log(`Nomadcoin HTTP Server running on port ${PORT} ✅`)
);

initWallet();
startP2PServer(server);
