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
import { GAME_STATE, getGameState } from '../../constants';

export const BetInfo: React.FC<{
  refresh: () => Promise<number>;
  isAdmin: boolean;
  game: Game;
  gameId: number;
  erc20Contract: Contract;
  contract: Contract;
  provider: BrowserProvider;
}> = ({ refresh, isAdmin, game, gameId, contract, provider, erc20Contract }) => {
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
      await refresh();
      setDialog('Game has been closed.');
    } catch (e) {
      console.log(e);
    }
  };

  const pauseGame = async () => {
    try {
      setLoading('Sending transaction...');
      const transaction = await contract.pauseGame(gameId);
      setLoading('Waiting for transaction validation...');
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      await refresh();
      setDialog('Game has been paused.');
    } catch (e) {
      console.log(e);
    }
  };

  const cancelGame = async () => {
    try {
      setLoading('Sending transaction...');
      const transaction = await contract.cancelGame(gameId);
      setLoading('Waiting for transaction validation...');
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      await refresh();
      setDialog('Game has been canceled.');
    } catch (e) {
      console.log(e);
    }
  };

  const isOpen = game.state === GAME_STATE['OPEN'] || game.state === GAME_STATE['PENDING'];
  const state = getGameState(game.state);

  return (
    <>
      <Card>
        <CardHeader title={game.description} />
        <CardContent>
          <ListItemText primary="State" secondary={state} />
          {game.state == GAME_STATE['CLOSED'] && (
            <ListItemText primary="Won?" secondary={game.isSuccessful ? 'Yes' : 'No'} />
          )}
          <ListItemText primary="Number of bets" secondary={`${game.numBets}`} />
        </CardContent>
        {isAdmin && isOpen && (
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

            <Button onClick={pauseGame} disabled={!!loading}>
              Pause game (no more bet)
            </Button>

            <Button onClick={cancelGame} disabled={!!loading}>
              Cancel game
            </Button>

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
