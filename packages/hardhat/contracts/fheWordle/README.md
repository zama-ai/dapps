# FHEWordle

**How the Game Works**

1. **Game Setup**: A factory contract deploys unique game instances for each player using minimal proxies. Each game
   has:
   - An encrypted target word (represented as encrypted letter indices 0-25)
   - A player address who can submit guesses
   - A relayer address who helps with FHE operations

2. **Word Submission**: The relayer submits the encrypted target word letters using `submitWord1`. The letters are
   stored as encrypted uint8 values.

3. **Player Guessing**: Players submit guesses by calling `guessWord1` with:
   - A word encoded as a uint32 (each letter as index 0-25)
   - A Merkle proof verifying the word is valid
   - Limited to 5 guesses total

4. **Guess Feedback**: After each guess, players can request feedback via `getGuess` which returns:
   - An encrypted equality mask showing exact letter matches (green)
   - An encrypted letter presence mask showing letters in wrong positions (yellow)

5. **Winning**: Players can claim victory using `claimWin` if they get all letters correct. The contract verifies this
   using FHE operations.

6. **Word Revelation**: After game completion, the target word can be revealed using `revealWordAndStore`.

7. **Proof Verification**: The relayer can verify game outcomes using Merkle proofs via `checkProof`.

The game leverages FHE operations to keep the target word encrypted while still allowing comparison with guesses. This
prevents players from seeing the word until the game is complete.
