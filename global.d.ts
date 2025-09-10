import "vitest";
import "./tests/customMatchers/customMatchers.d.ts";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_ID: string;
      PUBLIC_KEY: string;
      BOT_TOKEN: string;
      LOCALTUNNEL_SUBDOMAIN: string;
      APP_PORT?: string;

      DB_HOST: string;
      MARIADB_DATABASE: string;
      MARIADB_USER: string;
      MARIADB_PASSWORD: string;
      MARIADB_ROOT_PASSWORD: string;
      MARIADB_TCP_PORT: string;
    }
  }
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

interface CustomMatchers<R = unknown> {
  toMeetApiResponse(statusCode: number, payload: object): ExpectationResult;

  toBeWithin(start: number, end: number): ExpectationResult;

  toBeArrayOfSize(expectedSize: number): ExpectationResult;

  toBeArray(): ExpectationResult;

  toBeOneOf(expected: unknown[]): ExpectationResult;

  toBeNegative(received: number): ExpectationResult;

  toBePositive(received: number): ExpectationResult;

  toBeNumber: () => ExpectationResult;

  toBeFunction: () => ExpectationResult;

  toBeString: () => ExpectationResult;

  toBeObject(): ExpectationResult;

  toBeInteger(): ExpectationResult;

  toBeFalse(): ExpectationResult;

  toBeTrue(): ExpectationResult;

  toContainAllValues(expectedValues: unknown[]): {
    pass: boolean;

    message: () => string;
  };

  toContainKey(key: string): {
    pass: boolean;

    message: () => string;
  };

  toInclude(value: any): {
    pass: boolean;

    message: () => string;
  };

  toIncludeAllMembers(expected: unknown[]): ExpectationResult;

  toContainAllKeys(expectedKeys: string[]): ExpectationResult;

  toContainValues(expectedValues: unknown[]): ExpectationResult;

  toBeEmpty(): ExpectationResult;

  toBeValidDate(): {
    pass: boolean;

    message: () => string;
  };
}

declare module "vitest" {
  interface ExpectationResult {
    actual?: unknown;

    expected?: unknown;

    message: () => string;

    pass: boolean;
  }
  interface Matchers<T = any> extends CustomMatchers<T> {}
}

export {};
