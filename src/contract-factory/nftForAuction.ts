import * as bsv from "@sensible-contract/bsv";
import { ContractAdapter } from "@sensible-contract/sdk-core";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  Int,
  PubKey,
  Sig,
  SigHashPreimage,
  toHex,
} from "@sensible-contract/sdk-core/lib/scryptlib";
import * as nftForAuctionProto from "../contract-proto/nftForAuction.proto";
const Signature = bsv.crypto.Signature;
export class NftForAuction extends ContractAdapter {
  static sighashType: number =
    Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID;

  private _formatedDataPart: nftForAuctionProto.FormatedDataPart;
  constuctParams: {
    auctionContractHash: Bytes;
  };

  static getClass() {
    const desc = require("../contract-desc/nftForAuction_desc.json");
    let NftForAuctionContractClass = buildContractClass(desc);
    return NftForAuctionContractClass;
  }

  constructor(constuctParams: { auctionContractHash: Bytes }) {
    let NftForAuctionContractClass = NftForAuction.getClass();
    let contract = new NftForAuctionContractClass(
      constuctParams.auctionContractHash
    );
    super(contract);
    this.constuctParams = constuctParams;
  }

  static fromASM(asm: string) {
    let NftForAuctionContractClass = NftForAuction.getClass();
    let contract = NftForAuctionContractClass.fromASM(asm);
    let params = contract.scriptedConstructor.params;
    let auctionContractHash = params[0];
    return new NftForAuction({ auctionContractHash });
  }

  clone() {
    let contract = new NftForAuction(this.constuctParams);
    contract.setFormatedDataPart(this.getFormatedDataPart());
    return contract;
  }

  public setFormatedDataPart(
    dataPart: nftForAuctionProto.FormatedDataPart
  ): void {
    this._formatedDataPart = Object.assign(
      {},
      this._formatedDataPart,
      dataPart
    );
    this._formatedDataPart.protoVersion = nftForAuctionProto.PROTO_VERSION;
    this._formatedDataPart.protoType = 0x00010005;
    super.setDataPart(
      toHex(nftForAuctionProto.newDataPart(this._formatedDataPart))
    );
  }

  public getFormatedDataPart() {
    return this._formatedDataPart;
  }

  public setFormatedDataPartFromLockingScript(script: bsv.Script) {
    let dataPart = nftForAuctionProto.parseDataPart(script.toBuffer());
    this.setFormatedDataPart(dataPart);
  }

  public unlock({
    txPreimage,
    prevouts,
    nftInputIndex,
    nftScript,
    nftOutputSatoshis,
    auctionInputIndex,
    auctionScript,
    nftRabinMsg,
    nftRabinPaddingArray,
    nftRabinSigArray,
    auctionRabinMsg,
    auctionRabinPaddingArray,
    auctionRabinSigArray,
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
    rabinPubKeyHashArray,
    timeRabinMsg,
    timeRabinSig,
    timeRabinPadding,
    timeRabinPubKey,
    senderPubKey,
    senderSig,
  }: {
    txPreimage: SigHashPreimage;
    prevouts: Bytes;
    nftInputIndex: number;
    nftScript: Bytes;
    nftOutputSatoshis: number;
    auctionInputIndex: number;
    auctionScript: Bytes;

    nftRabinMsg: Bytes;
    nftRabinPaddingArray: Bytes[];
    nftRabinSigArray: Int[];

    auctionRabinMsg: Bytes;
    auctionRabinPaddingArray: Bytes[];
    auctionRabinSigArray: Int[];

    rabinPubKeyIndexArray: number[];
    rabinPubKeyVerifyArray: Int[];
    rabinPubKeyHashArray: Bytes;

    timeRabinMsg: Bytes;
    timeRabinSig: Bytes;
    timeRabinPadding: Bytes;
    timeRabinPubKey: Bytes;

    senderPubKey?: PubKey;
    senderSig?: Sig;
  }) {
    if (!senderPubKey) {
      senderPubKey = new PubKey("00");
      senderSig = new Sig("00");
    }
    return this._contract.unlock(
      txPreimage,
      prevouts,
      nftInputIndex,
      nftScript,
      nftOutputSatoshis,
      auctionInputIndex,
      auctionScript,
      nftRabinMsg,
      nftRabinPaddingArray,
      nftRabinSigArray,
      auctionRabinMsg,
      auctionRabinPaddingArray,
      auctionRabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray,
      timeRabinMsg,
      timeRabinSig,
      timeRabinPadding,
      timeRabinPubKey,
      senderPubKey,
      senderSig
    ) as FunctionCall;
  }
}

export class NftForAuctionFactory {
  public static lockingScriptSize: number;

  public static getLockingScriptSize() {
    return this.lockingScriptSize;
  }

  public static createContract(auctionContractHash: Bytes): NftForAuction {
    return new NftForAuction({ auctionContractHash });
  }

  public static createFromASM(asm: string): NftForAuction {
    return NftForAuction.fromASM(asm);
  }
}
