export const delay = (ms = 0): Promise<void> => new Promise((resolve) => {
  setTimeout(() => resolve(), ms)
});