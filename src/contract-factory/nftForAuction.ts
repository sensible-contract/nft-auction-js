import * as bsv from "@sensible-contract/bsv";
import { BN } from "@sensible-contract/bsv";
import { NftFactory } from "@sensible-contract/nft-js/lib/contract-factory/nft";
import { SIGNER_VERIFY_NUM } from "@sensible-contract/nft-js/lib/contract-proto/nft.proto";
import {
  ContractAdapter,
  dummyAddress,
  dummyCodehash,
  dummyPadding,
  dummyPayload,
  dummyRabinPubKey,
  dummyRabinPubKeyHashArray,
  dummySigBE,
  dummyTx,
  dummyTxId,
  PLACE_HOLDER_PUBKEY,
  PLACE_HOLDER_SIG,
  Utils,
} from "@sensible-contract/sdk-core";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  getPreimage,
  Int,
  PubKey,
  Sig,
  SigHashPreimage,
  toHex,
} from "@sensible-contract/sdk-core/lib/scryptlib";
import { TxComposer } from "@sensible-contract/tx-composer";
import { ParamUtxo } from "..";
import * as nftForAuctionProto from "../contract-proto/nftForAuction.proto";
import { NftAuctionFactory } from "./nftAuction";

const Signature = bsv.crypto.Signature;
export const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
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
    if (!this.lockingScriptSize)
      this.lockingScriptSize = this.calLockingScriptSize();
    return this.lockingScriptSize;
  }

  public static createContract(auctionContractHash: Bytes): NftForAuction {
    return new NftForAuction({ auctionContractHash });
  }

  public static createFromASM(asm: string): NftForAuction {
    return NftForAuction.fromASM(asm);
  }

  public static getDummyInstance() {
    let contract = this.createContract(new Bytes(dummyCodehash.toHex()));
    contract.setFormatedDataPart({});
    return contract;
  }

  public static createDummyTx() {
    const dummySatoshis = 100000000000000;
    const dummyUnlockScript =
      "483045022100e922b0bd9c58a4bbc9fce7799238b3bb140961bb061f6a820120bcf61746ec3c022062a926ce4cd34837c4c922bb1f6b8e971450808d078edec9260dc04594e135ea412102ed9e3017533cb75a86d471b94005c87154a2cb27f435480fdffbc5e963c46a8d";
    let nftForAuctionContract = this.getDummyInstance();
    const txComposer = new TxComposer();

    let utxos: ParamUtxo[] = [];
    for (let i = 0; i < 3; i++) {
      utxos.push({
        txId: dummyTxId,
        outputIndex: 0,
        satoshis: dummySatoshis,
        address: dummyAddress.toString(),
      });
    }
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

    let changeOutputIndex = txComposer.appendChangeOutput(dummyAddress);

    utxos.forEach((v, index) => {
      txComposer.getInput(index).setScript(new bsv.Script(dummyUnlockScript));
    });

    return txComposer;
  }

  public static calLockingScriptSize(): number {
    let contract = this.getDummyInstance();
    return (contract.lockingScript as bsv.Script).toBuffer().length;
  }

  public static calUnlockingScriptSize(bsvInputLen: number): number {
    let contract = this.getDummyInstance();

    let nftContractInstance = NftFactory.getDummyInstance();
    let auctionContractInstance = NftAuctionFactory.getDummyInstance();

    let prevouts = Buffer.alloc(0);
    const indexBuf = Utils.getUInt32Buf(0);
    const txidBuf = Utils.getTxIdBuf(dummyTxId);
    for (let i = 0; i < 1 + bsvInputLen; i++) {
      prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);
    }

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

    const dummyTimeRabinMsg = new Bytes("4f18b061");
    const dummyTimeRabinSig = new Bytes(
      "640d98bfef7afd36d4100668c9256fb103c669324001d6b79b9416eb3c20362252e431d712235cda8dad7aef5ec3e495e08292deaeae3e6ee3fa7b094ef792fcfa3ced93384b3cd0659b2b39cccfb24adcb6b3e2166cf07c0dd1013578a2a2ff3859910cbc1924febda5f8769ec4fa13968361376874538ddc0c8812d6b650c4ae423723455a975f8b1ff7876ad52df945b221511307851e0e32cf53dc7443df6d073b526c7e6caa592123d8768e8fb74fab699c744a65f37d7773a9e40f79f575f7a0b12eca85161d8463dd8f4f4eb9a2ed00018199fdfcab35697d4b70c4671bd3e60b504621e14091f8ecd81d2277621e0a2614df3d395df1e248d73a974a3e8959facb8f793c58419affd806797a5751d85d7bc1f01ae16fa9393b7ceaa644664b1e6e7981243032e4b203a7edfab0a45794aa01c35144ab66625fbc5f9df409926f1ce6e60d6e93dd900e1693b0e0216e6db594407a7152cd403772e90a9450e4e055d24517a7bcdcbeb8c685b579c4834f2017b0800b200eff7404d521"
    );
    const dummyTimeRabinPadding = new Bytes("000000");

    let unlockedContract = contract.unlock({
      txPreimage: new SigHashPreimage(toHex(preimage)),
      prevouts: new Bytes(prevouts.toString("hex")),
      nftInputIndex: 0,
      nftScript: new Bytes(
        nftContractInstance.lockingScript.toBuffer().toString("hex")
      ),
      nftOutputSatoshis: dummySatoshis,
      auctionInputIndex: 0,
      auctionScript: new Bytes(
        auctionContractInstance.lockingScript.toBuffer().toString("hex")
      ),

      nftRabinMsg: rabinMsg,
      nftRabinPaddingArray: rabinPaddingArray,
      nftRabinSigArray: rabinSigArray,

      auctionRabinMsg: rabinMsg,
      auctionRabinPaddingArray: rabinPaddingArray,
      auctionRabinSigArray: rabinSigArray,

      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray: rabinPubKeyArray,
      rabinPubKeyHashArray: new Bytes(toHex(dummyRabinPubKeyHashArray)),

      timeRabinMsg: dummyTimeRabinMsg,
      timeRabinPadding: dummyTimeRabinPadding,
      timeRabinSig: dummyTimeRabinSig,
      timeRabinPubKey: new Bytes(toHex(dummyRabinPubKeyHashArray)),

      senderPubKey: new PubKey(PLACE_HOLDER_PUBKEY),
      senderSig: new Sig(PLACE_HOLDER_SIG),
    });
    return (unlockedContract.toScript() as bsv.Script).toBuffer().length;
  }
}
