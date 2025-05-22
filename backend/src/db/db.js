const mongoose = require("mongoose");

const connect = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("mongodb connected..."))
    .catch((err) => console.error("mongodb connection error:", err));
};

module.exports = connect;
