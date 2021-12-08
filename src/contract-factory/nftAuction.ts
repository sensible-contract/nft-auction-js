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

  constuctParams: {};

  static getClass() {
    const desc = require("../contract-desc/nftAuction_desc.json");
    let NftSellContractClass = buildContractClass(desc);
    return NftSellContractClass;
  }

  constructor(constuctParams: {}) {
    let NftAuctionContractClass = NftAuction.getClass();
    let contract = new NftAuctionContractClass();
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
    preBidTimestamp,
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
    preBidTimestamp?: number;
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
    return this._contract.unlock(
      txPreimage,
      nftScript,
      nftOutputSatoshis,
      preBidTimestamp,
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
    bidTimestamp,
    bsvBidPrice,
    bidder,
    preBidTimestamp,
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
    bidTimestamp?: number;
    bsvBidPrice?: number;
    bidder?: Ripemd160;
    preBidTimestamp?: number;
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
      bidTimestamp,
      bsvBidPrice,
      bidder,
      preBidTimestamp,
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

  public static createContract(): NftAuction {
    return new NftAuction({});
  }
}
