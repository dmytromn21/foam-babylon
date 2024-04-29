const mongoose = require("mongoose");
// Define the database URL to connect to.
const mongoDB = "mongodb://127.0.0.1:27017/db";

// Wait for database to connect, logging an error if there is a problem
main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(mongoDB);
}