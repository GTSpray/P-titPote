import { expect, ExpectationResult } from "vitest";

import { Response } from "express";
import { MockResponse } from "node-mocks-http";

function toBeType(received: unknown, expectedType: string): ExpectationResult {
  const pass = typeof received === expectedType && !Number.isNaN(received);
  return pass
    ? {
        message: () => `expected ${received} not to be a ${expectedType}`,
        pass: true,
      }
    : {
        message: () => `expected ${received} to be a ${expectedType}`,
        pass: false,
      };
}

expect.extend({
  toMeetApiResponse(
    received: MockResponse<Response>,
    expectedStatusCode: number,
    expectedBody: object,
  ) {
    const messages: string[] = [];
    if (!this.equals(received.statusCode, expectedStatusCode)) {
      messages.push(
        `expected response status code ${this.utils.printReceived(
          received.statusCode,
        )} should be ${this.utils.printExpected(expectedStatusCode)}`,
      );
    }
    try {
      const receivedBody = received._getJSONData();
      if (!this.equals(receivedBody, expectedBody)) {
        messages.push(
          `Invalid response body\nExpected:\n${this.utils.printExpected(
            expectedBody,
          )}\nReceived: ${this.utils.printReceived(
            receivedBody,
          )}\n\n${this.utils.diff(expectedBody, receivedBody)}`,
        );
      }
    } catch (e) {
      messages.push(
        `expected response body to be a valid JSON string\nReceived:\n${this.utils.printReceived(
          received._getData(),
        )}`,
      );
    }

    return {
      message: () => messages.join("\n\n"),
      pass: messages.length <= 0,
    };
  },
  toBeWithin(actual: unknown, start: number, end: number) {
    const { printReceived, printExpected, matcherHint } = this.utils;

    const pass =
      (typeof actual === "number" || typeof actual === "bigint") &&
      actual >= start &&
      actual < end;

    return {
      pass,
      message: () =>
        pass
          ? matcherHint(".not.toBeWithin") +
            "\n\n" +
            "Expected number to not be within start (inclusive) and end (exclusive):\n" +
            `  start: ${printExpected(start)}  end: ${printExpected(end)}\n` +
            "Received:\n" +
            `  ${printReceived(actual)}`
          : matcherHint(".toBeWithin") +
            "\n\n" +
            "Expected number to be within start (inclusive) and end (exclusive):\n" +
            `  start: ${printExpected(start)}  end: ${printExpected(end)}\n` +
            "Received:\n" +
            `  ${printReceived(actual)}`,
    };
  },
  toBeArrayOfSize(received: unknown, expectedSize: number): ExpectationResult {
    const pass = Array.isArray(received) && received.length === expectedSize;

    return pass
      ? {
          message: () =>
            `expected array not to have size ${this.utils.printExpected(expectedSize)}, but received array of size ${this.utils.printReceived(received.length)}`,
          pass: true,
        }
      : {
          message: () =>
            Array.isArray(received)
              ? `expected array of size ${this.utils.printExpected(expectedSize)}, but received array of size ${this.utils.printReceived(received.length)}`
              : `expected array of size ${this.utils.printExpected(expectedSize)}, but received a non-array`,
          pass: false,
        };
  },
  toBeArray(received: unknown): ExpectationResult {
    const pass = Array.isArray(received);
    return pass
      ? {
          message: () => "expected array",
          pass: true,
        }
      : {
          message: () =>
            `expected ${this.utils.printExpected("array")}, but received ${this.utils.printReceived(typeof received)}`,
          pass: false,
        };
  },
  toBeOneOf(received: unknown, expected: unknown[]): ExpectationResult {
    const pass = expected.includes(received);

    return pass
      ? {
          pass: true,
          message: () =>
            `expected ${this.utils.printReceived(received)} not to be one of ${this.utils.printExpected(expected)}`,
        }
      : {
          pass: false,
          message: () =>
            `expected ${this.utils.printReceived(received)} to be one of ${this.utils.printExpected(expected)}\n\n${this.utils.diff(expected, received)}`,
        };
  },
  toBeNegative(received: number): ExpectationResult {
    if (typeof received !== "number") {
      throw new TypeError(`Expected a number, but received ${typeof received}`);
    }

    const pass = received < 0;
    return pass
      ? {
          pass: true,
          message: () =>
            `expected ${this.utils.printReceived(received)} not to be negative`,
        }
      : {
          pass: false,
          message: () =>
            `expected ${this.utils.printReceived(received)} to be negative`,
        };
  },
  toBePositive(received: number): ExpectationResult {
    if (typeof received !== "number") {
      throw new TypeError(`Expected a number, but received ${typeof received}`);
    }

    const pass = received > 0;
    return pass
      ? {
          pass: true,
          message: () =>
            `expected ${this.utils.printReceived(received)} not to be positive`,
        }
      : {
          pass: false,
          message: () =>
            `expected ${this.utils.printReceived(received)} to be positive`,
        };
  },
  toBeNumber: (received: unknown) => toBeType(received, "number"),
  toBeFunction: (received: unknown) => toBeType(received, "function"),
  toBeString: (received: unknown) => toBeType(received, "string"),
  toBeObject(received: unknown): ExpectationResult {
    const pass =
      typeof received === "object" &&
      !Array.isArray(received) &&
      received !== null;
    return pass
      ? {
          message: () =>
            `expected ${this.utils.printReceived(received)} to be object`,
          pass: true,
        }
      : {
          message: () =>
            `expected ${this.utils.printReceived(received)} to be an object but was ${Array.isArray(received) ? "array" : typeof received}`,
          pass: false,
        };
  },
  toBeInteger(received: number): ExpectationResult {
    if (typeof received !== "number") {
      throw new TypeError(`Expected a number, but received ${typeof received}`);
    }

    const pass = Number.isInteger(received);
    return pass
      ? {
          pass: true,
          message: () =>
            `expected ${this.utils.printReceived(received)} not to be an integer`,
        }
      : {
          pass: false,
          message: () =>
            `expected ${this.utils.printReceived(received)} to be an integer`,
        };
  },
  toBeFalse(received: unknown): ExpectationResult {
    const pass = received === false;
    return pass
      ? {
          message: () =>
            `expected ${this.utils.printReceived(received)} to be false`,
          pass: true,
        }
      : {
          message: () =>
            `expected ${this.utils.printReceived(received)} to be false but was not false`,
          pass: false,
        };
  },
  toBeTrue(received: unknown): ExpectationResult {
    const pass = received === true;
    return pass
      ? {
          message: () =>
            `expected ${this.utils.printReceived(received)} to be true`,
          pass: true,
        }
      : {
          message: () =>
            `expected ${this.utils.printReceived(received)} to be true but was not true`,
          pass: false,
        };
  },
  toContainAllValues(received: unknown, expectedValues: unknown[]) {
    let receivedValues: unknown[];

    // Check if received is an array or an object
    if (Array.isArray(received)) {
      receivedValues = received;
    } else if (typeof received === "object" && received !== null) {
      receivedValues = Object.values(received);
    } else {
      return {
        pass: false,
        message: () =>
          `Expected an array or object, but received ${typeof received}.`,
      };
    }

    // Check if all expected values are in the received values
    const pass = expectedValues.every((value) =>
      receivedValues.includes(value),
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${this.utils.printReceived(received)} not to contain all values ${this.utils.printExpected(expectedValues)}, but it does.`
          : `Expected ${this.utils.printReceived(received)} to contain all values ${this.utils.printExpected(expectedValues)}, but it does not.`,
    };
  },
  toContainKey(received: object, key: string) {
    const pass = Object.prototype.hasOwnProperty.call(received, key);
    return pass
      ? {
          pass: true,
          message: () =>
            `Expected object not to contain key "${this.utils.printExpected(key)}", but it does.`,
        }
      : {
          pass: false,
          message: () =>
            `Expected object to contain key "${this.utils.printExpected(key)}", but it does not.`,
        };
  },
  toInclude(received: unknown, value: any) {
    let pass: boolean;

    if (Array.isArray(received)) {
      pass = received.includes(value);
    } else if (typeof received === "string") {
      pass = received.includes(value);
    } else if (typeof received === "object" && received !== null) {
      pass = Object.values(received).includes(value);
    } else {
      pass = false;
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${this.utils.printReceived(received)} not to include ${this.utils.printExpected(value)}, but it does.`
          : `Expected ${this.utils.printReceived(received)} to include ${this.utils.printExpected(value)}, but it does not.`,
    };
  },
  toIncludeAllMembers(
    received: unknown[],
    expected: unknown[],
  ): ExpectationResult {
    if (!Array.isArray(received) || !Array.isArray(expected)) {
      return {
        pass: false,
        message: () =>
          "Expected both received and expected values to be arrays.",
      };
    }

    const missingMembers = expected.filter((item) => !received.includes(item));

    return missingMembers.length === 0
      ? {
          pass: true,
          message: () =>
            `Expected array not to include all members of ${this.utils.printExpected(expected)}, but it does.`,
        }
      : {
          pass: false,
          message: () =>
            `Expected array to include all members of ${this.utils.printExpected(expected)}. Missing members: ${this.utils.printReceived(
              missingMembers,
            )}.`,
        };
  },
  toContainAllKeys(
    received: object,
    expectedKeys: string[],
  ): ExpectationResult {
    if (typeof received !== "object" || received === null) {
      return {
        pass: false,
        message: () =>
          `Expected ${this.utils.printReceived(received)} to be an object.`,
      };
    }

    if (!Array.isArray(expectedKeys)) {
      return {
        pass: false,
        message: () =>
          `Expected keys to be an array, but received ${this.utils.printExpected(expectedKeys)}.`,
      };
    }

    const missingKeys = expectedKeys.filter((key) => !(key in received));

    return missingKeys.length === 0
      ? {
          pass: true,
          message: () =>
            `Expected object not to contain all keys ${this.utils.printExpected(expectedKeys)}, but it does.`,
        }
      : {
          pass: false,
          message: () =>
            `Expected object to contain all keys ${this.utils.printExpected(expectedKeys)}. Missing keys: ${this.utils.printExpected(
              missingKeys,
            )}.`,
        };
  },
  toContainValues(
    received: object,
    expectedValues: unknown[],
  ): ExpectationResult {
    if (typeof received !== "object" || received === null) {
      return {
        pass: false,
        message: () =>
          `Expected ${this.utils.printReceived(received)} to be an object.`,
      };
    }

    if (!Array.isArray(expectedValues)) {
      return {
        pass: false,
        message: () =>
          `Expected values to be an array, but received ${this.utils.printExpected(expectedValues)}.`,
      };
    }

    const objectValues = Object.values(received);

    const deepEqual = (a: any, b: any): boolean => {
      if (a === b) return true;
      if (typeof a !== typeof b) return false;
      if (a && b && typeof a === "object") {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every((key) => deepEqual(a[key], b[key]));
      }
      return false;
    };

    const missingValues = expectedValues.filter(
      (expectedValue) =>
        !objectValues.some((value) => deepEqual(value, expectedValue)),
    );

    return missingValues.length === 0
      ? {
          pass: true,
          message: () =>
            `Expected object not to contain all values ${this.utils.printExpected(expectedValues)}, but it does.`,
        }
      : {
          pass: false,
          message: () =>
            `Expected object to contain all values ${this.utils.printExpected(expectedValues)}. Missing values: ${this.utils.printExpected(
              missingValues,
            )}.`,
        };
  },
  toBeEmpty(received: unknown): ExpectationResult {
    let isEmpty = false;

    if (Array.isArray(received) || typeof received === "string") {
      isEmpty = received.length === 0;
    } else if (received && typeof received === "object") {
      isEmpty = Object.keys(received).length === 0;
    } else if (received instanceof Map || received instanceof Set) {
      isEmpty = received.size === 0;
    } else {
      return {
        pass: false,
        message: () =>
          `Expected value to be an empty array, string, object, Map, or Set, but received ${typeof received}.`,
      };
    }

    return isEmpty
      ? {
          pass: true,
          message: () => "Expected value not to be empty, but it was.",
        }
      : {
          pass: false,
          message: () => "Expected value to be empty, but it was not.",
        };
  },
  toBeValidDate(received: unknown) {
    const isValid =
      received instanceof Date && !Number.isNaN(received.getTime());

    return {
      pass: isValid,
      message: () =>
        isValid
          ? `expected ${this.utils.printReceived(received)} not to be a valid Date`
          : `expected ${this.utils.printReceived(received)} to be a valid Date`,
    };
  },
});
