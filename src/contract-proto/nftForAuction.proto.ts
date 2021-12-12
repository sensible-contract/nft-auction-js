import { Proto } from "@sensible-contract/sdk-core";
import { toHex } from "@sensible-contract/sdk-core/lib/scryptlib";

export const PROTO_VERSION = 1;

//<auctionContractHash> (20byte) + <nftID>(20byte) + <nftCodeHash>(20byte)+  <proto header>
const NFT_CODE_HASH_LEN = 20;
const NFT_ID_LEN = 20;
const AUCTION_CONTRACT_HASH_LEN = 20;

const NFT_CODE_HASH_OFFSET = Proto.getHeaderLen() + NFT_CODE_HASH_LEN;
const NFT_ID_OFFSET = NFT_CODE_HASH_OFFSET + NFT_ID_LEN;
const AUCTION_CONTRACT_HASH_OFFSET = NFT_ID_OFFSET + AUCTION_CONTRACT_HASH_LEN;

export function getCodeHash(script: Buffer) {
  if (script.length < NFT_CODE_HASH_OFFSET) return "";
  return script
    .slice(
      script.length - NFT_CODE_HASH_OFFSET,
      script.length - NFT_CODE_HASH_OFFSET + NFT_CODE_HASH_LEN
    )
    .toString("hex");
}

export function getNftID(script: Buffer) {
  return toHex(
    script.slice(
      script.length - NFT_ID_OFFSET,
      script.length - NFT_ID_OFFSET + NFT_ID_LEN
    )
  );
}

export function getAuctionContractHash(script: Buffer) {
  if (script.length < NFT_CODE_HASH_OFFSET) return "";
  return script
    .slice(
      script.length - AUCTION_CONTRACT_HASH_OFFSET,
      script.length - AUCTION_CONTRACT_HASH_OFFSET + AUCTION_CONTRACT_HASH_LEN
    )
    .toString("hex");
}

export type FormatedDataPart = {
  codehash?: string;
  nftID?: string;
  auctionContractHash?: string;
  protoVersion?: number;
  protoType?: Proto.PROTO_TYPE;
};

export function newDataPart({
  codehash,
  nftID,
  auctionContractHash,
  protoVersion,
  protoType,
}: FormatedDataPart): Buffer {
  const codehashBuf = Buffer.alloc(20, 0);
  if (nftID) {
    codehashBuf.write(codehash, "hex");
  }

  const nftIDBuf = Buffer.alloc(20, 0);
  if (nftID) {
    nftIDBuf.write(nftID, "hex");
  }

  const auctionContractHashBuf = Buffer.alloc(AUCTION_CONTRACT_HASH_LEN, 0);
  if (auctionContractHash) {
    auctionContractHashBuf.write(auctionContractHash, "hex");
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
    auctionContractHashBuf,
    nftIDBuf,
    codehashBuf,

    protoVersionBuf,
    protoTypeBuf,
    Proto.PROTO_FLAG,
  ]);
}

export function parseDataPart(scriptBuf: Buffer): FormatedDataPart {
  let auctionContractHash = getAuctionContractHash(scriptBuf);
  let nftID = getNftID(scriptBuf);
  let codehash = getCodeHash(scriptBuf);
  let protoVersion = Proto.getProtoVersioin(scriptBuf);
  let protoType = Proto.getProtoType(scriptBuf);
  return {
    auctionContractHash,
    nftID,
    codehash,

    protoVersion,
    protoType,
  };
}
