import { io } from "socket.io-client";
import { BASE_URL } from "./constants";

// withCredentials sends the login cookie, which the server uses to know who is connecting.
// Deployed, the backend sits behind the /api proxy; socket.io reads a path in the URL as a
// namespace, so the proxy prefix goes in `path` instead.
export const createSocketConnection = () => {
   if (location.hostname === "localhost") {
      return io(BASE_URL, { withCredentials: true })
   }
   return io("/", { path: "/api/socket.io", withCredentials: true })
}
