const elliptic = require("elliptic"),
  path = require("path"),
  _ = require("lodash"),
  fs = require("fs"),
  Transactions = require("./transactions");

const { getPublicKey, getTxId, signTxIn, TxIn, Transaction, TxOut} = Transactions;
const ec = new elliptic.ec("secp256k1");

const privateKeyLocation = path.join(__dirname, "privateKey");

const generatePrivateKey = () => {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const getPrivateFromWallet = () => {
  const buffer = fs.readFileSync(privateKeyLocation, "utf-8");
  return buffer.toString();
};

const getPublicFromWallet = () => {
  const privateKey = getPrivateFromWallet();
  const key = ec.keyFromPrivate(privateKey, "hex");
  return key.getPublic().encode("hex");
};

const getBalance = (address, uTxOuts) => {
  return _(uTxOuts)
    .filter(uTxO => uTxO.address === address)
    .map(uTxO => uTxO.amount)
    .sum();
};

const initWallet = () => {
  if (fs.existsSync(privateKeyLocation)) {
    return;
  }
  const newPrivateKey = generatePrivateKey();

  fs.writeFileSync(privateKeyLocation, newPrivateKey);
};

const findAmountInUTxOuts = (amountNeeded, myUTxOuts) => {
    let currentAmount = 0;
    const includedUTxOuts = [];
    for(const myUTxOut of myUTxOuts){
        includedUTxOuts.push(myUTxOut);
        currentAmount = currentAmount + myUTxOut.amount;
        if(currentAmount >= amountNeeded){
            const leftOverAmount = currentAmount - amountNeeded;
            return { includedUTxOuts, leftOverAmount };
        }
    }
    console.log("Not enough founds");
    return false;
};

const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
    const receiverTxOut = new TxOut(receiverAddress, amount);
    if(leftOverAmount === 0){
        return [receiverTxOut];
    }
    const leftOverTxOut = new TxOut(myAddress, leftOverAmount);
    return [receiverTxOut, leftOverAmount];
};

const createTx = (receiverAddress, amount, privateKey, uTxOutList) => {
    const myAddress = getPublicKey(privateKey);
    const myUTxOuts = uTxOutList.filter(uTxO => uTxO.address === myAddress);

    const { includedUTxOuts, leftOverAmount } = findAmountInUTxOuts(amount, myUTxOuts);

    const toUnsignedTxIns = uTxOut => {
        const txIn = new TxIn();
        txIn.txOutId = uTxOut.txOutId;
        tx.txOutIndex = uTxOut.txOutIndex;
    }

    const unsignedTxIns = includedUTxOuts.map(toUnsignedTxIns);

    const tx = new Transaction();

    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = getTxId(tx);
    signTxIn.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = signTxIn(tx, index, privateKey, uTxOutList);
        return txIn;
    });
    return tx;
};

module.exports = {
  initWallet
};