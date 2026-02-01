export interface TokenMetadata {
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
  image_url: string | null;
  description: string | null;
  launch_timestamp: string | null;
  liquidity_sol: number | null;
  market_cap_usd: number | null;
  holder_count: number | null;
}
