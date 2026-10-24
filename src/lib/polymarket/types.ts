export type TickSize = "0.1" | "0.01" | "0.001" | "0.0001";

export interface Outcome {
  readonly name: string;
  readonly price: number;
  readonly tokenId: string;
}

export interface Market {
  readonly id: string;
  readonly question: string;
  /** Short label used inside multi-market events (Gamma `groupItemTitle`). */
  readonly label: string;
  /** Gamma `sportsMarketType`, e.g. "moneyline", "spreads", "totals"; "" for non-sports markets. */
  readonly sportsMarketType: string;
  readonly slug: string;
  readonly conditionId: string;
  readonly image: string;
  readonly outcomes: readonly Outcome[];
  readonly volume: number;
  readonly volume24hr: number;
  readonly liquidity: number;
  readonly bestBid: number;
  readonly bestAsk: number;
  readonly lastTradePrice: number;
  readonly oneDayPriceChange: number;
  readonly endDate: string;
  readonly closed: boolean;
  readonly tradable: boolean;
  readonly negRisk: boolean;
  readonly tickSize: TickSize;
  readonly minSize: number;
}

export interface Tag {
  readonly id: string;
  readonly label: string;
  readonly slug: string;
}

/** Sports team from Gamma event `teams`. */
export interface Team {
  readonly name: string;
  readonly abbreviation: string;
  readonly color: string;
  readonly logo: string;
}

export interface PolyEvent {
  readonly id: string;
  /** Gamma `parentEventId` for a game's child events ("Exact Score", "More Markets", …); "" otherwise. */
  readonly parentEventId: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly image: string;
  readonly icon: string;
  readonly volume: number;
  readonly volume24hr: number;
  readonly liquidity: number;
  readonly endDate: string;
  readonly closed: boolean;
  readonly negRisk: boolean;
  readonly commentCount: number;
  readonly tags: readonly Tag[];
  readonly teams: readonly Team[];
  readonly markets: readonly Market[];
  /** True when the event is a single Yes/No market. */
  readonly isBinary: boolean;
}
