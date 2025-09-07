import { APIUser, UserFlags } from "discord.js"
import { getRandomString, randomDiscordId18 } from "./utils"

export const getApiUserData = (options: Partial<APIUser> = {}): APIUser => {
    return {
        id:  randomDiscordId18(),
        username: "gtspray",
        avatar: getRandomString({ length: 32, number: true, letter: true }),
        discriminator: "0",
        public_flags:  UserFlags.TeamPseudoUser,
        flags: UserFlags.TeamPseudoUser & UserFlags.Staff,
        banner: null,
        accent_color: null,
        global_name: "Spray",
        avatar_decoration_data: null,
        collectibles: null,
        // display_name_styles: null,
        // banner_color: null,
        // clan: null,
        primary_guild: null,
        ...options
    }
}