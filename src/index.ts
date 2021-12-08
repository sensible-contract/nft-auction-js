import * as bsv from "@sensible-contract/bsv";
import { BN } from "@sensible-contract/bsv";
import { NftInput, NftSigner } from "@sensible-contract/nft-js";
import { NftFactory } from "@sensible-contract/nft-js/lib/contract-factory/nft";
import { NftUnlockContractCheck } from "@sensible-contract/nft-js/lib/contract-factory/nftUnlockContractCheck";
import * as nftProto from "@sensible-contract/nft-js/lib/contract-proto/nft.proto";
import { SensiblequeryProvider } from "@sensible-contract/providers";
import {
  getRabinDatas,
  getZeroAddress,
  PLACE_HOLDER_PUBKEY,
  PLACE_HOLDER_SIG,
  Prevouts,
  Utils,
} from "@sensible-contract/sdk-core";
import {
  Bytes,
  PubKey,
  Ripemd160,
  Sig,
  SigHashPreimage,
  toHex,
} from "@sensible-contract/sdk-core/lib/scryptlib";
import { TxComposer } from "@sensible-contract/tx-composer";
import { WitnessOnChainApi } from "@sensible-contract/witnessonchain-api";
import { NftAuction, NftAuctionFactory } from "./contract-factory/nftAuction";
import {
  NftForAuction,
  NftForAuctionFactory,
} from "./contract-factory/nftForAuction";
import * as nftAuctionProto from "./contract-proto/nftAuction.proto";
const Signature = bsv.crypto.Signature;
export const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;

let defaultOracleConfig = {
  apiPrefix: "https://witnessonchain.com/v1",
  pubKey:
    "ad7e1e8d6d2960129c9fe6b636ef4041037f599c807ecd5adf491ce45835344b18fd4e7c92fd63bb822b221344fe21c0522ab81e9f8e848206875370cae4d908ac2656192ad6910ebb685036573b442ec1cff490c1638b7f5a181ae6d6bc9a04a305720559c893611f836321c2beb69dbf3694b9305a988c77e0a451c38674e84ce95a912833d2cf4ca9d48cc76d8250d0130740145ca19e20b1513bb93ca7665c1f110493d1b5aa344702109df5feca790f988eaa02f92e019721ae0e8bfaa9fdcd3401ffb4433fbe6e575ed9f704a6dc60872f0d23b2f43bfe5e64ce0fbc71283e6dedee79e20ad878917fa4a8257f879527c58f89a8670be591fc2815f7e7a8d74a9830788404f66170058dd7a08f47c4954324088dbed2f330015ccc36d29efd392a3cd5bf9835871f6b4b203c228af16f5b461676ce8e51003afd3137978117cf41147f2bb615a7c338bebdca5f81a43fe9b51480ae52ce04cf2f2b1714599fe09ae8401e0e155b4caa89fb37b00c604517fc36961f84901a73a343bb40",
};

type OracleConfig = {
  apiPrefix: string;
  pubKey: string;
};

export class WitnessOracle {
  api: WitnessOnChainApi;
  rabinPubKey: BN;
  rabinPubKeyHash: Buffer;

  constructor(oracleConfig: OracleConfig = defaultOracleConfig) {
    this.api = new WitnessOnChainApi(oracleConfig.apiPrefix);
    this.rabinPubKey = BN.fromString(oracleConfig.pubKey, 16);
    this.rabinPubKeyHash = bsv.crypto.Hash.sha256ripemd160(
      Buffer.from(oracleConfig.pubKey, "hex")
    );
  }
}

export type ParamUtxo = {
  txId: string;
  outputIndex: number;
  satoshis: number;
  address: string;
};

export async function createNftAuctionContractTx(
  provider: SensiblequeryProvider,
  {
    nftSigner,
    witnessOracle,
    nftInput,
    senderAddress,
    startBsvPrice,
    endTimeStamp,
    opreturnData,
    utxos,
    changeAddress,
  }: {
    nftSigner: NftSigner;
    witnessOracle: WitnessOracle;
    senderAddress: string;
    startBsvPrice: number;
    endTimeStamp: number;
    nftInput: NftInput;
    opreturnData?: any;
    utxos: ParamUtxo[];
    changeAddress?: string;
  }
): Promise<{
  nftAuctionContract: NftAuction;
  txComposer: TxComposer;
  auctionContractHash: string;
}> {
  if (!changeAddress) {
    changeAddress = utxos[0].address;
  }

  if (utxos.length > 3) {
    throw new Error(
      "Bsv utxos should be no more than 3 in this operation, please merge it first "
    );
  }

  let nftAuctionContract = NftAuctionFactory.createContract();
  nftAuctionContract.setFormatedDataPart({
    rabinPubKeyHashArrayHash:
      nftSigner.rabinPubKeyHashArrayHash.toString("hex"),
    timeRabinPubkeyHash: witnessOracle.rabinPubKeyHash.toString("hex"),
    endTimestamp: endTimeStamp,
    nftID: toHex(nftProto.getNftID(nftInput.lockingScript.toBuffer())),
    nftCodeHash: nftInput.codehash,
    startBsvPrice,
    senderAddress: new bsv.Address(senderAddress).hashBuffer.toString("hex"),
    bidTimestamp: 0,
    bidBsvPrice: 0,
    bidderAddress: getZeroAddress(provider.network).hashBuffer.toString("hex"),
    sensibleID: {
      txid: utxos[0].txId,
      index: utxos[0].outputIndex,
    },
  });
  const txComposer = new TxComposer();

  const p2pkhInputIndexs = utxos.map((utxo) => {
    const inputIndex = txComposer.appendP2PKHInput(utxo);
    txComposer.addInputInfo({
      inputIndex,
      address: utxo.address.toString(),
      sighashType,
    });
    return inputIndex;
  });

  const nftAuctionOutputIndex = txComposer.appendOutput({
    lockingScript: nftAuctionContract.lockingScript,
    satoshis: txComposer.getDustThreshold(
      nftAuctionContract.lockingScript.toBuffer().length
    ),
  });

  if (opreturnData) {
    txComposer.appendOpReturnOutput(opreturnData);
  }

  let changeOutputIndex = txComposer.appendChangeOutput(changeAddress);

  txComposer.checkFeeRate();
  let auctionContractHash = bsv.crypto.Hash.sha256ripemd160(
    nftAuctionContract.lockingScript.toBuffer()
  ).toString("hex");
  return {
    nftAuctionContract,
    txComposer,
    auctionContractHash,
  };
}

export async function createNftForAuctionContractTx(
  provider: SensiblequeryProvider,
  {
    nftInput,
    auctionContractHash,
    opreturnData,
    utxos,
    changeAddress,
  }: {
    auctionContractHash: string;
    nftInput: NftInput;
    opreturnData?: any;
    utxos: ParamUtxo[];
    changeAddress?: string;
  }
): Promise<{
  nftForAuctionContract: NftForAuction;
  txComposer: TxComposer;
  nftForAuctionAddress: string;
}> {
  if (!changeAddress) {
    changeAddress = utxos[0].address;
  }

  if (utxos.length > 3) {
    throw new Error(
      "Bsv utxos should be no more than 3 in this operation, please merge it first "
    );
  }
  let nftForAuctionContract = NftForAuctionFactory.createContract(
    new Bytes(auctionContractHash)
  );
  nftForAuctionContract.setFormatedDataPart({
    codehash: nftInput.codehash,
    auctionContractHash,
    nftID: toHex(nftProto.getNftID(nftInput.lockingScript.toBuffer())),
  });

  const txComposer = new TxComposer();

  const p2pkhInputIndexs = utxos.map((utxo) => {
    const inputIndex = txComposer.appendP2PKHInput(utxo);
    txComposer.addInputInfo({
      inputIndex,
      address: utxo.address.toString(),
      sighashType,
    });
    return inputIndex;
  });

  const nftForAuctionOutputIndex = txComposer.appendOutput({
    lockingScript: nftForAuctionContract.lockingScript,
    satoshis: txComposer.getDustThreshold(
      nftForAuctionContract.lockingScript.toBuffer().length
    ),
  });

  if (opreturnData) {
    txComposer.appendOpReturnOutput(opreturnData);
  }

  let changeOutputIndex = txComposer.appendChangeOutput(changeAddress);

  txComposer.checkFeeRate();

  let nftForAuctionAddress = new bsv.Address(
    Utils.getScriptHashBuf(nftForAuctionContract.lockingScript.toBuffer()),
    provider.network
  ).toString();

  return {
    nftForAuctionContract,
    txComposer,
    nftForAuctionAddress,
  };
}

export type NftAuctionInput = {
  txId: string;
  outputIndex: number;
  satoshis?: number;
  lockingScript?: bsv.Script;

  satotxInfo?: {
    txId: string;
    outputIndex: number;
    txHex: string;
    preTxId: string;
    preOutputIndex: number;
    preTxHex: string;
  };

  // senderAddress: bsv.Address;

  preBidTimestamp?: number;
  preBsvBidPrice?: number;
  preBidder?: bsv.Address;

  bsvBidPrice?: number;
  bidder?: bsv.Address;
  senderAddress?: bsv.Address;
  startBsvPrice?: number;
  nftCodeHash?: string;
  nftID?: string;
  endTimeStamp?: number;

  preLockingScript?: bsv.Script;
};

type NftAuctionUtxo = {
  txId: string;
  outputIndex: number;
};

export async function getNftAuctionInput(
  provider: SensiblequeryProvider,
  {
    nftAuctionUtxo,
  }: {
    nftAuctionUtxo: NftAuctionUtxo;
  }
) {
  let nftAuctionInput: NftAuctionInput = {
    txId: nftAuctionUtxo.txId,
    outputIndex: nftAuctionUtxo.outputIndex,
  };

  let txHex = await provider.getRawTxData(nftAuctionInput.txId);
  const tx = new bsv.Transaction(txHex);

  let input = tx.inputs[0];
  let preTxId = input.prevTxId.toString("hex");
  let preOutputIndex = input.outputIndex;
  let preTxHex = await provider.getRawTxData(preTxId);
  const preTx = new bsv.Transaction(preTxHex);

  nftAuctionInput.satotxInfo = {
    txId: nftAuctionInput.txId,
    outputIndex: nftAuctionInput.outputIndex,
    txHex,
    preTxId,
    preOutputIndex,
    preTxHex,
  };

  nftAuctionInput.preLockingScript = preTx.outputs[preOutputIndex].script;
  nftAuctionInput.lockingScript =
    tx.outputs[nftAuctionInput.outputIndex].script;
  nftAuctionInput.satoshis = tx.outputs[nftAuctionInput.outputIndex].satoshis;

  let curScriptBuf = nftAuctionInput.lockingScript.toBuffer();
  let preScriptBuf = preTx.outputs[preOutputIndex].script.toBuffer();
  if (!nftAuctionProto.getBidderAddress(preScriptBuf)) {
    nftAuctionInput.preBidder = getZeroAddress(provider.network);
    nftAuctionInput.preBsvBidPrice = 0;
    nftAuctionInput.preBidTimestamp = 0;
  } else {
    nftAuctionInput.preBidder = bsv.Address.fromPublicKeyHash(
      Buffer.from(nftAuctionProto.getBidderAddress(preScriptBuf), "hex"),
      provider.network
    );
    nftAuctionInput.preBsvBidPrice =
      nftAuctionProto.getBidBsvPrice(preScriptBuf);
    nftAuctionInput.preBidTimestamp =
      nftAuctionProto.getBidTimestamp(preScriptBuf);
  }

  nftAuctionInput.senderAddress = bsv.Address.fromPublicKeyHash(
    Buffer.from(nftAuctionProto.getSenderAddress(curScriptBuf), "hex"),
    provider.network
  );
  nftAuctionInput.startBsvPrice =
    nftAuctionProto.getStartBsvPrice(curScriptBuf);
  nftAuctionInput.nftCodeHash = nftAuctionProto.getCodeHash(curScriptBuf);
  nftAuctionInput.nftID = nftAuctionProto.getNftID(curScriptBuf);
  nftAuctionInput.endTimeStamp = nftAuctionProto.getEndTimestamp(curScriptBuf);
  nftAuctionInput.bidder = bsv.Address.fromPublicKeyHash(
    Buffer.from(nftAuctionProto.getBidderAddress(curScriptBuf), "hex"),
    provider.network
  );
  nftAuctionInput.bsvBidPrice = nftAuctionProto.getBidBsvPrice(curScriptBuf);

  return nftAuctionInput;
}

export async function createBidTx({
  nftSigner,
  witnessOracle,

  nftAuctionInput,

  bsvBidPrice,
  bidderAddress,

  opreturnData,
  utxos,
  changeAddress,
}: {
  nftSigner: NftSigner;
  witnessOracle: WitnessOracle;

  nftAuctionInput: NftAuctionInput;

  bsvBidPrice: number;
  bidderAddress: string;

  opreturnData?: any;
  utxos?: any[];
  changeAddress?: string;
}) {
  if (!changeAddress) {
    changeAddress = utxos[0].address;
  }

  if (utxos.length > 3) {
    throw new Error(
      "Bsv utxos should be no more than 3 in this operation, please merge it first "
    );
  }

  let { rabinDatas, rabinPubKeyIndexArray, rabinPubKeyVerifyArray } =
    await getRabinDatas(nftSigner.signers, nftSigner.signerSelecteds, [
      nftAuctionInput.satotxInfo,
    ]);

  let oracleData = await witnessOracle.api.getTimestamp();

  const txComposer = new TxComposer();
  let prevouts = new Prevouts();

  const nftAuctionInputIndex = txComposer.appendInput(nftAuctionInput);
  prevouts.addVout(nftAuctionInput.txId, nftAuctionInput.outputIndex);

  const p2pkhInputIndexs = utxos.map((utxo) => {
    const inputIndex = txComposer.appendP2PKHInput(utxo);
    prevouts.addVout(utxo.txId, utxo.outputIndex);
    txComposer.addInputInfo({
      inputIndex,
      address: utxo.address.toString(),
      sighashType,
    });
    return inputIndex;
  });

  let nftAuctionScriptBuf = nftAuctionInput.lockingScript.toBuffer();
  let dataPartObj = nftAuctionProto.parseDataPart(nftAuctionScriptBuf);
  dataPartObj.bidTimestamp = oracleData.timestamp * 1000;
  dataPartObj.bidBsvPrice = bsvBidPrice;
  dataPartObj.bidderAddress = new bsv.Address(
    bidderAddress
  ).hashBuffer.toString("hex");
  const newNftAuctionScript = nftAuctionProto.updateScript(
    nftAuctionScriptBuf,
    dataPartObj
  );

  txComposer.appendOutput({
    lockingScript: bsv.Script.fromBuffer(newNftAuctionScript),
    satoshis: bsvBidPrice,
  });

  if (nftAuctionInput.bsvBidPrice > 0) {
    txComposer.appendP2PKHOutput({
      address: nftAuctionInput.bidder,
      satoshis: nftAuctionInput.bsvBidPrice,
    });
  }

  //tx addOutput OpReturn
  let opreturnScriptHex = "";
  if (opreturnData) {
    const opreturnOutputIndex = txComposer.appendOpReturnOutput(opreturnData);
    opreturnScriptHex = txComposer
      .getOutput(opreturnOutputIndex)
      .script.toHex();
  }

  //The first round of calculations get the exact size of the final transaction, and then change again
  //Due to the change, the script needs to be unlocked again in the second round
  //let the fee to be exact in the second round
  for (let c = 0; c < 2; c++) {
    txComposer.clearChangeOutput();
    const changeOutputIndex = txComposer.appendChangeOutput(changeAddress);

    const nftAuctionContract = NftAuctionFactory.createContract();
    let dataPartObj = nftAuctionProto.parseDataPart(
      nftAuctionInput.lockingScript.toBuffer()
    );
    nftAuctionContract.setFormatedDataPart(dataPartObj);
    const unlockingContract = nftAuctionContract.bid({
      txPreimage: new SigHashPreimage(
        txComposer.getPreimage(
          nftAuctionInputIndex,
          Signature.SIGHASH_ALL |
            Signature.SIGHASH_ANYONECANPAY |
            Signature.SIGHASH_FORKID
        )
      ),
      bidTimestamp: oracleData.timestamp * 1000,
      bsvBidPrice: bsvBidPrice,
      bidder: new Ripemd160(
        new bsv.Address(bidderAddress).hashBuffer.toString("hex")
      ),
      preBidTimestamp: nftAuctionInput.preBidTimestamp,
      preBsvBidPrice: nftAuctionInput.preBsvBidPrice,
      preBidder: new Ripemd160(
        nftAuctionInput.preBidder.hashBuffer.toString("hex")
      ),
      changeAddress: new Ripemd160(
        toHex(new bsv.Address(changeAddress).hashBuffer)
      ),
      changeSatoshis:
        changeOutputIndex != -1
          ? txComposer.getOutput(changeOutputIndex).satoshis
          : 0,
      opReturnScript: new Bytes(opreturnScriptHex),

      timeRabinMsg: new Bytes(oracleData.digest),
      timeRabinPadding: new Bytes(oracleData.signatures.rabin.padding),
      timeRabinSig: new Bytes(oracleData.signatures.rabin.signature),
      timeRabinPubKey: new Bytes(witnessOracle.rabinPubKey.toString("hex")),

      rabinMsg: rabinDatas[0].rabinMsg,
      rabinPaddingArray: rabinDatas[0].rabinPaddingArray,
      rabinSigArray: rabinDatas[0].rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray: nftSigner.rabinPubKeyHashArray,
    });

    let ret = unlockingContract.verify({
      tx: txComposer.getTx(),
      inputIndex: nftAuctionInputIndex,
      inputSatoshis: txComposer.getInput(nftAuctionInputIndex).output.satoshis,
    });
    if (ret.success == false) throw ret;
    txComposer
      .getInput(nftAuctionInputIndex)
      .setScript(unlockingContract.toScript() as bsv.Script);
  }

  txComposer.checkFeeRate();

  return {
    txComposer,
  };
}

export async function createWithdrawTx({
  nftSigner,
  witnessOracle,

  nftInput,

  nftForAuctionContract,
  nftForAuctionTxComposer,

  nftAuctionInput,

  nftUnlockCheckContract,
  nftUnlockCheckTxComposer,

  opreturnData,
  utxos,
  changeAddress,
}: {
  nftSigner: NftSigner;
  witnessOracle: WitnessOracle;

  nftInput: NftInput;

  nftAuctionInput: NftAuctionInput;

  nftForAuctionContract: NftForAuction;
  nftForAuctionTxComposer: TxComposer;

  nftUnlockCheckContract: NftUnlockContractCheck;
  nftUnlockCheckTxComposer: TxComposer;

  buyerPublicKey?: string;
  opreturnData?: any;
  utxos?: ParamUtxo[];
  changeAddress?: string;
}) {
  if (!changeAddress) {
    changeAddress = utxos[0].address;
  }

  if (utxos.length > 3) {
    throw new Error(
      "Bsv utxos should be no more than 3 in this operation, please merge it first "
    );
  }

  let nftForAuctionUtxo = {
    txId: nftForAuctionTxComposer.getTxId(),
    outputIndex: 0,
    satoshis: nftForAuctionTxComposer.getOutput(0).satoshis,
    lockingScript: nftForAuctionTxComposer.getOutput(0).script,
  };

  let unlockCheckUtxo = {
    txId: nftUnlockCheckTxComposer.getTxId(),
    outputIndex: 0,
    satoshis: nftUnlockCheckTxComposer.getOutput(0).satoshis,
    lockingScript: nftUnlockCheckTxComposer.getOutput(0).script,
  };

  let {
    rabinDatas,
    checkRabinData,
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
  } = await getRabinDatas(nftSigner.signers, nftSigner.signerSelecteds, [
    nftInput.satotxInfo,
  ]);

  let auctionRabin = await getRabinDatas(
    nftSigner.signers,
    nftSigner.signerSelecteds,
    [nftAuctionInput.satotxInfo]
  );

  let nftAuctionRabinData = await getRabinDatas(
    nftSigner.signers,
    nftSigner.signerSelecteds,
    [nftAuctionInput.satotxInfo]
  );

  let oracleData = await witnessOracle.api.getTimestamp();

  let hasBidder = nftAuctionInput.bsvBidPrice != 0;
  let nftAddress = hasBidder
    ? nftAuctionInput.bidder
    : nftAuctionInput.senderAddress;

  const txComposer = new TxComposer();
  let prevouts = new Prevouts();

  const nftForAuctionInputIndex = txComposer.appendInput(nftForAuctionUtxo);
  prevouts.addVout(nftForAuctionUtxo.txId, nftForAuctionUtxo.outputIndex);
  if (!hasBidder) {
    txComposer.addInputInfo({
      inputIndex: nftForAuctionInputIndex,
      address: nftAuctionInput.senderAddress.toString(),
      sighashType: NftForAuction.sighashType,
    });
  }

  const nftAuctionInputIndex = txComposer.appendInput(nftAuctionInput);
  prevouts.addVout(nftAuctionInput.txId, nftAuctionInput.outputIndex);
  if (!hasBidder) {
    txComposer.addInputInfo({
      inputIndex: nftAuctionInputIndex,
      address: nftAuctionInput.senderAddress.toString(),
      sighashType: NftAuction.sighashType,
    });
  }

  const nftInputIndex = txComposer.appendInput(nftInput);
  prevouts.addVout(nftInput.txId, nftInput.outputIndex);

  const p2pkhInputIndexs = utxos.map((utxo) => {
    const inputIndex = txComposer.appendP2PKHInput(utxo);
    prevouts.addVout(utxo.txId, utxo.outputIndex);
    txComposer.addInputInfo({
      inputIndex,
      address: utxo.address.toString(),
      sighashType,
    });
    return inputIndex;
  });

  const unlockCheckInputIndex = txComposer.appendInput(unlockCheckUtxo);
  prevouts.addVout(unlockCheckUtxo.txId, unlockCheckUtxo.outputIndex);

  //tx addOutput nft
  const nftScriptBuf = nftInput.lockingScript.toBuffer();
  let dataPartObj = nftProto.parseDataPart(nftScriptBuf);
  dataPartObj.nftAddress = toHex(nftAddress.hashBuffer);
  const lockingScriptBuf = nftProto.updateScript(nftScriptBuf, dataPartObj);
  const nftOutputIndex = txComposer.appendOutput({
    lockingScript: bsv.Script.fromBuffer(lockingScriptBuf),
    satoshis: txComposer.getDustThreshold(lockingScriptBuf.length),
  });

  if (hasBidder) {
    txComposer.appendP2PKHOutput({
      address: nftAuctionInput.senderAddress,
      satoshis: nftAuctionInput.bsvBidPrice,
    });
  }

  //tx addOutput OpReturn
  let opreturnScriptHex = "";
  if (opreturnData) {
    const opreturnOutputIndex = txComposer.appendOpReturnOutput(opreturnData);
    opreturnScriptHex = txComposer
      .getOutput(opreturnOutputIndex)
      .script.toHex();
  }

  //The first round of calculations get the exact size of the final transaction, and then change again
  //Due to the change, the script needs to be unlocked again in the second round
  //let the fee to be exact in the second round

  for (let c = 0; c < 2; c++) {
    txComposer.clearChangeOutput();
    const changeOutputIndex = txComposer.appendChangeOutput(changeAddress);

    const nftAuctionContract = NftAuctionFactory.createContract();
    nftAuctionContract.setFormatedDataPart(
      nftAuctionProto.parseDataPart(nftAuctionInput.lockingScript.toBuffer())
    );
    const unlockingContract0 = nftAuctionContract.unlock({
      txPreimage: new SigHashPreimage(
        txComposer.getPreimage(nftAuctionInputIndex, NftAuction.sighashType)
      ),
      nftScript: new Bytes(nftInput.lockingScript.toBuffer().toString("hex")),
      nftOutputSatoshis: nftInput.satoshis,
      preBidTimestamp: nftAuctionInput.preBidTimestamp,
      preBsvBidPrice: nftAuctionInput.preBsvBidPrice,
      preBidder: new Ripemd160(
        nftAuctionInput.preBidder.hashBuffer.toString("hex")
      ),
      changeAddress: new Ripemd160(
        toHex(new bsv.Address(changeAddress).hashBuffer)
      ),
      changeSatoshis:
        changeOutputIndex != -1
          ? txComposer.getOutput(changeOutputIndex).satoshis
          : 0,
      opReturnScript: new Bytes(opreturnScriptHex),

      timeRabinMsg: new Bytes(oracleData.digest),
      timeRabinPadding: new Bytes(oracleData.signatures.rabin.padding),
      timeRabinSig: new Bytes(oracleData.signatures.rabin.signature),
      timeRabinPubKey: new Bytes(witnessOracle.rabinPubKey.toString("hex")),

      rabinMsg: nftAuctionRabinData.rabinDatas[0].rabinMsg,
      rabinPaddingArray: nftAuctionRabinData.rabinDatas[0].rabinPaddingArray,
      rabinSigArray: nftAuctionRabinData.rabinDatas[0].rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray: nftSigner.rabinPubKeyHashArray,
      senderPubKey: new PubKey(hasBidder ? "00" : PLACE_HOLDER_PUBKEY),
      senderSig: new Sig(hasBidder ? "00" : PLACE_HOLDER_SIG),
    });

    txComposer
      .getInput(nftAuctionInputIndex)
      .setScript(unlockingContract0.toScript() as bsv.Script);

    const nftContract = NftFactory.createContract(
      nftSigner.unlockContractCodeHashArray
    );
    let dataPartObj = nftProto.parseDataPart(nftInput.lockingScript.toBuffer());
    nftContract.setFormatedDataPart(dataPartObj);
    const unlockingContract = nftContract.unlock({
      txPreimage: new SigHashPreimage(txComposer.getPreimage(nftInputIndex)),
      prevouts: new Bytes(prevouts.toHex()),
      rabinMsg: rabinDatas[0].rabinMsg,
      rabinPaddingArray: rabinDatas[0].rabinPaddingArray,
      rabinSigArray: rabinDatas[0].rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray: nftSigner.rabinPubKeyHashArray,
      prevNftAddress: new Bytes(toHex(nftInput.preNftAddress.hashBuffer)),
      checkInputIndex: unlockCheckInputIndex,
      checkScriptTx: new Bytes(nftUnlockCheckTxComposer.getRawHex()),
      checkScriptTxOutIndex: 0,
      lockContractInputIndex: nftForAuctionInputIndex,
      lockContractTx: new Bytes(nftForAuctionTxComposer.getRawHex()),
      lockContractTxOutIndex: 0,
      operation: nftProto.NFT_OP_TYPE.UNLOCK_FROM_CONTRACT,
    });

    txComposer
      .getInput(nftInputIndex)
      .setScript(unlockingContract.toScript() as bsv.Script);

    let otherOutputs = Buffer.alloc(0);
    txComposer.getTx().outputs.forEach((output, index) => {
      if (index != nftOutputIndex) {
        let outputBuf = output.toBufferWriter().toBuffer();
        let lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32LE(outputBuf.length);
        otherOutputs = Buffer.concat([otherOutputs, lenBuf, outputBuf]);
      }
    });
    let unlockCall = nftUnlockCheckContract.unlock({
      txPreimage: new SigHashPreimage(
        txComposer.getPreimage(unlockCheckInputIndex)
      ),
      nftInputIndex,
      nftScript: new Bytes(nftInput.lockingScript.toHex()),
      prevouts: new Bytes(prevouts.toHex()),
      rabinMsg: checkRabinData.rabinMsg,
      rabinPaddingArray: checkRabinData.rabinPaddingArray,
      rabinSigArray: checkRabinData.rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray: nftSigner.rabinPubKeyHashArray,
      nOutputs: txComposer.getTx().outputs.length,
      nftOutputIndex,
      nftOutputAddress: new Bytes(toHex(nftAddress.hashBuffer)),
      nftOutputSatoshis: txComposer.getOutput(nftOutputIndex).satoshis,
      otherOutputArray: new Bytes(toHex(otherOutputs)),
    });
    txComposer
      .getInput(unlockCheckInputIndex)
      .setScript(unlockCall.toScript() as bsv.Script);

    let unlockCall2 = nftForAuctionContract.unlock({
      txPreimage: new SigHashPreimage(
        txComposer.getPreimage(
          nftForAuctionInputIndex,
          NftForAuction.sighashType
        )
      ),
      prevouts: new Bytes(prevouts.toHex()),
      nftInputIndex,
      nftScript: new Bytes(nftInput.lockingScript.toHex()),
      nftOutputSatoshis: txComposer.getOutput(nftOutputIndex).satoshis,
      auctionInputIndex: nftAuctionInputIndex,
      auctionScript: new Bytes(nftAuctionInput.lockingScript.toHex()),

      nftRabinMsg: checkRabinData.rabinMsg,
      nftRabinPaddingArray: checkRabinData.rabinPaddingArray,
      nftRabinSigArray: checkRabinData.rabinSigArray,

      auctionRabinMsg: auctionRabin.checkRabinData.rabinMsg,
      auctionRabinPaddingArray: auctionRabin.checkRabinData.rabinPaddingArray,
      auctionRabinSigArray: auctionRabin.checkRabinData.rabinSigArray,

      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray: nftSigner.rabinPubKeyHashArray,

      timeRabinMsg: new Bytes(oracleData.digest),
      timeRabinPadding: new Bytes(oracleData.signatures.rabin.padding),
      timeRabinSig: new Bytes(oracleData.signatures.rabin.signature),
      timeRabinPubKey: new Bytes(witnessOracle.rabinPubKey.toString("hex")),
      senderPubKey: new PubKey(hasBidder ? "00" : PLACE_HOLDER_PUBKEY),
      senderSig: new Sig(hasBidder ? "00" : PLACE_HOLDER_SIG),
    });
    txComposer
      .getInput(nftForAuctionInputIndex)
      .setScript(unlockCall2.toScript() as bsv.Script);
  }

  txComposer.checkFeeRate();

  return {
    txComposer,
  };
}
