import {
  Transfer as TransferEvent,
  Token as TokenContract,
} from "../generated/Token/Token";
import {
  ipfs,
  json,
  Bytes,
  dataSource,
  DataSourceContext,
} from "@graphprotocol/graph-ts";

import { Token, User, TokenMetadata } from "../generated/schema";

import { TokenMetadata as TokenMetadataTemplate } from "../generated/templates";

const ipfshash = "QmaXzZhcYnsisuue5WRdQDH6FDvqkLQX1NckLqBYeYYEfm";

export function handleTransfer(event: TransferEvent): void {
  let token = Token.load(event.params.tokenId.toString());
  if (!token) {
    token = new Token(event.params.tokenId.toString());
    token.tokenID = event.params.tokenId;
    let contract = TokenContract.bind(dataSource.address());
    let tokenURI = contract.tokenURI(event.params.tokenId);
    token.tokenURI = tokenURI;
    const tokenIpfsHash = tokenURI.substring(7);
    token.ipfsURI = tokenIpfsHash;
    const dataSourceContext = new DataSourceContext();
    dataSourceContext.setBigInt("tokenId", event.params.tokenId);
    TokenMetadataTemplate.createWithContext(tokenIpfsHash, dataSourceContext);
  }

  token.updatedAtTimestamp = event.block.timestamp;
  token.owner = event.params.to.toHexString();
  token.save();

  let user = User.load(event.params.to.toHexString());
  if (!user) {
    user = new User(event.params.to.toHexString());
    user.save();
  }
}

export function handleMetadata(content: Bytes): void {
  let tokenMetadata = new TokenMetadata(
    dataSource
      .context()
      .getBigInt("tokenId")
      .toString()
  );
  const value = json.fromBytes(content).toObject();
  if (value) {
    const image = value.get("image");
    const name = value.get("name");
    const description = value.get("description");
    const identifier = value.get("identifier");
    const tags = value.get("tags");

    if (name && image && description && identifier && tags) {
      tokenMetadata.name = name.toString();
      tokenMetadata.image = image.toString();
      tokenMetadata.description = description.toString();
      tokenMetadata.identifier = identifier.toBigInt();
      tokenMetadata.tags = tags.toArray().map<string>((tag) => tag.toString());
    }
  }

  tokenMetadata.save();
}
