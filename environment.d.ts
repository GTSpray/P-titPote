import 'jest-extended';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            APP_ID: string;
            PUBLIC_KEY: string;
            BOT_TOKEN: string;
            LOCALTUNNEL_SUBDOMAIN: string;
            APP_PORT?: string;
        }
    }
    namespace Express {
        interface Request {
            requestId: string
        }
    }
    namespace jest {
        interface Expect {
            toMeetApiResponse(
                statusCode: number,
                payload: object
            ): CustomMatcherResult;
        }
        interface Matchers<R> {
            toMeetApiResponse(
                statusCode: number,
                payload: object
            ): APIGatewayProxyResult;
        }
    }
}

export { }