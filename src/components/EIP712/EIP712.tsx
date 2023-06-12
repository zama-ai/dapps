import React, { useMemo, useState } from 'react';
import { Contract, ethers } from 'ethers';
import { Button, Card, CardActions, CardContent, CardHeader } from '@mui/material';
import { Loader } from '../Loader';
import { generateToken } from '../../wallet';

export const EIP712: React.FC<{
  account: string;
  provider: ethers.providers.Web3Provider;
  contractAddress: string;
  abi: any;
}> = ({ account, provider, contractAddress, abi }) => {
  const [loading, setLoading] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');

  const contract = useMemo<Contract | null>(() => {
    if (!contractAddress || !abi || !provider || !ethers.utils.isAddress(contractAddress)) {
      return null;
    }

    try {
      return new ethers.Contract(contractAddress, abi, provider.getSigner());
    } catch (e) {
      return null;
    }
  }, [abi, contractAddress, provider]);

  if (!contract) {
    return null;
  }

  const verifyToken = async () => {
    setPrivateKey('');
    const token = await generateToken(contractAddress);
    const params = [await provider.getSigner().getAddress(), JSON.stringify(token.eip712)];
    const sign: string = await window.ethereum.request({ method: 'eth_signTypedData_v4', params });
    const response = await contract.verify(token.keypair.publicKey, sign);
    if (response) {
      setPrivateKey(token.keypair.privateKey);
    }
  };

  return (
    <div className="EIP712">
      <div>
        <Card>
          <CardHeader title="Authorization token" />
          <CardContent>
            {privateKey && (
              <>
                You can use the private key {privateKey} to reencrypt data on contract {contractAddress}
              </>
            )}
          </CardContent>
          <CardActions>
            {!loading && <Button onClick={verifyToken}>Validate authorization token</Button>}
            <Loader message={loading} />
          </CardActions>
        </Card>
      </div>
    </div>
  );
};
