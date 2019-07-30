const WebSockets = require('ws');
const Blockchain = require('./blockchain');

const {getLastBlock,
    isNewStructureValid,
    addBlockToChain,
    replaceChain,
    getBlockchain} = Blockchain;

const sockets = [];

// Messages Creators
const GET_LATEST = "GET_LASTEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

// Message Creators
const getLatest = () => {
    return {
        type: GET_LATEST,
        data: null,
    };
};

const getAll = () => {
    return {
        type: GET_ALL,
        data: null
    };
};

const blockchainResponse = (data) => {
    return {
        type: BLOCKCHAIN_RESPONSE,
        data,
    }
}

const getSockest = () => sockets;

const startP2PServer = server => {
    const wsServer = new WebSockets.Server({server});
    wsServer.on("connection", ws => {
        initSocketConnection(ws);
    });
    console.log('donghaCoin P2P Server runnig!');
};

const initSocketConnection = ws => {
    sockets.push(ws);
    handleSocketMessage(ws);
    handleSocketError(ws);
    sendMessage(ws, getLatest());
};

const parseData = data => {
    try{
        return JSON.parse(data);
    }catch(e){
        console.log(e);
        return null;
    }
}

const handleSocketMessage = ws => {
    ws.on("message", data => {
        const message = parseData(data);
        if(message === null){
            return;
        }
        switch(message.type){
            case GET_LATEST:
                sendMessage(ws, responseLatest());
                break;
            case GET_ALL:
                sendMessage(ws, responseAll());
                break;
            case BLOCKCHAIN_RESPONSE:
                const receiveBlocks = message.data;
                if(receiveBlocks === null){
                    break;
                }
                handleBlockchainResponse(receiveBlocks);
                break;
        }
    });
};

const handleBlockchainResponse = receiveBlocks => {
    if(receiveBlocks.length === 0){
        console.log('Recevied blocks have a length of 0');
        return;
    }
    const latestBlockReceived = receiveBlocks[receiveBlocks.length - 1];
    if(!isNewStructureValid(latestBlockReceived)){
        console.log('The block structure of the block recevied is not valid');
        return;
    }
    const lastBlock = getLastBlock();
    if(latestBlockReceived.index > lastBlock.index){
        if(lastBlock.hash === latestBlockReceived.previousHash){
            addBlockToChain(latestBlockReceived);
        }else if(receiveBlocks.length === 1){
            sendMessageToAll(getAll());
        }else{
            replaceChain(receiveBlocks);
        }
    }
};

const sendMessage = (ws, message) => 
    ws.send(JSON.stringify(message));

const responseLatest = () => blockchainResponse([getLastBlock()]);

const responseAll = () => blockchainResponse(getBlockchain());

const sendMessageToAll = message => sockets.forEach(ws => sendMessage(ws, message));

const handleSocketError = ws => {
    const closeSocketConnection = ws => {
        ws.close()
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on("close", () => closeSocketConnection(ws));
    ws.on("error", () => closeSocketConnection(ws));
};

const connectToPeers = newPeer => {
    const ws = new WebSockets(newPeer);
    ws.on("open", () => {
        initSocketConnection(ws);
    });
};

module.exports = {
    startP2PServer,
    connectToPeers
};