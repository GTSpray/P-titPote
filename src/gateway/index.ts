
import { GatewaySocket } from "./GatewaySocket";

const socket = new GatewaySocket(process.env.BOT_TOKEN);

socket.connect(0);

socket.on('MESSAGE_CREATE', (shard: any, data: { content: any; }) => {
  console.log(shard, data.content);
});