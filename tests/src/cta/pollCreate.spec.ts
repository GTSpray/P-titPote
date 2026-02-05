import {
    SqlEntityManager,
    AbstractSqlDriver,
    AbstractSqlConnection,
    AbstractSqlPlatform,
} from "@mikro-orm/mariadb";
import { pollCreate } from "../../../src/commands/cta/poll/pollCreate.js";
import {
    ModalHandlerOptions,
} from "../../../src/commands/modals.js";
import { initORM } from "../../../src/db/db.js";
import { getInteractionModalHttpMock } from "../../mocks/getInteractionHttpMock.js";
import { DiscordGuild } from "../../../src/db/entities/DiscordGuild.entity.js";
import { expectedDiscordGuild } from "../../epectedEntities/expectedDiscordGuild.js";
import { randomDiscordId19 } from "../../mocks/discord-api/utils.js";
import { ButtonStyle, ComponentType, InteractionResponseType } from "discord-api-types/v10";
import { InteractionResponseFlags, MessageComponentTypes } from "discord-interactions";
import { expectedPoll } from "../../epectedEntities/expectedPoll.js";
import { Poll } from "../../../src/db/entities/Poll.entity.js";

describe("cta/pollCreate", () => {
    let guild_id: string;
    let em: SqlEntityManager<
        AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
    >;
    let handlerOpts: ModalHandlerOptions<any>;

    let questionValue: string;
    let unRole: string

    beforeEach(async () => {
        questionValue = 'une question?'
        unRole = randomDiscordId19()
        const data = {
            components: [
                {
                    component: {
                        custom_id: "question",
                        id: 2,
                        type: ComponentType.TextInput,
                        value: questionValue,
                    },
                    id: 1,
                    type: ComponentType.Label,
                },
                {
                    component: {
                        custom_id: "choice0",
                        id: 4,
                        type: ComponentType.TextInput,
                        value: "Un choix 1",
                    },
                    id: 3,
                    type: ComponentType.Label,
                },
                {
                    component: {
                        custom_id: "choice1",
                        id: 6,
                        type: ComponentType.TextInput,
                        value: "Un choix 2",
                    },
                    id: 5,
                    type: ComponentType.Label,
                },
            ],
            custom_id:
                `{"t":"cta","d":{"a":"pollCreate","role":"${unRole}"}}`,
        };
        const { req, res } = getInteractionModalHttpMock({ data });
        const dbServices = await initORM();
        handlerOpts = {
            req,
            res,
            dbServices,
            additionalData: JSON.parse(data.custom_id)
        };
        guild_id = <string>req.body.guild_id;
        const { orm } = await initORM();
        em = orm.em.fork();
    });

    it("should save discord server", async () => {
        await pollCreate.handler(handlerOpts);

        em.clear();
        const server = await em.findOneOrFail(DiscordGuild, {
            guildId: guild_id,
        });

        expect(server).toEqual(
            expectedDiscordGuild({
                guildId: guild_id,
            }),
        );
    });
    it("should save poll with role", async () => {
        await pollCreate.handler(handlerOpts);

        em.clear();
        const polls = await em.findAll(Poll, {
            where: { server: { guildId: guild_id } },
        });
        expect(polls).toEqual([
            expectedPoll({
                question: questionValue,
                role: unRole,
            }),
        ]);
    });

    it("should respond success message and include ne poll id in custom_id", async () => {
        const response = await pollCreate.handler(handlerOpts);

        em.clear();
        const poll = await em.findOne(Poll, {
            server: { guildId: guild_id },
        });

        expect(response).toMeetApiResponse(200, {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                components: [
                    {
                        type: MessageComponentTypes.SECTION,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content:
                                    "# Oyé Oyé!\n-# Le staff réclame votre attention pour un sondage!",
                            },
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content: poll?.question,
                            },
                        ],
                        accessory: {
                            type: MessageComponentTypes.THUMBNAIL,
                            media: {
                                url: `https://raw.githubusercontent.com/GTSpray/P-titPote/poll/assets/ptitpote-sam.png?salt=${poll?.id}`,
                            },
                        },
                    },
                    {
                        type: MessageComponentTypes.SEPARATOR,
                        divider: true,
                        spacing: 1,
                    },
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Primary,
                                label: "Je vote!",
                                custom_id: JSON.stringify({
                                    t: "cta",
                                    d: {
                                        a: "pollresp",
                                        pId: poll?.id,
                                    },
                                }),
                            },
                        ],
                    },
                ],
            },
        });
    });
});
