import { io } from "socket.io-client";

export const createSocketConnection = () => {
   return io(process.env.BASE_URL, )}