export const getPromiseWithTimeout = <T extends unknown>(
  timeout: number,
  message: string,
  executor: (
    resolve: (value: T) => void,
    reject: (reason?: any) => void,
  ) => void,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(new Error(`${message.replace("%t", `${timeout}`)}`));
    }, timeout);

    const rej = (reason: unknown) => {
      if (!expired) {
        clearTimeout(timer);
        reject(reason);
      }
    };
    const res = (value: T) => {
      if (!expired) {
        clearTimeout(timer);
        resolve(value);
      }
    };
    executor(res, rej);
  });
};
