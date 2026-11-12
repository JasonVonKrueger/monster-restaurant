import { createApp } from "./app.js";
const { http } = createApp();
http.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
  console.log(
    "Monster Restaurant server ready on port " + (process.env.PORT || 3001),
  ),
);
