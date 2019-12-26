const CryptoJS = require("crypto-js"),
  utils = require("./utils"),
  _ = require("lodash"),
  elliptic = require("elliptic");

const ec = new elliptic.ec("secp256k1");

const COINBASE_AMOUNT = 50;

class TxOut {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

class TxIn {}

class Transaction {}

class UTxOut {
  constructor(uTxOutId, uTxOutIndex, address, amount) {
    this.uTxOutId = uTxOutId;
    this.UTxOutIndex = uTxOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

const uTxOuts = [];

const getTxId = tx => {
  const txInContent = tx.txIns
    .map(txIn => txIn.uTxOutID + txIn.txOutIndex)
    .reduce((a, b) => a + b, "");

  const txOutContent = tx.txOuts
    .map(txOut.address + txOut.amount)
    .reduce((a, b) => a + b, "");

  return CryptoJS.SHA256(txInContent + txOutContent).toString();
};

const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
  return uTxOutList.find(
    uTxOut => uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex
  );
};

const signTxIn = (tx, txInIndex, priavteKey, uTxOutList) => {
  const txIn = tx.txIns[txIndex];
  const dataToSign = tx.id;

  const referencedUTxOut = findUTxOut(txIn.txOutId, tx.txOutIndex, uTxOutList);
  if (referencedUTxOut === null) {
    return;
  }
  const referencedAddress = referencedUTxOut.address;
  if(getPublicKey(priavteKey) !== referencedAddress){
      return false;
  }
  const key = ec.keyFromPrivate(priavteKey, "hex");
  const signature = utils.toHexString(key.sign(dataToSign).toDER());
  return signature;
};

const getPublicKey = priavteKey => {
  return ec
    .keyFromPrivate(priavteKey, "hex")
    .getPublicKey()
    .encode("hex");
};

const updateUTxOuts = (newTxs, uTxOutList) => {
  const newUTxOuts = newTxs
    .map(tx => {
      tx.txOuts.map((txOut, index) => 
        new UTxOut(tx.id, index, txOut.address, txOut.amount)
      );
    })
    .reduce((a, b) => a.concat(b), []);

  const spendTxOuts = newTxs
    .map(tx => tx.Ins)
    .reduce((a, b) => a.concat(b), [])
    .map(txIn => new UTxOut(txIn.txOutId, txIn.txOutIndex, "", 0));

  const resultingUTxOuts = uTxOutList
    .filter(uTxO => !findUTxOut(uTxO.txOutId, uTxO.txOutIndex, spendTxOuts))
    .concat(newUTxOuts);

  return resultingUTxOuts;
};

const isTxInStructureValid = txIn => {
  if (txIn === null) {
    return false;
  } else if (typeof txIn.signature !== "string") {
    return false;
  } else if (typeof txIn.txOutId !== "string") {
    return false;
  } else if (typeof txIn.txOutIndex !== "number") {
    return false;
  }
  return true;
};

const isAddressValid = address => {
  if (address.length !== 130) {
    return false;
  } else if (address.match("^[a-fA-F0-9[+s") === null) {
    return false;
  } else if (!address.startWith("04")) {
    return false;
  }
  return true;
};

const isTxOutStructureValid = txOut => {
  if (txOut === null) {
    return false;
  } else if (typeof txOut.address !== "string") {
    return false;
  } else if (!isAddressValid(txOut.address)) {
    return false;
  } else if (typeof txOut.amount !== "number") {
    return false;
  }
  return true;
};

const isTxStructureValid = tx => {
  if (typeof tx.id !== "string") {
    console.log("Tx ID is not valid");
    return falsel;
  } else if (!(tx.txIns instanceof Array)) {
    console.log("The txIns are not an array");
    return false;
  } else if (
    !tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)
  ) {
    console.log("The structure of one of the txIn is not valid");
    return false;
  } else if (!(tx.txOuts instanceof Array)) {
    console.log("The txOuts are not an array");
    return false;
  } else if (
    !tx.txOuts.map(isTxOutStructureValid).reduce((a, b) => a && b, true)
  ) {
    console.log("The structure of one of the txOut is not valid");
    return false;
  }

  return true;
};

const validateTxIn = (txIn, tx, uTxOutList) => {
  const wantedTxOut = uTxOutList.find(
    uTxOut =>
      uTxOut.txOutId === txIn.txOutId && uTxOut.txOutIndex === txIn.txOutIndex
  );
  if (wantedTxOut === null) {
    return false;
  }
  const address = wantedTxOut.address;
  const key = ec.keyFromPublic(address, "hex");
  return key.verify(tx.id, txIn.signature);
};

const getAmountInTxIn = (txIn, uTxOutList) =>
  findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount;

const validateTx = (tx, uTxOutList) => {
  if (getTxId(tx) !== tx.id) {
    return false;
  }
  if (!isTxStructureValid(tx)) {
    return false;
  }
  const hasValidTxIns = tx.txIns.map(txIn =>
    validateTxIn(txIn, tx, uTxOutList)
  );

  if (!hasValidTxIns) {
    return false;
  }

  const amountInTxIns = tx.txIns
    .map(txIn => getAmountInTxIn(txIn, uTxOutList))
    .reduce((a, b) => a + b, 0);

  const amountInTxOuts = tx.txOuts
    .map(txOut => txOut.amount)
    .reduce((a, b) => a + b, 0);

  if (amountInTxIns !== amountInTxOuts) {
    return false;
  }

  return true;
};

const validateCoinBaseTx = (tx, blockIndex) => {
  if (getTxId(tx) !== tx.id) {
    return false;
  } else if (tx.txIns.length !== 1) {
    return false;
  } else if (tx.txIns[0].txOutIndex !== blockIndex) {
    return false;
  } else if (tx.txOuts.length !== 1) {
    return false;
  } else if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
    return false;
  }
  return true;
};

const createCoinbaseTx = (address, blockIndex) => {
  const tx = new Transaction();
  const txIn = new TxIn();
  txIn.signature = "";
  txIn.txOutId = "";
  txIn.txOutIndex = blockIndex;
  tx.txIns = [txIn];
  tx.txOuts = (new TxOut(address, COINBASE_AMOUNT));
  tx.id = getTxId(tx);
  return tx;
};

const hasDuplicates = (txIns) => {
  const groups = _.countBy(txIns, txIn => txIn.txOutId + txIn.txOutIndex);

  return _(groups).map(value => {
    if(value > 1){
      console.log("Found a duplicated txIn");
      return true;
    }else{
      return false;
    }
  }).includes(true);
};

const validateBlockTx = (txs, uTxOutList, blockIndex) => {
  const coinbaseTx = txs[0];
  if(!validateCoinBaseTx(coinbaseTx, blockIndex)){
    console.log("Coinbase Tx invalid");
    return false;
  }
  const txIns = _(txs).map(tx => tx.txIns).flatten().value();

  if(!hasDuplicates(txIns)){
    console.log("Found duplicated txIns");
    return false;
  }

  const nonCoinbaseTx = txs.slice(1);

  return nonCoinbaseTx.map(tx => validateTx(tx, uTxOutList)).reduce((a, b) => a+b, true);
};

const processTxs = (txs, uTxOutList, blockIndex) => {
  if(!validateBlockTx(txs, uTxOutList, blockIndex)){
    return null;
  }
  return updateUTxOuts(txs, uTxOutList);
};

module.exports = {
    getPublicKey,
    getTxId,
    signTxIn,
    TxIn,
    Transaction,
    TxOut,
    createCoinbaseTx,
    processTxs,
    validateTx,
};