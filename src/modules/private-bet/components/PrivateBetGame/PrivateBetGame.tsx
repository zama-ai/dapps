import { Card, CardContent, Select, MenuItem, TextField, CardHeader, Button, ListItemText } from '@mui/material';
import { BrowserProvider, Contract } from 'ethers';
import React, { ChangeEventHandler, useEffect, useState } from 'react';
import { FormLabel } from '../../../common-ui';
import { Game } from '../../types';

import { Line } from '../../../../components/Line';
import { Loader } from '../../../../components/Loader';
import { Link } from 'gatsby';
import { GAME_STATE } from '../../constants';

const MAX_LENGTH = 20;
const trim = (str: string) => {
  if (str.length <= MAX_LENGTH + 3) return str;
  return `${str.substring(0, MAX_LENGTH)}...`;
};

export const PrivateBetGame: React.FC<{
  children: (game: Game, gameId: number, isAdmin: boolean) => React.ReactNode;
  account: string;
  erc20Contract: Contract;
  contract: Contract;
  provider: BrowserProvider;
}> = ({ erc20Contract, account, children, contract, provider }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState<string>('');
  const [erc20Address, setErc20Address] = useState('');
  const [game, setGame] = useState<number>(0);
  const [games, setGames] = useState<Game[]>([]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    erc20Contract.getAddress().then(setErc20Address);
    contract.numGames().then(async (maxGame: bigint) => {
      const listGames: any[] = [];
      for (let i = 0; i < maxGame; i += 1) {
        await contract.games(i).then((g) => {
          listGames.push(g.toObject());
        });
      }
      console.log(listGames);
      setGame(+maxGame.toString() - 1);
      setGames(listGames);
    });
    contract.contractOwner().then((owner) => {
      setIsAdmin(owner.toLowerCase() === account.toLowerCase());
    });
  }, []);

  const addGame = async () => {
    setLoading('Sending transaction...');
    const transaction = await contract.createGame(description);
    console.log(transaction);
    setLoading('Waiting for game creation transaction validation...');
    await provider.waitForTransaction(transaction.hash);
    setLoading('');
  };

  return (
    <>
      <Line>
        <Card>
          <CardHeader title="Game" />
          <CardContent>
            <ListItemText
              primary="Token contract"
              secondary={<Link to={`/erc20/?contract=${erc20Address}`}>{erc20Address}</Link>}
            />
            <div>
              <FormLabel>Choose a game</FormLabel>
              <Select value={game} onChange={(option) => setGame(+option.target.value)} size="small">
                {games.map((game, index) => (
                  <MenuItem value={index} key={index}>
                    {index + 1} - {trim(game.description)} - {game.state === GAME_STATE['OPEN'] ? 'Open' : 'Closed'}
                  </MenuItem>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardHeader title="Add a game" subheader="Add a new bet" />
            <CardContent>
              <div>
                <FormLabel>Description</FormLabel>
                <TextField
                  placeholder="XXX will YYY"
                  onChange={(e) => {
                    setDescription(e.target.value);
                  }}
                  size="small"
                />
              </div>
              <Button onClick={addGame} variant="contained">
                Add
              </Button>
              <Loader message={loading} />
            </CardContent>
          </Card>
        )}
      </Line>
      {game != null && games[game] && children(games[game], game, isAdmin)}
    </>
  );
};
