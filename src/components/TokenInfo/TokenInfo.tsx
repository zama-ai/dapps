import React, { useEffect, useState } from 'react';
// import { generateToken } from '@zamafhe/web-sdk';
import { Contract } from 'ethers';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  ListItemText,
} from '@mui/material';
import { Loader } from '../Loader';
import { callAndDecrypt, encrypt } from '../../wallet';

const NO_SUPPLY = 'NO_SUPPLY';

export const TokenInfo: React.FC<{
  abi: any;
  account: string;
  contract: Contract;
  provider: any;
}> = ({ abi, account, contract, provider }) => {
  const [name, setName] = useState('');
  const [decimals, setDecimals] = useState('');
  const [symbol, setSymbol] = useState('');
  const [encryptedTotalSupply, setEncryptedTotalSupply] = useState('');
  const [decryptedTotalSupply, setDecryptedTotalSupply] = useState('');
  const [loading, setLoading] = useState<string>('');
  const [dialog, setDialog] = useState('');

  const refreshTotalSupply = async () => {
    const data = await contract.totalSupply();
    setDecryptedTotalSupply('');
    if (data.toString() === '0') {
      setEncryptedTotalSupply(NO_SUPPLY);
    } else {
      setEncryptedTotalSupply(`${data.toHexString().substring(0, 40)}...`);
    }
  };

  useEffect(() => {
    try {
      contract.name().then(setName);
      contract.decimals().then(setDecimals);
      contract.symbol().then(setSymbol);
      refreshTotalSupply();
    } catch (e) {
      console.log(e);
    }
  }, []);

  const mint = async () => {
    try {
      setLoading('Encrypting "7" and generating ZK proof...');
      const encrypted7 = await encrypt(provider, 7);
      setLoading('Sending transaction...');
      const transaction = await contract.mint(encrypted7);
      setLoading('Waiting for transaction validation...');
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      refreshTotalSupply();
      setDialog('The contract has been minted!');
    } catch (e) {
      setLoading('');
    }
  };

  const reencrypt = async () => {
    try {
      setLoading('Decrypting total supply...');
      // const token = await generateToken({
      //   verifyingContract: '0xA0EcE74981AF3eD84D4659fe1F469E7c47e5Ed33',
      // });
      // const signedToken = await provider.signMessage(token.message);

      // const totalSup = await contract.getTotalSupply(token.message);
      const totalSup = await callAndDecrypt(provider, {
        account,
        abi,
        address: contract.address,
        method: 'getTotalSupply',
      });
      setDecryptedTotalSupply(totalSup);
      setLoading('');
    } catch (e) {
      setLoading('');
      console.log(e);
    }
  };

  const handleClose = () => setDialog('');

  return (
    <>
      <Card>
        <CardHeader title={name} />
        <CardContent>
          <ListItemText primary={`Symbol ${symbol}`} secondary={`Decimals ${decimals}`} />
          {!decryptedTotalSupply && (
            <ListItemText
              primary="Total supply"
              secondary={encryptedTotalSupply === NO_SUPPLY ? 'No supply' : encryptedTotalSupply}
            />
          )}
          {decryptedTotalSupply && (
            <ListItemText primary="Total supply" secondary={`${decryptedTotalSupply} ${symbol}`} />
          )}
        </CardContent>
        <CardActions>
          {!loading && <Button onClick={mint}>Mint 7 tokens</Button>}
          {!loading && encryptedTotalSupply !== NO_SUPPLY && <Button onClick={reencrypt}>Total supply</Button>}
          <Loader message={loading} />
        </CardActions>
      </Card>
      <Dialog
        open={dialog !== ''}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>{dialog}</DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>OK</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
