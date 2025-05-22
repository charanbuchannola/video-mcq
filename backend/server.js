const app = require("./src/app");
const dotenv = require("dotenv");
dotenv.config();

const connect = require("./src/db/db");
connect();

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
