import { BN } from "@sensible-contract/bsv";
import { SensibleID } from "@sensible-contract/nft-js/lib/contract-proto/nft.proto";
import { Proto } from "@sensible-contract/sdk-core";
import { toHex } from "@sensible-contract/sdk-core/lib/scryptlib";

export type FormatedDataPart = {
  rabinPubKeyHashArrayHash?: string;
  timeRabinPubkeyHash?: string;
  endTimestamp?: number;
  nftID?: string;
  nftCodeHash?: string;
  startBsvPrice?: number;
  senderAddress?: string;
  bidBsvPrice?: number;
  bidderAddress?: string;

  sensibleID?: SensibleID;
  protoVersion?: number;
  protoType?: Proto.PROTO_TYPE;
};
export enum NFT_OP_TYPE {
  TRANSFER = 1,
  UNLOCK_FROM_CONTRACT = 2,
}
export const PROTO_VERSION = 1;

export enum GENESIS_FLAG {
  FALSE = 0,
  TRUE = 1,
}

// <type specific data> + <proto header>
// <proto header> = <type(4 bytes)> + <'sensible'(8 bytes)>
//<nft type specific data> = <timeRabinPubkeyHash>(20byte) +<endTimeStamp>(8byte) +  <nftID>(20byte) + <nftCodeHash>(20byte) +  <startBsvPrice(8byte)> + <sendderAddress(20byte)> + <bidBsvPrice>(8byte) + <bidderAddress(20byte)> + <sensibleID(36 bytes)>
const SENSIBLE_ID_LEN = 36;
const BIDDER_ADDRESS_LEN = 20;
const BID_BSV_PRICE_LEN = 8;
const SENDDER_ADDRESS_LEN = 20;
const START_BSV_PRICE_LEN = 8;
const NFT_CODE_HASH_LEN = 20;
const NFT_ID_LEN = 20;
const END_TIMESTAMP_LEN = 8;
const TIME_RABIN_PUBKEY_HASH_LEN = 20;
const RABIN_PUBKEY_HASH_ARRAY_HASH_LEN = 20;

const SENSIBLE_ID_OFFSET = SENSIBLE_ID_LEN + Proto.getHeaderLen();
const BIDDER_ADDRESS_OFFSET = SENSIBLE_ID_OFFSET + BIDDER_ADDRESS_LEN;
const BID_BSV_PRICE_OFFSET = BIDDER_ADDRESS_OFFSET + BID_BSV_PRICE_LEN;
const SENDER_ADDRESS_OFFSET = BID_BSV_PRICE_OFFSET + SENDDER_ADDRESS_LEN;
const START_BSV_PRICE_OFFESET = SENDER_ADDRESS_OFFSET + START_BSV_PRICE_LEN;
const NFT_CODE_HASH_OFFSET = START_BSV_PRICE_OFFESET + NFT_CODE_HASH_LEN;
const NFT_ID_OFFSET = NFT_CODE_HASH_OFFSET + NFT_ID_LEN;
const END_TIMESTAMP_OFFSET = NFT_ID_OFFSET + END_TIMESTAMP_LEN;
const TIME_RABIN_PUBKEY_HASH_OFFSET =
  END_TIMESTAMP_OFFSET + TIME_RABIN_PUBKEY_HASH_LEN;
const RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET =
  TIME_RABIN_PUBKEY_HASH_OFFSET + RABIN_PUBKEY_HASH_ARRAY_HASH_LEN;
const DATA_LEN = RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET;

export const GENESIS_TOKEN_ID = Buffer.alloc(NFT_ID_LEN, 0);
export const EMPTY_ADDRESS = Buffer.alloc(SENDDER_ADDRESS_LEN, 0);

export function getRabinPubKeyHashArrayHash(script: Buffer) {
  return script
    .slice(
      script.length - RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET,
      script.length -
        RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET +
        RABIN_PUBKEY_HASH_ARRAY_HASH_LEN
    )
    .toString("hex");
}

export function getTimeRabinPubkeyHash(script: Buffer) {
  return script
    .slice(
      script.length - TIME_RABIN_PUBKEY_HASH_OFFSET,
      script.length - TIME_RABIN_PUBKEY_HASH_OFFSET + TIME_RABIN_PUBKEY_HASH_LEN
    )
    .toString("hex");
}
export function getEndTimestamp(script: Buffer) {
  if (script.length < END_TIMESTAMP_OFFSET) return 0;
  return BN.fromBuffer(
    script.slice(
      script.length - END_TIMESTAMP_OFFSET,
      script.length - END_TIMESTAMP_OFFSET + END_TIMESTAMP_LEN
    ),
    { endian: "little" }
  ).toNumber();
}

export function getNftID(script: Buffer) {
  return toHex(
    script.slice(
      script.length - NFT_ID_OFFSET,
      script.length - NFT_ID_OFFSET + NFT_ID_LEN
    )
  );
}

export function getCodeHash(script: Buffer) {
  if (script.length < NFT_CODE_HASH_OFFSET) return "";
  return script
    .slice(
      script.length - NFT_CODE_HASH_OFFSET,
      script.length - NFT_CODE_HASH_OFFSET + NFT_CODE_HASH_LEN
    )
    .toString("hex");
}

export function getBidBsvPrice(script: Buffer) {
  if (script.length < BID_BSV_PRICE_OFFSET) return 0;
  return BN.fromBuffer(
    script.slice(
      script.length - BID_BSV_PRICE_OFFSET,
      script.length - BID_BSV_PRICE_OFFSET + BID_BSV_PRICE_LEN
    ),
    { endian: "little" }
  ).toNumber();
}

export function getStartBsvPrice(script: Buffer) {
  if (script.length < START_BSV_PRICE_OFFESET) return 0;
  return BN.fromBuffer(
    script.slice(
      script.length - START_BSV_PRICE_OFFESET,
      script.length - START_BSV_PRICE_OFFESET + START_BSV_PRICE_LEN
    ),
    { endian: "little" }
  ).toNumber();
}

export function getBidderAddress(script: Buffer) {
  if (script.length < BIDDER_ADDRESS_OFFSET) return "";
  return script
    .slice(
      script.length - BIDDER_ADDRESS_OFFSET,
      script.length - BIDDER_ADDRESS_OFFSET + BIDDER_ADDRESS_LEN
    )
    .toString("hex");
}

export function getSenderAddress(script: Buffer) {
  if (script.length < SENDER_ADDRESS_OFFSET) return "";
  return script
    .slice(
      script.length - SENDER_ADDRESS_OFFSET,
      script.length - SENDER_ADDRESS_OFFSET + SENDDER_ADDRESS_LEN
    )
    .toString("hex");
}

export function getSensibleID(script0: Buffer) {
  if (script0.length < SENSIBLE_ID_OFFSET) return { txid: "", index: 0 };
  let script = Buffer.from(script0);
  let sensibleIDBuf = script.slice(
    script.length - SENSIBLE_ID_OFFSET,
    script.length - SENSIBLE_ID_OFFSET + SENSIBLE_ID_LEN
  );
  let txid = sensibleIDBuf.slice(0, 32).reverse().toString("hex"); //reverse会改变原对象
  let index = sensibleIDBuf.readUIntLE(32, 4);
  let outpoint = { txid, index };
  return outpoint;
}

export function newDataPart({
  rabinPubKeyHashArrayHash,
  timeRabinPubkeyHash,
  endTimestamp,
  nftID,
  nftCodeHash,
  startBsvPrice,
  senderAddress,
  bidBsvPrice,
  bidderAddress,
  sensibleID,
  protoVersion,
  protoType,
}: FormatedDataPart): Buffer {
  const timeRabinPubkeyHashBuf = Buffer.alloc(TIME_RABIN_PUBKEY_HASH_LEN, 0);
  if (timeRabinPubkeyHash) {
    timeRabinPubkeyHashBuf.write(timeRabinPubkeyHash, "hex");
  }

  let endTimestampBuf = Buffer.alloc(END_TIMESTAMP_LEN, 0);
  if (endTimestamp) {
    endTimestampBuf = BN.fromNumber(endTimestamp)
      .toBuffer({ endian: "little", size: END_TIMESTAMP_LEN })
      .slice(0, END_TIMESTAMP_LEN);
  }

  const nftIDBuf = Buffer.alloc(NFT_ID_LEN, 0);
  if (nftID) {
    nftIDBuf.write(nftID, "hex");
  }

  const nftCodeHashBuf = Buffer.alloc(NFT_CODE_HASH_LEN, 0);
  if (nftCodeHash) {
    nftCodeHashBuf.write(nftCodeHash, "hex");
  }

  let startBsvPriceBuf = Buffer.alloc(START_BSV_PRICE_LEN, 0);
  if (startBsvPrice) {
    startBsvPriceBuf = BN.fromNumber(startBsvPrice)
      .toBuffer({ endian: "little", size: START_BSV_PRICE_LEN })
      .slice(0, START_BSV_PRICE_LEN);
  }

  const senderAddressBuf = Buffer.alloc(SENDDER_ADDRESS_LEN, 0);
  if (senderAddress) {
    senderAddressBuf.write(senderAddress, "hex");
  }

  let bidBsvPriceBuf = Buffer.alloc(BID_BSV_PRICE_LEN, 0);
  if (bidBsvPrice) {
    bidBsvPriceBuf = BN.fromNumber(bidBsvPrice)
      .toBuffer({ endian: "little", size: BID_BSV_PRICE_LEN })
      .slice(0, BID_BSV_PRICE_LEN);
  }

  const bidderAddressBuf = Buffer.alloc(BIDDER_ADDRESS_LEN, 0);
  if (bidderAddress) {
    bidderAddressBuf.write(bidderAddress, "hex");
  }

  const rabinPubKeyHashArrayHashBuf = Buffer.alloc(
    RABIN_PUBKEY_HASH_ARRAY_HASH_LEN,
    0
  );
  if (rabinPubKeyHashArrayHash) {
    rabinPubKeyHashArrayHashBuf.write(rabinPubKeyHashArrayHash, "hex");
  }

  let sensibleIDBuf = Buffer.alloc(SENSIBLE_ID_LEN, 0);
  if (sensibleID) {
    const txidBuf = Buffer.from(sensibleID.txid, "hex").reverse();
    const indexBuf = Buffer.alloc(4, 0);
    indexBuf.writeUInt32LE(sensibleID.index);
    sensibleIDBuf = Buffer.concat([txidBuf, indexBuf]);
  }

  const protoVersionBuf = Buffer.alloc(Proto.PROTO_VERSION_LEN);
  if (protoVersion) {
    protoVersionBuf.writeUInt32LE(protoVersion);
  }

  const protoTypeBuf = Buffer.alloc(Proto.PROTO_TYPE_LEN, 0);
  if (protoType) {
    protoTypeBuf.writeUInt32LE(protoType);
  }

  return Buffer.concat([
    rabinPubKeyHashArrayHashBuf,
    timeRabinPubkeyHashBuf,
    endTimestampBuf,
    nftIDBuf,
    nftCodeHashBuf,
    startBsvPriceBuf,
    senderAddressBuf,
    bidBsvPriceBuf,
    bidderAddressBuf,

    sensibleIDBuf,
    protoVersionBuf,
    protoTypeBuf,
    Proto.PROTO_FLAG,
  ]);
}

export function parseDataPart(scriptBuf: Buffer): FormatedDataPart {
  let rabinPubKeyHashArrayHash = getRabinPubKeyHashArrayHash(scriptBuf);
  let timeRabinPubkeyHash = getTimeRabinPubkeyHash(scriptBuf);
  let endTimestamp = getEndTimestamp(scriptBuf);
  let nftID = getNftID(scriptBuf);
  let nftCodeHash = getCodeHash(scriptBuf);
  let startBsvPrice = getStartBsvPrice(scriptBuf);
  let senderAddress = getSenderAddress(scriptBuf);
  let bidBsvPrice = getBidBsvPrice(scriptBuf);
  let bidderAddress = getBidderAddress(scriptBuf);
  let sensibleID = getSensibleID(scriptBuf);
  let protoVersion = Proto.getProtoVersioin(scriptBuf);
  let protoType = Proto.getProtoType(scriptBuf);
  return {
    rabinPubKeyHashArrayHash,
    timeRabinPubkeyHash,
    endTimestamp,
    nftID,
    nftCodeHash,
    startBsvPrice,
    senderAddress,
    bidBsvPrice,
    bidderAddress,
    sensibleID,
    protoVersion,
    protoType,
  };
}

export function updateScript(
  scriptBuf: Buffer,
  dataPartObj: FormatedDataPart
): Buffer {
  const firstBuf = scriptBuf.slice(0, scriptBuf.length - DATA_LEN);
  const dataPart = newDataPart(dataPartObj);
  return Buffer.concat([firstBuf, dataPart]);
}
