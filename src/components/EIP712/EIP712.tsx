import React, { useEffect, useState } from 'react';
import { Contract, BrowserProvider, isAddress } from 'ethers';
import { Button, Card, CardActions, CardContent, CardHeader } from '@mui/material';
import { Loader } from '../Loader';
import { getPublicKeySignature } from '../../wallet';

export const EIP712: React.FC<{
  account: string;
  provider: BrowserProvider;
  contractAddress: string;
  abi: any;
}> = ({ account, provider, contractAddress, abi }) => {
  const [loading, setLoading] = useState('');
  const [verified, setVerified] = useState<boolean>(false);
  const [contract, setContract] = useState<Contract | null>();

  useEffect(() => {
    if (!contractAddress || !abi || !provider || !isAddress(contractAddress)) {
      return;
    }
    provider.getSigner().then((signer) => {
      try {
        setContract(new Contract(contractAddress, abi, signer));
      } catch (e) {}
    });
  }, [abi, contractAddress, provider]);

  if (!contract) {
    return null;
  }

  const verifyToken = async () => {
    setVerified(false);

    const { publicKey, signature } = await getPublicKeySignature(contractAddress, account);
    await contract.verify(publicKey, signature);
    setVerified(true);
    setLoading('');
  };

  return (
    <div className="EIP712">
      <div>
        <Card>
          <CardHeader title="Authorization token" />
          <CardContent>{verified && <>You can use now reencrypt data on contract {contractAddress}</>}</CardContent>
          <CardActions>
            {!loading && <Button onClick={verifyToken}>Validate authorization token</Button>}
            <Loader message={loading} />
          </CardActions>
        </Card>
      </div>
    </div>
  );
};
