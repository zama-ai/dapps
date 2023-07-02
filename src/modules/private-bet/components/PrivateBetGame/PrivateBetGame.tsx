import { Card, CardContent, Select, MenuItem, TextField, CardHeader, Button, ListItemText } from '@mui/material';
import { BrowserProvider, Contract } from 'ethers';
import React, { ChangeEventHandler, useEffect, useState } from 'react';
import { FormLabel } from '../../../common-ui';
import { Game } from '../../types';

import { Line } from '../../../../components/Line';
import { Loader } from '../../../../components/Loader';
import { Link } from 'gatsby';

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
  const [options, setOptions] = useState(['', '']);

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
    console.log(description, options[0], options[1]);
    const transaction = await contract.createGame(description, options[0], options[1]);
    console.log(transaction);
    setLoading('Waiting for game creation transaction validation...');
    await provider.waitForTransaction(transaction.hash);
    setLoading('');
  };

  const changeOption =
    (index: number): ChangeEventHandler<HTMLInputElement> =>
    (e) => {
      const o = [...options];
      o[index] = e.target.value;
      setOptions(o);
    };

  return (
    <>
      <Line>
        <Card>
          <CardHeader title="Info" />
          <CardContent>
            <ListItemText
              primary="Token contract"
              secondary={<Link to={`/erc20/?contract=${erc20Address}`}>{erc20Address}</Link>}
            />
            <div>
              <FormLabel>Choose a bet</FormLabel>
              <Select value={game} onChange={(option) => setGame(+option.target.value)} size="small">
                {games.map((game, index) => (
                  <MenuItem value={index} key={index}>
                    Bet {index + 1} - {game.isOpen ? 'Open' : 'Closed'}
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
                  placeholder="An amazing bet..."
                  onChange={(e) => {
                    setDescription(e.target.value);
                  }}
                  size="small"
                />
              </div>
              <div>
                <FormLabel>Options</FormLabel>
                <TextField placeholder="Option 1" value={options[0]} onChange={changeOption(0)} size="small" />
                <TextField placeholder="Option 2" value={options[1]} onChange={changeOption(1)} size="small" />
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
