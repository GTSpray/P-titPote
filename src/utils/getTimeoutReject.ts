export const getTimeoutReject = (
  time: number,
  message: string,
  reject: CallableFunction,
) =>
  setTimeout(() => {
    reject(new Error(`${message} timed out after ${time}ms`));
  }, time);
