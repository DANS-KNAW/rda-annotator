function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[m][n];
}

function textMatchScore(text: string, str: string): number {
  if (text.length === 0 || str.length === 0) {
    return 0;
  }
  const distance = editDistance(text, str);
  return 1 - distance / str.length;
}

interface Match {
  start: number;
  end: number;
  score: number;
}

export function matchQuote(
  text: string,
  quote: string,
  prefix?: string,
  suffix?: string,
  hint?: number
): Match | null {
  let matches: Match[] = [];

  let exactMatch = text.indexOf(quote);
  while (exactMatch !== -1) {
    matches.push({
      start: exactMatch,
      end: exactMatch + quote.length,
      score: 1.0,
    });
    exactMatch = text.indexOf(quote, exactMatch + 1);
  }

  if (matches.length === 0 && quote.length <= 100) {
    const maxErrors = Math.min(32, Math.floor(quote.length / 4));
    const quoteLen = quote.length;
    const searchWindow = hint !== undefined
      ? { start: Math.max(0, hint - 1000), end: Math.min(text.length, hint + quote.length + 1000) }
      : { start: 0, end: Math.min(text.length, 10000) };

    for (let i = searchWindow.start; i <= searchWindow.end - quoteLen; i++) {
      const candidate = text.slice(i, i + quoteLen);
      const distance = editDistance(candidate, quote);

      if (distance <= maxErrors) {
        matches.push({
          start: i,
          end: i + quoteLen,
          score: textMatchScore(candidate, quote),
        });
      }
    }
  }

  if (matches.length === 0) {
    return null;
  }

  matches.forEach((match) => {
    let contextScore = 0;
    const contextWeight = 0.5;
    const prefixWeight = 0.2;
    const suffixWeight = 0.2;
    const positionWeight = 0.02;

    if (prefix) {
      const prefixStart = Math.max(0, match.start - prefix.length);
      const actualPrefix = text.slice(prefixStart, match.start);
      const prefixScore = textMatchScore(actualPrefix, prefix);
      contextScore += prefixScore * prefixWeight;
    }

    if (suffix) {
      const suffixEnd = Math.min(text.length, match.end + suffix.length);
      const actualSuffix = text.slice(match.end, suffixEnd);
      const suffixScore = textMatchScore(actualSuffix, suffix);
      contextScore += suffixScore * suffixWeight;
    }

    if (hint !== undefined) {
      const distance = Math.abs(match.start - hint);
      const positionScore = 1 - Math.min(distance / text.length, 1);
      contextScore += positionScore * positionWeight;
    }

    match.score = match.score * contextWeight + contextScore;
  });

  matches.sort((a, b) => b.score - a.score);

  return matches[0];
}
