import * as extendedMatchers from 'jest-extended';
import { Response } from 'express';
import { MockResponse } from 'node-mocks-http';
import { REST } from 'discord.js';
import { DiscrodRESTMock } from './mocks/discordjs';

jest.mock('../src/logger', () => ({
    __esModule: true,
    logger: {
        debug: jest.fn(),
        log: jest.fn(),
        http: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        verbose: jest.fn()
    }
}));


jest.mock('discord.js', () => {
    const discordJs = jest.requireActual('discord.js');
    return {
        ...discordJs,
        REST: DiscrodRESTMock
    }
})


expect.extend({
    ...extendedMatchers,
    toMeetApiResponse(
        received: MockResponse<Response>,
        expectedStatusCode: number,
        expectedBody: object
    ) {
        const messages: string[] = [];
        if (!this.equals(received.statusCode, expectedStatusCode)) {
            messages.push(
                `expected response status code ${this.utils.printReceived(
                    received.statusCode
                )} should be ${this.utils.printExpected(expectedStatusCode)}`
            );
        }
        try {
            const receivedBody = received._getJSONData()
            if (!this.equals(receivedBody, expectedBody)) {
                messages.push(
                    `Invalid response body\nExpected: ${this.utils.printExpected(
                        expectedBody
                    )}\nReceived: ${this.utils.printReceived(
                        receivedBody
                    )}\n\n${this.utils.diff(expectedBody, receivedBody)}`
                );
            }
        } catch (e) {
            messages.push(
                `expected response body to be a valid JSON string\nReceived:${this.utils.printReceived(
                    received._getData()
                )}`
            );
        }

        return {
            message: () => messages.join('\n\n'),
            pass: messages.length <= 0,
        };
    },
});