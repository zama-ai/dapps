export const GAME_STATE = {
  OPEN: 0n,
  PENDING: 1n,
  CLOSED: 2n,
  CANCELLED: 3n,
};

export const getGameState = (state: bigint) => {
  switch (state) {
    case GAME_STATE['OPEN']: {
      return 'Open';
    }
    case GAME_STATE['PENDING']: {
      return 'Pending';
    }
    case GAME_STATE['CANCELLED']: {
      return 'Cancelled';
    }
    case GAME_STATE['CLOSED']: {
      return 'Closed';
    }
    default: {
      return '-';
    }
  }
};
