import * as bsv from "@sensible-contract/bsv";
import { BN } from "@sensible-contract/bsv";
import {
  createNftGenesisTx,
  createNftMetaDataTx,
  createNftMintTx,
  createNftTransferTx,
  createNftUnlockCheckContractTx,
  getNftGenesisInfo,
  getNftGenesisInput,
  getNftInput,
  NftSigner,
} from "@sensible-contract/nft-js";
import { NFT_UNLOCK_CONTRACT_TYPE } from "@sensible-contract/nft-js/lib/contract-factory/nftUnlockContractCheck";
import {
  SIGNER_NUM,
  SIGNER_VERIFY_NUM,
} from "@sensible-contract/nft-js/lib/contract-proto/nft.proto";
import { InputInfo, SatotxSigner } from "@sensible-contract/sdk-core";
import {
  dummyRabinKeypairs,
  MockProvider,
  MockSatotxApi,
} from "@sensible-contract/test-utils";
import {
  createBidTx,
  createNftAuctionContractTx,
  createNftForAuctionContractTx,
  createWithdrawTx,
  getNftAuctionInput,
  WitnessOracle,
} from "../src";
async function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(0);
    }, time * 1000);
  });
}
const signerNum = SIGNER_NUM;
const signerVerifyNum = SIGNER_VERIFY_NUM;
const satotxSigners: SatotxSigner[] = [];
for (let i = 0; i < signerNum; i++) {
  let { p, q } = dummyRabinKeypairs[i];
  let satotxSigner = new SatotxSigner();
  let mockSatotxApi = new MockSatotxApi(
    BN.fromString(p, 10),
    BN.fromString(q, 10)
  );
  satotxSigner.satotxApi = mockSatotxApi as any;
  satotxSigner.satotxPubKey = mockSatotxApi.satotxPubKey;
  satotxSigners.push(satotxSigner);
}
const signerSelecteds = new Array(signerNum)
  .fill(0)
  .map((v, idx) => idx)
  // .sort((a, b) => Math.random() - 0.5)
  .slice(0, signerVerifyNum);
let wallets: {
  privateKey: bsv.PrivateKey;
  publicKey: string;
  address: string;
}[] = [];
let wifs = [
  "L3tez3Lj3g7n4eZQf8jx6PUN8rnoTxZiiCf153U2ZRyNK4gPd1Je",
  "L3gKYZ3a3SRcteQe7gpahAYDxQbYxxRjtmpSg46Dh2AUE9pUjcWp",
  "L4F6T4hLnT7URMEEFKZq7qcTwvXS7w4BURoV8MyPurvMUgNy5sMM",
  "L12XGk7dErVzH5VyXGXPr5xP49xuLhgpUEFfQU4FzTJLieKGNbtQ",
];

for (let i = 0; i < 4; i++) {
  let privateKey = new bsv.PrivateKey(wifs[i]);
  wallets.push({
    privateKey,
    publicKey: privateKey.publicKey.toString(),
    address: privateKey.toAddress("mainnet").toString(),
  });
}
function signSigHashList(txHex: string, sigHashList: InputInfo[]) {
  const tx = new bsv.Transaction(txHex);
  let sigList = sigHashList.map((v) => {
    let privateKey = wallets.find(
      (w) => w.address.toString() == v.address
    ).privateKey;
    let sighash = bsv.Transaction.Sighash.sighash(
      tx,
      v.sighashType,
      v.inputIndex,
      new bsv.Script(v.scriptHex),
      new bsv.crypto.BN(v.satoshis)
    ).toString("hex");

    var sig = bsv.crypto.ECDSA.sign(
      Buffer.from(sighash, "hex"),
      privateKey,
      "little"
    )
      .set({
        nhashtype: v.sighashType,
      })
      .toString();
    return {
      sig,
      publicKey: privateKey.toPublicKey().toString(),
    };
  });
  return sigList;
}

let [FeePayer, CoffeeShop, Alice, Bob] = wallets;
console.log(`
FeePayer:   ${FeePayer.address.toString()}  ${FeePayer.publicKey.toString()}
CoffeeShop: ${CoffeeShop.address.toString()} ${CoffeeShop.publicKey.toString()}
Alice:      ${Alice.address.toString()}  ${Alice.publicKey.toString()}
Bob:        ${Bob.address.toString()}  ${Bob.publicKey.toString()}
`);

let mockProvider = new MockProvider();
async function genDummyFeeUtxos(satoshis: number, count: number = 1) {
  let feeTx = new bsv.Transaction();
  let unitSatoshis = Math.ceil(satoshis / count);
  let satoshisArray = [];

  for (let i = 0; i < count; i++) {
    if (satoshis < unitSatoshis) {
      satoshisArray.push(satoshis);
    } else {
      satoshisArray.push(unitSatoshis);
    }
    satoshis -= unitSatoshis;
  }
  for (let i = 0; i < count; i++) {
    feeTx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(FeePayer.address),
        satoshis: satoshisArray[i],
      })
    );
  }
  let utxos = [];
  for (let i = 0; i < count; i++) {
    utxos.push({
      txId: feeTx.id,
      outputIndex: i,
      satoshis: satoshisArray[i],
      address: FeePayer.address.toString(),
    });
  }
  await mockProvider.broadcast(feeTx.serialize(true));
  return utxos;
}
function cleanBsvUtxos() {
  mockProvider.cleanBsvUtxos();
}
let oracleConfig = {
  apiPrefix: "https://woc.satoplay.com",
  pubKey:
    "5564ec0d4b0b39747b12be662ac368764a38a84319b3acbd320e29ac2f1bd786fd9980d9f3980e91793b6b9b4dbd43281da5c7c0f505dd50dd2015ab186469f4a91a57ae5b91a96d3c8467ca2d49f80a6ad26d6f8ad799c3e10bcfe7e43b4ffb5e5e958ccb68684d0a09c9a48df3050ae5be5189fc6f2c46a9137981a9184f39cb40188cf1753089af8d2eb7ba89fd2a253ae16072126dbc037db1009e1575e7b1c72666d397be3e2c57d997485345cc6e5e25a5b5c0ee92f25e885a743b26cae47620209a035d05ff215c355954ded8e8c4bc4d6c4e09e0997e7395040092da552f92b3aa2998a15598a83f3c1a4e1310b1d67b8e7998b7ff450ce81cb9a05672827443331fb1a7cfa0e344ff21d4b9311f0e6169fd8b5cc57bb3fda8ed671345699b0775d7f62e251ef60f22daaaa3b464af8c90cdf898c01ec4644f4003b6176897f10f2b64a6e4fe9602eb3277a3c303b3cc38a98afa1c9dd4c7eb77b8ed1f5ec40150a5cbc5d9f3575bad88adc1db1b6a3b789e53a4a9db5eaa17018c2c",
};
describe("Auction Test", () => {
  describe("has bidder test ", () => {
    let provider: MockProvider;
    let nftSigner: NftSigner;
    let witnessOracle: WitnessOracle;
    let codehash: string;
    let genesis: string;
    let sensibleId: string;
    let opreturnData = "";
    let g_nftAuctionRet: any;
    let g_nftForAuctionRet: any;
    let auctionContractHash: string;
    const auctionEndTime = Date.now() + 1000 * 30;
    function printTime() {
      console.log(Math.floor((Date.now() - auctionEndTime) / 1000) + "s");
    }
    before(async () => {
      provider = mockProvider;

      nftSigner = new NftSigner({
        signerSelecteds,
        signerConfigs: satotxSigners.map((v) => ({
          satotxApiPrefix: "",
          satotxPubKey: v.satotxPubKey.toString("hex"),
        })),
      });
      nftSigner.signers = satotxSigners;

      witnessOracle = new WitnessOracle(oracleConfig);
      mockProvider.cleanCacheds();
    });

    afterEach(() => {});
    it("genesis Nft should be ok", async () => {
      let utxos = await genDummyFeeUtxos(100000001);
      let { txComposer } = await createNftGenesisTx({
        nftSigner,
        genesisPublicKey: CoffeeShop.publicKey,
        totalSupply: "3",
        utxos,
      });
      let sigResults = signSigHashList(
        txComposer.getRawHex(),
        txComposer.getInputInfos()
      );
      txComposer.unlock(sigResults);
      let _res = getNftGenesisInfo(nftSigner, txComposer.getRawHex());
      await provider.broadcast(txComposer.getRawHex());
      genesis = _res.genesis;
      codehash = _res.codehash;
      sensibleId = _res.sensibleId;
      printTime();
    });
    it("mint Nft should be ok", async () => {
      let { genesisInput, genesisContract } = await getNftGenesisInput(
        mockProvider,
        {
          codehash,
          genesis,
          sensibleId,
        }
      );

      let fee1 = createNftMintTx.estimateFee({ genesisInput });
      let fee2 = createNftMetaDataTx.estimateFee({
        metaData: { name: "pig", description: "", image: "" },
      });
      let utxos = await genDummyFeeUtxos(fee1 + fee2);

      let nftMetaDataRet = await createNftMetaDataTx({
        utxos,
        metaData: { name: "pig", description: "", image: "" },
      });
      nftMetaDataRet.txComposer.unlock(
        signSigHashList(
          nftMetaDataRet.txComposer.getRawHex(),
          nftMetaDataRet.txComposer.getInputInfos()
        )
      );

      utxos = [
        {
          txId: nftMetaDataRet.txComposer.getTxId(),
          outputIndex: 1,
          satoshis: nftMetaDataRet.txComposer.getOutput(1).satoshis,
          address: FeePayer.address,
        },
      ];

      let { txComposer } = await createNftMintTx({
        nftSigner,
        genesisInput,
        genesisContract,
        receiverAddress: CoffeeShop.address.toString(),
        metaTxId: nftMetaDataRet.txComposer.getTxId(),
        metaOutputIndex: 0,
        utxos,
      });
      let sigResults = signSigHashList(
        txComposer.getRawHex(),
        txComposer.getInputInfos()
      );
      txComposer.unlock(sigResults);
      await provider.broadcast(nftMetaDataRet.txComposer.getRawHex());
      await provider.broadcast(txComposer.getRawHex());
      printTime();
    });
    it("nftAuction ", async () => {
      // cleanBsvUtxos();
      let utxoMaxCount = 3;

      let _res = await provider.getNftUtxoDetail(codehash, genesis, "0");
      let nftUtxo = _res as any;
      let nftInput = await getNftInput(provider, {
        codehash,
        genesis,
        nftUtxo,
      });
      let fee = createNftAuctionContractTx.estimateFee({ utxoMaxCount });
      let utxos = await genDummyFeeUtxos(fee, utxoMaxCount);
      let nftAuctionRet = await createNftAuctionContractTx({
        nftSigner,
        witnessOracle,
        nftInput,
        feeAddress: CoffeeShop.address.toString(),
        senderAddress: CoffeeShop.address.toString(),
        startBsvPrice: 500,
        endTimeStamp: auctionEndTime,
        utxos,
        opreturnData,
      });
      nftAuctionRet.txComposer.unlock(
        signSigHashList(
          nftAuctionRet.txComposer.getRawHex(),
          nftAuctionRet.txComposer.getInputInfos()
        )
      );
      auctionContractHash = nftAuctionRet.auctionContractHash;
      g_nftAuctionRet = nftAuctionRet;
      nftAuctionRet.nftAuctionContract.lockingScript;

      let txid = await provider.broadcast(nftAuctionRet.txComposer.getRawHex());

      console.log("create auction success", txid);

      printTime();
    });

    it("first bid ", async () => {
      // cleanBsvUtxos();
      let nftAuctionUtxo = {
        txId: g_nftAuctionRet.txComposer.getTxId(),
        outputIndex: 0,
      };
      let nftAuctionInput = await getNftAuctionInput(provider, {
        nftAuctionUtxo,
      });

      let utxoMaxCount = 3;
      let fee = createBidTx.estimateFee({ nftAuctionInput, utxoMaxCount });
      let utxos = await genDummyFeeUtxos(fee, utxoMaxCount);

      let nftAuctionRet = await createBidTx({
        nftSigner,
        witnessOracle,
        nftAuctionInput,
        bsvBidPrice: 500,
        bidderAddress: CoffeeShop.address.toString(),
        utxos,
      });
      nftAuctionRet.txComposer.unlock(
        signSigHashList(
          nftAuctionRet.txComposer.getRawHex(),
          nftAuctionRet.txComposer.getInputInfos()
        )
      );

      let txid = await provider.broadcast(nftAuctionRet.txComposer.getRawHex());

      console.log("first bid success", txid);

      g_nftAuctionRet = nftAuctionRet;
      printTime();
    });

    it("second bid ", async () => {
      // cleanBsvUtxos();

      let nftAuctionUtxo = {
        txId: g_nftAuctionRet.txComposer.getTxId(),
        outputIndex: 0,
      };
      let nftAuctionInput = await getNftAuctionInput(provider, {
        nftAuctionUtxo,
      });

      let utxoMaxCount = 3;
      let fee = createBidTx.estimateFee({ nftAuctionInput, utxoMaxCount });
      let utxos = await genDummyFeeUtxos(fee, utxoMaxCount);
      let nftAuctionRet = await createBidTx({
        nftSigner,
        witnessOracle,
        nftAuctionInput,
        bsvBidPrice: 1000,
        bidderAddress: CoffeeShop.address.toString(),
        utxos,
      });

      nftAuctionRet.txComposer.unlock(
        signSigHashList(
          nftAuctionRet.txComposer.getRawHex(),
          nftAuctionRet.txComposer.getInputInfos()
        )
      );

      await provider.broadcast(nftAuctionRet.txComposer.getRawHex());

      g_nftAuctionRet = nftAuctionRet;
      printTime();
    });

    it("send nft to nftForAuction should be ok", async () => {
      let utxoMaxCount = 3;

      let _res = await provider.getNftUtxoDetail(codehash, genesis, "0");
      let nftUtxo = _res as any;
      let nftInput = await getNftInput(provider, {
        codehash,
        genesis,
        nftUtxo,
      });

      let fee1 = createNftForAuctionContractTx.estimateFee({ utxoMaxCount });
      let fee2 = createNftTransferTx.estimateFee({ nftInput, utxoMaxCount: 1 });
      let utxos = await genDummyFeeUtxos(fee1 + fee2, utxoMaxCount);

      let nftForAuctionRet = await createNftForAuctionContractTx(provider, {
        nftInput,
        auctionContractHash: auctionContractHash,
        utxos,
      });
      nftForAuctionRet.txComposer.unlock(
        signSigHashList(
          nftForAuctionRet.txComposer.getRawHex(),
          nftForAuctionRet.txComposer.getInputInfos()
        )
      );

      utxos = [
        {
          txId: nftForAuctionRet.txComposer.getTxId(),
          outputIndex: 1,
          satoshis: nftForAuctionRet.txComposer.getOutput(1).satoshis,
          address: FeePayer.address,
        },
      ];

      let { txComposer } = await createNftTransferTx({
        nftSigner,
        nftInput,
        receiverAddress: nftForAuctionRet.nftForAuctionAddress,
        utxos,
      });
      txComposer.unlock(
        signSigHashList(txComposer.getRawHex(), txComposer.getInputInfos())
      );

      g_nftForAuctionRet = nftForAuctionRet;
      let txid1 = await provider.broadcast(
        nftForAuctionRet.txComposer.getRawHex()
      );
      console.log("nftForAuctionRet tx: ", txid1);
      let txid2 = await provider.broadcast(txComposer.getRawHex());
      console.log("nft transfer tx: ", txid2);

      printTime();
    });

    it("withdraw nft should be ok", async () => {
      await sleep(10);
      // cleanBsvUtxos();
      let utxoMaxCount = 3;

      let _res = await provider.getNftUtxoDetail(codehash, genesis, "0");
      let nftUtxo = _res as any;
      let nftInput = await getNftInput(provider, {
        codehash,
        genesis,
        nftUtxo,
      });

      let nftAuctionUtxo = {
        txId: g_nftAuctionRet.txComposer.getTxId(),
        outputIndex: 0,
      };
      let nftAuctionInput = await getNftAuctionInput(provider, {
        nftAuctionUtxo,
      });

      let fee1 = createNftUnlockCheckContractTx.estimateFee({
        nftUnlockType: NFT_UNLOCK_CONTRACT_TYPE.OUT_6,
        utxoMaxCount,
      });
      let fee2 = createWithdrawTx.estimateFee({
        nftInput,
        nftAuctionInput,
      });

      console.log(fee2);
      let utxos = await genDummyFeeUtxos(fee1 + fee2, utxoMaxCount);

      let unlockCheckRet = await createNftUnlockCheckContractTx({
        nftUnlockType: NFT_UNLOCK_CONTRACT_TYPE.OUT_6,
        codehash,
        nftID: nftInput.nftID,
        utxos,
      });

      unlockCheckRet.txComposer.unlock(
        signSigHashList(
          unlockCheckRet.txComposer.getRawHex(),
          unlockCheckRet.txComposer.getInputInfos()
        )
      );

      utxos = [
        {
          txId: unlockCheckRet.txComposer.getTxId(),
          outputIndex: 1,
          satoshis: unlockCheckRet.txComposer.getOutput(1).satoshis,
          address: FeePayer.address,
        },
      ];

      let { txComposer } = await createWithdrawTx({
        nftSigner,
        witnessOracle,
        nftInput,
        nftAuctionInput,
        nftForAuctionContract: g_nftForAuctionRet.nftForAuctionContract,
        nftForAuctionTxComposer: g_nftForAuctionRet.txComposer,
        nftUnlockCheckContract: unlockCheckRet.unlockCheckContract,
        nftUnlockCheckTxComposer: unlockCheckRet.txComposer,
        utxos,
        opreturnData,
      });

      txComposer.unlock(
        signSigHashList(txComposer.getRawHex(), txComposer.getInputInfos())
      );

      let txid1 = await provider.broadcast(
        unlockCheckRet.txComposer.getRawHex()
      );
      console.log("unlockCheck: ", txid1);
      await provider.broadcast(txComposer.getRawHex());
    });
  });

  describe("no bidder test ", () => {
    let provider: MockProvider;
    let nftSigner: NftSigner;
    let witnessOracle: WitnessOracle;
    let codehash: string;
    let genesis: string;
    let sensibleId: string;
    let opreturnData = "";
    let g_nftAuctionRet: any;
    let g_nftForAuctionRet: any;
    let auctionContractHash: string;
    const auctionEndTime = Date.now() + 1000 * 20;

    function printTime() {
      console.log(Math.floor((Date.now() - auctionEndTime) / 1000) + "s");
    }
    before(async () => {
      provider = mockProvider;
      provider.network = "mainnet";

      nftSigner = new NftSigner({
        signerSelecteds,
        signerConfigs: satotxSigners.map((v) => ({
          satotxApiPrefix: "",
          satotxPubKey: v.satotxPubKey.toString("hex"),
        })),
      });
      nftSigner.signers = satotxSigners;

      witnessOracle = new WitnessOracle();

      provider.cleanCacheds();
    });

    afterEach(() => {});
    it("genesis Nft should be ok", async () => {
      let utxos = await genDummyFeeUtxos(100000001);
      let { txComposer } = await createNftGenesisTx({
        nftSigner,
        genesisPublicKey: CoffeeShop.publicKey,
        totalSupply: "3",
        utxos,
      });
      let sigResults = signSigHashList(
        txComposer.getRawHex(),
        txComposer.getInputInfos()
      );
      txComposer.unlock(sigResults);
      let _res = getNftGenesisInfo(nftSigner, txComposer.getRawHex());
      await provider.broadcast(txComposer.getRawHex());
      genesis = _res.genesis;
      codehash = _res.codehash;
      sensibleId = _res.sensibleId;
      printTime();
    });
    it("mint Nft should be ok", async () => {
      let { genesisInput, genesisContract } = await getNftGenesisInput(
        provider,
        {
          codehash,
          genesis,
          sensibleId,
        }
      );

      let fee1 = createNftMetaDataTx.estimateFee({
        metaData: { name: "pig", description: "", image: "" },
      });
      let fee2 = createNftMintTx.estimateFee({ genesisInput });
      let utxos = await genDummyFeeUtxos(fee1 + fee2);

      let nftMetaDataRet = await createNftMetaDataTx({
        utxos,
        metaData: { name: "pig", description: "", image: "" },
      });
      nftMetaDataRet.txComposer.unlock(
        signSigHashList(
          nftMetaDataRet.txComposer.getRawHex(),
          nftMetaDataRet.txComposer.getInputInfos()
        )
      );

      utxos = [
        {
          txId: nftMetaDataRet.txComposer.getTxId(),
          outputIndex: 1,
          satoshis: nftMetaDataRet.txComposer.getOutput(1).satoshis,
          address: FeePayer.address,
        },
      ];

      let { txComposer } = await createNftMintTx({
        nftSigner,
        genesisInput,
        genesisContract,
        receiverAddress: CoffeeShop.address.toString(),
        metaTxId: nftMetaDataRet.txComposer.getTxId(),
        metaOutputIndex: 0,
        utxos,
      });
      let sigResults = signSigHashList(
        txComposer.getRawHex(),
        txComposer.getInputInfos()
      );
      txComposer.unlock(sigResults);
      await provider.broadcast(nftMetaDataRet.txComposer.getRawHex());
      await provider.broadcast(txComposer.getRawHex());
      printTime();
    });
    it("nftAuction ", async () => {
      // cleanBsvUtxos();
      let utxoMaxCount = 3;

      let _res = await provider.getNftUtxoDetail(codehash, genesis, "0");
      let nftUtxo = _res as any;
      let nftInput = await getNftInput(provider, {
        codehash,
        genesis,
        nftUtxo,
      });
      let fee = createNftAuctionContractTx.estimateFee({ utxoMaxCount });
      let utxos = await genDummyFeeUtxos(fee, utxoMaxCount);
      let nftAuctionRet = await createNftAuctionContractTx({
        nftSigner,
        witnessOracle,
        nftInput,
        feeAddress: CoffeeShop.address.toString(),
        senderAddress: CoffeeShop.address.toString(),
        startBsvPrice: 500,
        endTimeStamp: auctionEndTime,
        utxos,
        opreturnData,
      });
      nftAuctionRet.txComposer.unlock(
        signSigHashList(
          nftAuctionRet.txComposer.getRawHex(),
          nftAuctionRet.txComposer.getInputInfos()
        )
      );
      auctionContractHash = nftAuctionRet.auctionContractHash;
      g_nftAuctionRet = nftAuctionRet;
      nftAuctionRet.nftAuctionContract.lockingScript;

      let txid = await provider.broadcast(nftAuctionRet.txComposer.getRawHex());

      console.log("create auction success", txid);

      printTime();
    });

    it("send nft to nftForAuction should be ok", async () => {
      let utxoMaxCount = 3;

      let _res = await provider.getNftUtxoDetail(codehash, genesis, "0");
      let nftUtxo = _res as any;
      let nftInput = await getNftInput(provider, {
        codehash,
        genesis,
        nftUtxo,
      });

      let fee1 = createNftForAuctionContractTx.estimateFee({ utxoMaxCount });
      let fee2 = createNftTransferTx.estimateFee({ nftInput, utxoMaxCount: 1 });
      let utxos = await genDummyFeeUtxos(fee1 + fee2, utxoMaxCount);

      let nftForAuctionRet = await createNftForAuctionContractTx(provider, {
        nftInput,
        auctionContractHash: auctionContractHash,
        utxos,
      });
      nftForAuctionRet.txComposer.unlock(
        signSigHashList(
          nftForAuctionRet.txComposer.getRawHex(),
          nftForAuctionRet.txComposer.getInputInfos()
        )
      );

      utxos = [
        {
          txId: nftForAuctionRet.txComposer.getTxId(),
          outputIndex: 1,
          satoshis: nftForAuctionRet.txComposer.getOutput(1).satoshis,
          address: FeePayer.address,
        },
      ];

      let { txComposer } = await createNftTransferTx({
        nftSigner,
        nftInput,
        receiverAddress: nftForAuctionRet.nftForAuctionAddress,
        utxos,
      });
      txComposer.unlock(
        signSigHashList(txComposer.getRawHex(), txComposer.getInputInfos())
      );

      g_nftForAuctionRet = nftForAuctionRet;
      let txid1 = await provider.broadcast(
        nftForAuctionRet.txComposer.getRawHex()
      );
      console.log("nftForAuctionRet tx: ", txid1);
      let txid2 = await provider.broadcast(txComposer.getRawHex());
      console.log("nft transfer tx: ", txid2);

      printTime();
    });

    it("withdraw nft should be ok", async () => {
      await sleep(10);
      // cleanBsvUtxos();
      let utxoMaxCount = 3;
      let utxos = await genDummyFeeUtxos(1000000, utxoMaxCount);

      let _res = await provider.getNftUtxoDetail(codehash, genesis, "0");
      let nftUtxo = _res as any;
      let nftInput = await getNftInput(provider, {
        codehash,
        genesis,
        nftUtxo,
      });

      let tokenIndex = "0";

      let unlockCheckRet = await createNftUnlockCheckContractTx({
        nftUnlockType: NFT_UNLOCK_CONTRACT_TYPE.OUT_6,
        codehash,
        nftID: nftInput.nftID,
        utxos,
      });

      unlockCheckRet.txComposer.unlock(
        signSigHashList(
          unlockCheckRet.txComposer.getRawHex(),
          unlockCheckRet.txComposer.getInputInfos()
        )
      );

      utxos = [
        {
          txId: unlockCheckRet.txComposer.getTxId(),
          outputIndex: 1,
          satoshis: unlockCheckRet.txComposer.getOutput(1).satoshis,
          address: FeePayer.address,
        },
      ];

      let nftAuctionUtxo = {
        txId: g_nftAuctionRet.txComposer.getTxId(),
        outputIndex: 0,
      };
      let nftAuctionInput = await getNftAuctionInput(provider, {
        nftAuctionUtxo,
      });

      let { txComposer } = await createWithdrawTx({
        nftSigner,
        witnessOracle,
        nftInput,
        nftAuctionInput,
        nftForAuctionContract: g_nftForAuctionRet.nftForAuctionContract,
        nftForAuctionTxComposer: g_nftForAuctionRet.txComposer,
        nftUnlockCheckContract: unlockCheckRet.unlockCheckContract,
        nftUnlockCheckTxComposer: unlockCheckRet.txComposer,
        utxos,
        opreturnData,
      });

      txComposer.unlock(
        signSigHashList(txComposer.getRawHex(), txComposer.getInputInfos())
      );

      let txid1 = await provider.broadcast(
        unlockCheckRet.txComposer.getRawHex()
      );
      console.log("unlockCheck: ", txid1);
      await provider.broadcast(txComposer.getRawHex());
    });
  });
});
