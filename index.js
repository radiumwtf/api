const express = require("express");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config()

const PORT = 8080;

app.use(express.json())

const userSchema = new mongoose.Schema({
    name: String,
    userId: Number,
    email: String,
    discord: { type: Number, unique: true }, // Enforce uniqueness on the discord field
}, { timestamps: true });

// NOTE: methods must be added to the schema before compiling it with mongoose.model()
userSchema.methods.speak = function speak() {
    const greeting = this.name
        ? 'created new user with username ' + this.name
        : 'no name passed through body';
    console.log(greeting);
};

const user = mongoose.model('User', userSchema);

async function getLastUserId() {
    try {
        const lastUser = await user.findOne().sort({ createdAt: -1 });
        if (lastUser) {
            console.log("last created user's ID:", lastUser.userId);
            console.log("next created user's ID:", lastUser.userId + 1);
            return lastUser.userId; // Return the ID if you need to use it elsewhere
        } else {
            console.log("no users found?");
            return null;
        }
    } catch (err) {
        console.error("error finding last created user:", err);
        return null;
    }
}

console.log(`[debug] mongo url is`, process.env.mongodb);
mongoose.connect(process.env.mongodb)
  .then(()=>{
    console.log("connected to atlas cluster");
  })
  .catch(()=>{
    console.log("couldn't connect to atlas cluster... :(");
  })

app.get('/branch', (req, res) => {
    res.status(200).send({
        cmdinfo: "gets branch info",
        usage: "/branch/{branch} (list of branches below)",
        branches: {
            "1": "api",
            "2": "future",
            "3": "staging"
        }
    })
});

app.post('/branch/:id', (req, res) => {
    const { id } = req.params;

    if (id == "api") {
        res.send({
            version: "1.0-developer",
            info: "rest api for getting versions and other info"
        });
    } else {
        res.send({
            message: "branch not found!"
        });
    }

    res.send({
        message: "haiii :3"
    });
});

app.post('/users/create', async function (req, res) {
    const lastUserId = await getLastUserId() || 0; // Get the last userId, default to 0 if none found
    const userData = {
        ...req.body,
        userId: lastUserId + 1, // Increment the last userId for the new user
    };

    // Check if a user with the same discord ID already exists
    const existingUser = await user.findOne({ discord: userData.discord });
    if (existingUser) {
        return res.status(400).send({ message: "a user with this discord account already exists." });
    }

    const newUser = new user(userData);
    try {
        await newUser.save();
        newUser.speak();
        res.send({
            message: "user created!",
            body: userData
        });
    } catch (err) {
        console.error("error creating user:", err);
        res.status(500).send({ message: "internal server error" });
    }
});

app.patch('/users/updateDiscord', async (req, res) => {
    const { userId, newDiscordId } = req.body;

    if (!userId || !newDiscordId) {
        return res.status(400).send({ message: "please provide both userId and newDiscordId." });
    }

    try {
        // Check if a user with the new discord ID already exists to avoid duplicates
        const existingUser = await user.findOne({ discord: newDiscordId });
        if (existingUser) {
            return res.status(400).send({ message: "a user with this Discord ID already exists." });
        }

        const updatedUser = await user.findOneAndUpdate(
            { userId: userId }, // Find a user by their userId
            { discord: newDiscordId }, // Update the discord field
            { new: true } // Return the updated document
        );

        if (updatedUser) {
            res.send({
                message: "discord id updated successfully!",
                updatedUser
            });
        } else {
            res.status(404).send({ message: "user not found" });
        }
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).send({ message: "internal server error" });
    }
});

app.get('/users/list', async (req, res) => {
    const users = await user.find({});

    const userMap = {};
    users.forEach((user) => {
        userMap[user._id] = user;
    });

    res.send(userMap);
});

app.get('/users/getAmountOfUsers', async (req, res) => {
    const users = await user.find({});

    res.send({ amount: users.length });
});

app.get('/users/:id', async (req, res) => { // Mark this function as async
    const { id } = req.params; // Assuming you're passing userId in the URL path

    if (!id) {
        return res.status(400).send({ message: "Please provide a userId" });
    }

    try {
        const foundUser = await user.findOne({ userId: id });
        if (foundUser) {
            res.send(foundUser);
        } else {
            res.status(404).send({ message: "User not found" });
        }
    } catch (err) {
        console.error("Error finding user:", err);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.get('/users/discord/:id', async (req, res) => { // Mark this function as async
    const { id } = req.params; // Assuming you're passing discordId in the URL path

    if (!id) {
        return res.status(400).send({ message: "please provide a valid discord userid" });
    }

    try {
        const foundUser = await user.findOne({ discord: id });
        if (foundUser) {
            res.send(foundUser);
        } else {
            res.status(404).send({ message: "user not found" });
        }
    } catch (err) {
        console.error("error finding user:", err);
        res.status(500).send({ message: "internal server error" });
    }
});

app.get('/users/uid/:id', async (req, res) => { // Mark this function as async
    const { id } = req.params; // Assuming you're passing discordId in the URL path

    if (!id) {
        return res.status(400).send({ message: "please provide a valid discord userid" });
    }

    try {
        const foundUser = await user.findOne({ userId: id });
        if (foundUser) {
            res.send(foundUser);
        } else {
            res.status(404).send({ message: "user not found" });
        }
    } catch (err) {
        console.error("error finding user:", err);
        res.status(500).send({ message: "internal server error" });
    }
});

app.listen(
    PORT,
    () => {
        console.log(`its aliiive!!!!! url is http://localhost:${PORT}\n`);
    }
);