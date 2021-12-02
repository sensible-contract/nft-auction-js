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
  RABIN_SIG_LEN,
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
const PLACE_HOLDER_UNSIGN_TXID =
  "4444444444444444444444444444444888888888888888888888888888888888";
const PLACE_HOLDER_UNSIGN_TXID_REVERSE =
  "8888888888888888888888888888888884444444444444444444444444444444";
const PLACE_HOLDER_UNSIGN_PREVOUTS =
  "4444444444444444444444444444444444444444444444444444444444444444";
const PLACE_HOLDER_UNSIGN_CHECKTX =
  "504c4143455f484f4c4445525f554e5349474e5f434845434b5458";

let defaultOracleConfig = {
  apiPrefix: "https://woc.satoplay.com",
  pubKey:
    "2c8c0117aa5edba9a4539e783b6a1bdbc1ad88ad5b57f3d9c5cba55001c45e1fedb877ebc7d49d1cfa8aa938ccb303c3a37732eb0296fee4a6642b0ff1976817b603404f64c41ec098f8cd908caf64b4a3aada220ff61e252ef6d775079b69451367eda8fdb37bc55c8bfd69610e1f31b9d421ff44e3a0cfa7b11f334374827256a0b91ce80c45ffb798798e7bd6b110134e1a3c3fa89855a19829aab3922f55da92000495737e99e0094e6c4dbcc4e8d8de5459355c21ff055d039a202076e4ca263b745a885ef292eec0b5a5255e6ecc45534897d9572c3ebe97d36626c7b1e775159e00b17d03bc6d127260e13a252afd89bab72e8daf893075f18c1840cb394f18a9817913a9462c6ffc8951bee50a05f38da4c9090a4d6868cb8c955e5efb4f3be4e7cf0be1c399d78a6f6dd26a0af8492dca67843c6da9915bae571aa9f4696418ab1520dd50dd05f5c0c7a51d2843bd4d9b6b3b79910e98f3d98099fd86d71b2fac290e32bdacb31943a8384a7668c32a66be127b74390b4b0dec6455",
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
      Utils.toBufferLE(this.rabinPubKey.toString(16), RABIN_SIG_LEN)
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

  let nftID = toHex(nftProto.getNftID(nftInput.lockingScript.toBuffer()));
  let nftAuctionContract = NftAuctionFactory.createContract(
    new Ripemd160(new bsv.Address(senderAddress).hashBuffer.toString("hex")),
    startBsvPrice,
    new Bytes(witnessOracle.rabinPubKeyHash.toString("hex")),
    new Bytes(nftInput.codehash),
    new Bytes(nftID),
    endTimeStamp,
    new Bytes(toHex(nftSigner.rabinPubKeyHashArrayHash))
  );
  nftAuctionContract.setFormatedDataPart({
    rabinPubKeyHashArrayHash:
      nftSigner.rabinPubKeyHashArrayHash.toString("hex"),
    timeRabinPubkeyHash: witnessOracle.rabinPubKeyHash.toString("hex"),
    endTimestamp: endTimeStamp,
    nftID: toHex(nftProto.getNftID(nftInput.lockingScript.toBuffer())),
    nftCodeHash: nftInput.codehash,
    startBsvPrice,
    senderAddress: new bsv.Address(senderAddress).hashBuffer.toString("hex"),
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
  console.log(auctionContractHash, "auction");
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
  } else {
    nftAuctionInput.preBidder = bsv.Address.fromPublicKeyHash(
      Buffer.from(nftAuctionProto.getBidderAddress(preScriptBuf), "hex"),
      provider.network
    );
    nftAuctionInput.preBsvBidPrice =
      nftAuctionProto.getBidBsvPrice(preScriptBuf);
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

    const nftAuctionContract = NftAuctionFactory.createContract(
      new Ripemd160(nftAuctionInput.senderAddress.hashBuffer.toString("hex")),
      nftAuctionInput.startBsvPrice,
      new Bytes(witnessOracle.rabinPubKeyHash.toString("hex")),
      new Bytes(nftAuctionInput.nftCodeHash),
      new Bytes(nftAuctionInput.nftID),
      nftAuctionInput.endTimeStamp,
      new Bytes(toHex(nftSigner.rabinPubKeyHashArrayHash))
    );
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
      bsvBidPrice: bsvBidPrice,
      bidder: new Ripemd160(
        new bsv.Address(bidderAddress).hashBuffer.toString("hex")
      ),
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
      timeRabinSig: new Bytes(
        Utils.toBufferLE(
          oracleData.signatures.rabin.signature,
          RABIN_SIG_LEN
        ).toString("hex")
      ),
      timeRabinPubKey: new Bytes(
        Utils.toBufferLE(
          witnessOracle.rabinPubKey.toString(16),
          RABIN_SIG_LEN
        ).toString("hex")
      ),

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

    const nftAuctionContract = NftAuctionFactory.createContract(
      new Ripemd160(nftAuctionInput.senderAddress.hashBuffer.toString("hex")),
      nftAuctionInput.startBsvPrice,
      new Bytes(witnessOracle.rabinPubKeyHash.toString("hex")),
      new Bytes(nftAuctionInput.nftCodeHash),
      new Bytes(nftAuctionInput.nftID),
      nftAuctionInput.endTimeStamp,
      new Bytes(toHex(nftSigner.rabinPubKeyHashArrayHash))
    );
    nftAuctionContract.setFormatedDataPart(
      nftAuctionProto.parseDataPart(nftAuctionInput.lockingScript.toBuffer())
    );
    const unlockingContract0 = nftAuctionContract.unlock({
      txPreimage: new SigHashPreimage(
        txComposer.getPreimage(nftAuctionInputIndex, NftAuction.sighashType)
      ),
      nftScript: new Bytes(nftInput.lockingScript.toBuffer().toString("hex")),
      nftOutputSatoshis: nftInput.satoshis,
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
      timeRabinSig: new Bytes(
        Utils.toBufferLE(
          oracleData.signatures.rabin.signature,
          RABIN_SIG_LEN
        ).toString("hex")
      ),
      timeRabinPubKey: new Bytes(
        Utils.toBufferLE(
          witnessOracle.rabinPubKey.toString(16),
          RABIN_SIG_LEN
        ).toString("hex")
      ),

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
      timeRabinSig: new Bytes(
        Utils.toBufferLE(
          oracleData.signatures.rabin.signature,
          RABIN_SIG_LEN
        ).toString("hex")
      ),
      timeRabinPubKey: new Bytes(
        Utils.toBufferLE(
          witnessOracle.rabinPubKey.toString(16),
          RABIN_SIG_LEN
        ).toString("hex")
      ),
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
