import * as bsv from "@sensible-contract/bsv";
import { BN } from "@sensible-contract/bsv";
import { NftFactory } from "@sensible-contract/nft-js/lib/contract-factory/nft";
import { SIGNER_VERIFY_NUM } from "@sensible-contract/nft-js/lib/contract-proto/nft.proto";
import {
  ContractAdapter,
  dummyAddress,
  dummyPadding,
  dummyPayload,
  dummyRabinPubKey,
  dummyRabinPubKeyHashArray,
  dummySigBE,
  dummyTx,
  PLACE_HOLDER_PUBKEY,
  PLACE_HOLDER_SIG,
} from "@sensible-contract/sdk-core";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  getPreimage,
  Int,
  PubKey,
  Ripemd160,
  Sig,
  SigHashPreimage,
  toHex,
} from "@sensible-contract/sdk-core/lib/scryptlib";
import * as nftAuctionProto from "../contract-proto/nftAuction.proto";

const dummyTimeRabinMsg = new Bytes("4f18b061");
const dummyTimeRabinSig = new Bytes(
  "640d98bfef7afd36d4100668c9256fb103c669324001d6b79b9416eb3c20362252e431d712235cda8dad7aef5ec3e495e08292deaeae3e6ee3fa7b094ef792fcfa3ced93384b3cd0659b2b39cccfb24adcb6b3e2166cf07c0dd1013578a2a2ff3859910cbc1924febda5f8769ec4fa13968361376874538ddc0c8812d6b650c4ae423723455a975f8b1ff7876ad52df945b221511307851e0e32cf53dc7443df6d073b526c7e6caa592123d8768e8fb74fab699c744a65f37d7773a9e40f79f575f7a0b12eca85161d8463dd8f4f4eb9a2ed00018199fdfcab35697d4b70c4671bd3e60b504621e14091f8ecd81d2277621e0a2614df3d395df1e248d73a974a3e8959facb8f793c58419affd806797a5751d85d7bc1f01ae16fa9393b7ceaa644664b1e6e7981243032e4b203a7edfab0a45794aa01c35144ab66625fbc5f9df409926f1ce6e60d6e93dd900e1693b0e0216e6db594407a7152cd403772e90a9450e4e055d24517a7bcdcbeb8c685b579c4834f2017b0800b200eff7404d521"
);
const dummyTimeRabinPadding = new Bytes("000000");

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
    // const desc = require("../../out/nftAuction_debug_desc.json");
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
    if (!this.lockingScriptSize)
      this.lockingScriptSize = this.calLockingScriptSize();
    return this.lockingScriptSize;
  }

  public static createContract(): NftAuction {
    return new NftAuction({});
  }

  public static calLockingScriptSize() {
    let contract = this.getDummyInstance();
    return (contract.lockingScript as bsv.Script).toBuffer().length;
  }

  public static getDummyInstance() {
    let contract = this.createContract();
    contract.setFormatedDataPart({});
    return contract;
  }

  public static calBidUnlockingScriptSize(opreturnData: any): number {
    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
    }

    let contract = this.getDummyInstance();

    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const rabinMsg = new Bytes(dummyPayload);
    let paddingCountBuf = Buffer.alloc(2, 0);
    paddingCountBuf.writeUInt16LE(dummyPadding.length / 2);
    const padding = Buffer.alloc(dummyPadding.length / 2, 0);
    padding.write(dummyPadding, "hex");

    const rabinPaddingArray: Bytes[] = [];
    const rabinSigArray: Int[] = [];
    const rabinPubKeyIndexArray: number[] = [];
    const rabinPubKeyArray: Int[] = [];
    for (let i = 0; i < SIGNER_VERIFY_NUM; i++) {
      rabinPaddingArray.push(new Bytes(dummyPadding));
      rabinSigArray.push(new Int(BN.fromString(dummySigBE, 16).toString(10)));
      rabinPubKeyIndexArray.push(i);
      rabinPubKeyArray.push(new Int(dummyRabinPubKey.toString(10)));
    }

    const dummySatoshis = 100000000000000;

    let unlockedContract = contract.bid({
      txPreimage: new SigHashPreimage(toHex(preimage)),
      bidTimestamp: Date.now(),
      bsvBidPrice: dummySatoshis,
      bidder: new Ripemd160(toHex(dummyAddress.hashBuffer)),
      preBidTimestamp: Date.now(),
      preBsvBidPrice: dummySatoshis,
      preBidder: new Ripemd160(toHex(dummyAddress.hashBuffer)),
      changeAddress: new Ripemd160(toHex(dummyAddress.hashBuffer)),
      changeSatoshis: dummySatoshis,
      opReturnScript: new Bytes(opreturnScriptHex),

      timeRabinMsg: dummyTimeRabinMsg,
      timeRabinPadding: dummyTimeRabinPadding,
      timeRabinSig: dummyTimeRabinSig,
      timeRabinPubKey: new Bytes(toHex(dummyRabinPubKeyHashArray)),

      rabinMsg: rabinMsg,
      rabinPaddingArray: rabinPaddingArray,
      rabinSigArray: rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray: rabinPubKeyArray,
      rabinPubKeyHashArray: new Bytes(toHex(dummyRabinPubKeyHashArray)),
    });
    return (unlockedContract.toScript() as bsv.Script).toBuffer().length;
  }

  public static calUnlockUnlockingScriptSize(opreturnData: any): number {
    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
    }

    let contract = this.getDummyInstance();

    let nftContractInstance = NftFactory.getDummyInstance();

    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const rabinMsg = new Bytes(dummyPayload);
    let paddingCountBuf = Buffer.alloc(2, 0);
    paddingCountBuf.writeUInt16LE(dummyPadding.length / 2);
    const padding = Buffer.alloc(dummyPadding.length / 2, 0);
    padding.write(dummyPadding, "hex");

    const rabinPaddingArray: Bytes[] = [];
    const rabinSigArray: Int[] = [];
    const rabinPubKeyIndexArray: number[] = [];
    const rabinPubKeyArray: Int[] = [];
    for (let i = 0; i < SIGNER_VERIFY_NUM; i++) {
      rabinPaddingArray.push(new Bytes(dummyPadding));
      rabinSigArray.push(new Int(BN.fromString(dummySigBE, 16).toString(10)));
      rabinPubKeyIndexArray.push(i);
      rabinPubKeyArray.push(new Int(dummyRabinPubKey.toString(10)));
    }

    const dummySatoshis = 100000000000000;

    let unlockedContract = contract.unlock({
      txPreimage: new SigHashPreimage(toHex(preimage)),
      nftScript: new Bytes(
        nftContractInstance.lockingScript.toBuffer().toString("hex")
      ),
      nftOutputSatoshis: dummySatoshis,
      preBidTimestamp: Date.now(),
      preBsvBidPrice: dummySatoshis,
      preBidder: new Ripemd160(toHex(dummyAddress.hashBuffer)),
      changeAddress: new Ripemd160(toHex(dummyAddress.hashBuffer)),
      changeSatoshis: dummySatoshis,
      opReturnScript: new Bytes(opreturnScriptHex),

      timeRabinMsg: dummyTimeRabinMsg,
      timeRabinPadding: dummyTimeRabinPadding,
      timeRabinSig: dummyTimeRabinSig,
      timeRabinPubKey: new Bytes(toHex(dummyRabinPubKeyHashArray)),

      rabinMsg: rabinMsg,
      rabinPaddingArray: rabinPaddingArray,
      rabinSigArray: rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray: rabinPubKeyArray,
      rabinPubKeyHashArray: new Bytes(toHex(dummyRabinPubKeyHashArray)),
      senderPubKey: new PubKey(PLACE_HOLDER_PUBKEY),
      senderSig: new Sig(PLACE_HOLDER_SIG),
    });
    return (unlockedContract.toScript() as bsv.Script).toBuffer().length;
  }
}
