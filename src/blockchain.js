const CryptoJS = require('crypto-js');

class Block {
    constructor(index, hash, previousHash, timestamp, data){
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
    }
}

const genesisBlock = new Block(
    0,
    '21FE1326BEDF3C1644D79DF842BB56EF54AB97C52262263105454B424F6F11C6',
    null,
    new Date().getTime(),
    "this is the genesis!",
);


let blockchain = [genesisBlock];

const getLastBlock = () => blockchain[blockchain.length - 1]

const getTimeStamp = () => new Date().getTime();

const getBlockchain = () => blockchain;

const createHash = (index, previousHash, timestamp, data) => 
    CryptoJS.SHA256(index + previousHash + timestamp + data).toString();

const createNewBlock = data => {
    const previousBlock = getLastBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimestamp = getTimeStamp();
    const newHash = createHash(newBlockIndex, previousBlock.hash, newTimestamp, data);
    const newBlock = new Block(
        newBlockIndex,
        newHash,
        previousBlock.hash,
        newTimestamp,
        data
    );
    return newBlock;
};

const getBlockHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data);

const isNewBlockValid = (candidateBlock, latestBlock) => {
    if(!isNewStructureValid(candidateBlock)){
        console.log('The candidate block structure is not valid');
        return false;
    }else if(latestBlock.index + 1 !== candidateBlock.index){
        console.log('The candidate block doesnt have a valid index');
        return false;
    }else if(latestBlock.hash !== candidateBlock.previousHash){
        console.log('The previousHash of the candidate block is not the hash of the latest block');
        return false;
    }else if(getBlockHash(candidateBlock) !== candidateBlock.hash){
        console.log('The hash of this block is invalid');
        return false;
    }
    return true;
}

const isNewStructureValid = () => {
    return (
        typeof block.index === 'number' &&
        typeof block.hash === 'string' &&
        typeof block.previousHash === 'string' &&
        typeof block.timestamp === 'number' &&
        typeof block.data === 'string'
    );
};

const isChainValid = candidateChain => {
    const isGenesisValid = (blck) => {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    }
    if (!isGenesisValid(candidateChain[0])){
        console.log('The candidateChain genesisBlock is not the same as our genesisBlock');
        return false;
    }
    for(let i=1;i<candidateChain.length;i++){
        if(!isNewBlockValid(candidateChain[i], candidateChain[i-1])){
            return false;
        }
    }
    return true;
};

const replaceChain = candidateChain => {
    if(isChainValid(candidateChain) && candidateChain.length > getBlockchain().length){
        getBlockchain() = candidateChain;
        return true;
    }else{
        return false;
    }
};

const addBlockToChain = candidateBlock => {
    if(isNewBlockValid(candidateBlock, getLastBlock())) {
        getBlockchain().push(candidateBlock);
        return true;
    }else{
        return false;
    }
}