import { CTAData, ModalHandlerDelcaration } from "../../modals.js";
import { errorPayload } from "../../commonMessages.js";

export const pollVote: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      return res.json(
        errorPayload("A voté! (en vrai j'enregistre rien encore)"),
      );
    }
    return res.status(500).json({ error: "unknown" });
  },
};
