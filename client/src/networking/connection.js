import { io } from "socket.io-client";
export const socket = io({ autoConnect: false });
export const request = (event, input = {}) =>
  new Promise((resolve, reject) => {
    if (!socket.connected)
      return reject(
        new Error("Finding your restaurant. Try again in a moment."),
      );
    socket.timeout(7000).emit(event, input, (error, result) => {
      if (error)
        return reject(
          new Error(
            "That took a little while. Please reconnect and try again.",
          ),
        );
      result?.ok
        ? resolve(result)
        : reject(new Error(result?.message || "Please try again."));
    });
  });
