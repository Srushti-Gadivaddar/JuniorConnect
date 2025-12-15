const mongoose = require("mongoose");
const initData = require("./data");
const Profile = require("../models/profiles.js");
 

const MONGO_URL = 'mongodb://127.0.0.1:27017/EngineerLand';

main().then(() => {
    console.log("Mongo DB is connected");
}).catch((err) => {
    console.log(err);
});


async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Profile.deleteMany({});
    await Profile.insertMany(initData.data);
    console.log("Data was initialized");
}

initDB();