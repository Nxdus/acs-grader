const getTimeFactor = (executionTime: number | null) => {
  if (executionTime === null || Number.isNaN(executionTime)) return 0.5;
  if (executionTime <= 1) return 1.0;
  if (executionTime <= 2) return 0.9;
  if (executionTime <= 3) return 0.8;
  if (executionTime <= 5) return 0.7;
  return 0.5;
};

const getMemoryFactor = (memoryUsedKb: number | null) => {
  if (memoryUsedKb === null || Number.isNaN(memoryUsedKb)) return 0.7;
  const memoryMb = memoryUsedKb / 1024;
  if (memoryMb <= 64) return 1.0;
  if (memoryMb <= 128) return 0.9;
  if (memoryMb <= 256) return 0.8;
  return 0.7;
};

const getLanguageFactor = (languageId: number) => {
  if ([50, 54].includes(languageId)) return 1.0; // C, C++
  if (languageId === 62) return 0.95; // Java
  if ([63, 93].includes(languageId)) return 0.9; // JavaScript
  if ([71, 70].includes(languageId)) return 0.85; // Python
  return 0.9;
};

export const computeScore = (
  maxScore: number,
  executionTime: number | null,
  memoryUsedKb: number | null,
  languageId: number,
) => {
  const timeFactor = getTimeFactor(executionTime);
  const memoryFactor = getMemoryFactor(memoryUsedKb);
  const languageFactor = getLanguageFactor(languageId);
  const rawScore = maxScore * timeFactor * memoryFactor * languageFactor;
  return Math.max(0, Math.round(rawScore));
};
