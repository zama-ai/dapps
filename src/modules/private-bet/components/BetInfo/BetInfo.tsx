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
import { GAME_STATE } from '../../constants';

export const BetInfo: React.FC<{
  isAdmin: boolean;
  game: Game;
  gameId: number;
  erc20Contract: Contract;
  contract: Contract;
  provider: BrowserProvider;
}> = ({ isAdmin, game, gameId, contract, provider, erc20Contract }) => {
  const [selectedOption, setSelectedOption] = useState(1);
  const [dialog, setDialog] = useState('');
  const [loading, setLoading] = useState<string>('');

  const handleClose = () => setDialog('');

  const closeGame = async () => {
    try {
      setLoading('Sending transaction...');
      const transaction = await contract.closeGame(gameId, !!selectedOption);
      setLoading('Waiting for transaction validation...');
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog('Bet has been closed.');
    } catch (e) {}
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
        <CardHeader title={game.description} />
        <CardContent>
          <ListItemText primary="Open" secondary={game.state === GAME_STATE['OPEN'] ? 'Yes' : 'No'} />
          {game.state !== GAME_STATE['OPEN'] && (
            <ListItemText primary="Won?" secondary={game.isSuccessful ? 'Yes' : 'No'} />
          )}
          <ListItemText primary="Number of bets" secondary={`${game.numBets}`} />
        </CardContent>
        {isAdmin && game.state === GAME_STATE['OPEN'] && (
          <CardActions className="BetInfo__actions">
            <div className="BetInfo__state">
              <FormLabel>State</FormLabel>
              <Select
                value={selectedOption}
                onChange={(e) => setSelectedOption(+e.target.value)}
                size="small"
                disabled={!!loading}
              >
                <MenuItem value={1}>Win</MenuItem>
                <MenuItem value={0}>Lost</MenuItem>
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
