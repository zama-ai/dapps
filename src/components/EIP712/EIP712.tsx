import React, { useMemo, useState } from 'react';
import { Contract, ethers } from 'ethers';
import { Button, Card, CardActions, CardContent, CardHeader } from '@mui/material';
import { Loader } from '../Loader';
import { generateToken } from '@zamafhe/web-sdk';

export const EIP712: React.FC<{
  account: string;
  provider: ethers.providers.Web3Provider;
  contractAddress: string;
  abi: any;
}> = ({ account, provider, contractAddress, abi }) => {
  const [loading, setLoading] = useState<string>('');

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

  const getBalance = async () => {
    const token = await generateToken({
      verifyingContract: '0xA0EcE74981AF3eD84D4659fe1F469E7c47e5Ed33',
    });
    const signer = provider.getSigner();
    const params = [await provider.getSigner().getAddress(), token.message];
    const sign = await window.ethereum.request({ method: 'eth_signTypedData_v4', params });
    const { r, v, s } = ethers.utils.splitSignature(sign);
    const response = await contract.balanceOf(v, r, s, token.keypair.publicKey);
    console.log(response);
  };

  return (
    <div className="EIP712">
      <div>
        <Card>
          <CardHeader title="EIP test" />
          <CardContent>Test</CardContent>
          <CardActions>
            {!loading && <Button onClick={getBalance}>Get balance</Button>}
            <Loader message={loading} />
          </CardActions>
        </Card>
      </div>
    </div>
  );
};
