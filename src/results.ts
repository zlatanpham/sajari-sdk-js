export interface ResultValues {
  [id: string]: string | string[];
}

export interface PosNegToken {
  pos: string;
  neg: string;
}

export interface ClickToken {
  click: string;
}

export type Token = PosNegToken | ClickToken;

export interface Result {
  // Values are field values of records.
  values: ResultValues;

  // Token contains the token associated with this Result (if any).
  token: Token;

  // Score is the overall score of this Result.
  score: number;

  // IndexScore is the index-matched score of this Result.
  indexScore: number;
}

// CountResponse is a type returned from a query which has
// performed a count aggregate.
export interface CountResponse {
  [id: string]: number;
}

export interface BucketResponse {
  // Name of the bucket.
  name: string;

  // Number of records.
  count: number;
}

// BucketsResponse is a type returned from a query performing bucket aggregate.
export interface BucketsResponse {
  [id: string]: BucketResponse;
}

export interface AggregateResponse {
  [id: string]: CountResponse | BucketsResponse;
}

export interface Results {
  // Reads is the total number of index values read.
  reads: number;

  // TotalResults is the total number of results for the query.
  totalResults: number;

  // Time in seconds taken to perform the query.
  time: number;

  // Aggregates computed on the query results (see Aggregate).
  aggregates: AggregateResponse;

  // Results of the query.
  results: Result[];
}
