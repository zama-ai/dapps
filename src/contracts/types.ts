export type ContractArtifact = {
  _format: string;
  contractName: string;
  sourceName: string;
  abi: any[];
  bytecode: string;
  linkReferences: {};
  deployedLinkReferences: {};
};
