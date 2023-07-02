import React, { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
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
  MenuItem,
  Select,
} from '@mui/material';
import { FormLabel } from '../../../common-ui';

import { Loader } from '../../../../components/Loader';
import { Game } from '../../types';

import './BetInfo.css';

export const BetInfo: React.FC<{
  isAdmin: boolean;
  game: Game;
  gameId: number;
  erc20Contract: Contract;
  contract: Contract;
  provider: BrowserProvider;
}> = ({ isAdmin, game, gameId, contract, provider, erc20Contract }) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const [dialog, setDialog] = useState('');
  const [loading, setLoading] = useState<string>('');

  const handleClose = () => setDialog('');

  const closeGame = async () => {
    setLoading('Sending transaction...');
    const transaction = await contract.closeGame(gameId, selectedOption);
    setLoading('Waiting for transaction validation...');
    await provider.waitForTransaction(transaction.hash);
    setLoading('');
    setDialog('Bet has been closed.');
  };

  const cancelGame = async () => {
    setLoading('Sending transaction...');
    const transaction = await contract.cancelGame(gameId);
    setLoading('Waiting for transaction validation...');
    await provider.waitForTransaction(transaction.hash);
    setLoading('');
    setDialog('Bet has been canceled.');
  };

  return (
    <>
      <Card>
        <CardHeader title="Information" />
        <CardContent>
          <ListItemText primary="Description" secondary={game.description} />
          <ListItemText primary="Open" secondary={game.isOpen ? 'Yes' : 'No'} />
          {!game.isOpen && (
            <ListItemText primary="Winning option" secondary={game.winningOption == 0n ? game.option1 : game.option2} />
          )}
          <ListItemText primary="Num bets" secondary={`${game.numBets}`} />
        </CardContent>
        {isAdmin && game.isOpen && (
          <CardActions className="BetInfo__actions">
            <div>
              <FormLabel>Winning option</FormLabel>
              <Select
                value={selectedOption}
                onChange={(e) => setSelectedOption(+e.target.value)}
                size="small"
                disabled={!!loading}
              >
                <MenuItem value={0}>{game.option1}</MenuItem>
                <MenuItem value={1}>{game.option2}</MenuItem>
              </Select>
            </div>
            <Button onClick={closeGame} variant="contained" disabled={!!loading}>
              Close game
            </Button>
            {!loading && (
              <Button onClick={cancelGame} disabled={!!loading}>
                Cancel game
              </Button>
            )}
            <Loader message={loading} />
          </CardActions>
        )}
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
