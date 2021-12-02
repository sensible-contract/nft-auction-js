import * as bsv from "@sensible-contract/bsv";
import { ContractAdapter } from "@sensible-contract/sdk-core";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  Int,
  PubKey,
  Ripemd160,
  Sig,
  SigHashPreimage,
  toHex,
} from "@sensible-contract/sdk-core/lib/scryptlib";
import * as nftAuctionProto from "../contract-proto/nftAuction.proto";
const Signature = bsv.crypto.Signature;
export class NftAuction extends ContractAdapter {
  private _formatedDataPart: nftAuctionProto.FormatedDataPart;
  static sighashType: number =
    Signature.SIGHASH_ALL |
    Signature.SIGHASH_ANYONECANPAY |
    Signature.SIGHASH_FORKID;

  constuctParams: {
    senderAddress: Ripemd160;
    startBsvPrice: number;
    timeRabinPubKeyHash: Bytes;
    nftCodeHash: Bytes;
    nftID: Bytes;
    endTimeStamp: number;
    rabinPubKeyHashArrayHash: Bytes;
  };

  static getClass() {
    const desc = require("../contract-desc/nftAuction_desc.json");
    let NftSellContractClass = buildContractClass(desc);
    return NftSellContractClass;
  }

  constructor(constuctParams: {
    senderAddress: Ripemd160;
    startBsvPrice: number;
    timeRabinPubKeyHash: Bytes;
    nftCodeHash: Bytes;
    nftID: Bytes;
    endTimeStamp: number;
    rabinPubKeyHashArrayHash: Bytes;
  }) {
    let NftAuctionContractClass = NftAuction.getClass();
    let contract = new NftAuctionContractClass(
      constuctParams.senderAddress,
      constuctParams.startBsvPrice,
      constuctParams.timeRabinPubKeyHash,

      constuctParams.nftCodeHash,
      constuctParams.nftID,
      constuctParams.endTimeStamp,
      constuctParams.rabinPubKeyHashArrayHash
    );
    super(contract);
    this.constuctParams = constuctParams;
  }

  clone() {
    let contract = new NftAuction(this.constuctParams);
    contract.setFormatedDataPart(this.getFormatedDataPart());
    return contract;
  }

  public setFormatedDataPart(dataPart: nftAuctionProto.FormatedDataPart): void {
    this._formatedDataPart = Object.assign(
      {},
      this._formatedDataPart,
      dataPart
    );
    this._formatedDataPart.protoVersion = nftAuctionProto.PROTO_VERSION;
    this._formatedDataPart.protoType = 0x00010004;
    super.setDataPart(
      toHex(nftAuctionProto.newDataPart(this._formatedDataPart))
    );
  }

  public getFormatedDataPart() {
    return this._formatedDataPart;
  }

  public setFormatedDataPartFromLockingScript(script: bsv.Script) {
    let dataPart = nftAuctionProto.parseDataPart(script.toBuffer());
    this.setFormatedDataPart(dataPart);
  }

  public unlock({
    txPreimage,
    nftScript,
    nftOutputSatoshis,
    preBsvBidPrice,
    preBidder,
    changeAddress,
    changeSatoshis,
    opReturnScript,
    timeRabinMsg,
    timeRabinSig,
    timeRabinPadding,
    timeRabinPubKey,
    rabinMsg,
    rabinPaddingArray,
    rabinSigArray,
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
    rabinPubKeyHashArray,
    senderPubKey,
    senderSig,
  }: {
    txPreimage: SigHashPreimage;
    nftScript?: Bytes;
    nftOutputSatoshis?: number;
    preBsvBidPrice?: number;
    preBidder?: Ripemd160;
    changeAddress?: Ripemd160;
    changeSatoshis?: number;
    opReturnScript?: Bytes;
    timeRabinMsg?: Bytes;
    timeRabinSig?: Bytes;
    timeRabinPadding?: Bytes;
    timeRabinPubKey?: Bytes;
    rabinMsg?: Bytes;
    rabinPaddingArray?: Bytes[];
    rabinSigArray?: Int[];
    rabinPubKeyIndexArray?: number[];
    rabinPubKeyVerifyArray?: Int[];
    rabinPubKeyHashArray: Bytes;
    senderPubKey?: PubKey;
    senderSig?: Sig;
  }) {
    // if (!senderPubKey) {
    //   senderPubKey = new PubKey("00");
    //   senderSig = new Sig("00");
    // }
    return this._contract.unlock(
      txPreimage,
      nftScript,
      nftOutputSatoshis,
      preBsvBidPrice,
      preBidder,
      changeAddress,
      changeSatoshis,
      opReturnScript,
      timeRabinMsg,
      timeRabinSig,
      timeRabinPadding,
      timeRabinPubKey,
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray,
      senderPubKey,
      senderSig
    ) as FunctionCall;
  }

  public bid({
    txPreimage,
    bsvBidPrice,
    bidder,
    preBsvBidPrice,
    preBidder,
    changeAddress,
    changeSatoshis,
    opReturnScript,
    timeRabinMsg,
    timeRabinSig,
    timeRabinPadding,
    timeRabinPubKey,
    rabinMsg,
    rabinPaddingArray,
    rabinSigArray,
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
    rabinPubKeyHashArray,
  }: {
    txPreimage: SigHashPreimage;
    bsvBidPrice?: number;
    bidder?: Ripemd160;
    preBsvBidPrice?: number;
    preBidder?: Ripemd160;
    changeAddress?: Ripemd160;
    changeSatoshis?: number;
    opReturnScript?: Bytes;
    timeRabinMsg?: Bytes;
    timeRabinSig?: Bytes;
    timeRabinPadding?: Bytes;
    timeRabinPubKey?: Bytes;
    rabinMsg?: Bytes;
    rabinPaddingArray?: Bytes[];
    rabinSigArray?: Int[];
    rabinPubKeyIndexArray?: number[];
    rabinPubKeyVerifyArray?: Int[];
    rabinPubKeyHashArray: Bytes;
  }) {
    return this._contract.bid(
      txPreimage,
      bsvBidPrice,
      bidder,
      preBsvBidPrice,
      preBidder,
      changeAddress,
      changeSatoshis,
      opReturnScript,
      timeRabinMsg,
      timeRabinSig,
      timeRabinPadding,
      timeRabinPubKey,
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray
    ) as FunctionCall;
  }
}

export class NftAuctionFactory {
  public static lockingScriptSize: number;

  public static getLockingScriptSize() {
    return this.lockingScriptSize;
  }

  public static createContract(
    senderAddress: Ripemd160,
    startBsvPrice: number,
    timeRabinPubKeyHash: Bytes,
    nftCodeHash: Bytes,
    nftID: Bytes,
    endTimeStamp: number,
    rabinPubKeyHashArrayHash: Bytes
  ): NftAuction {
    return new NftAuction({
      senderAddress,
      startBsvPrice,
      timeRabinPubKeyHash,
      nftCodeHash,
      nftID,
      endTimeStamp,
      rabinPubKeyHashArrayHash,
    });
  }
}
