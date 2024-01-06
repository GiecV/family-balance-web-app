const express = require("express");
const fs = require("fs/promises");
const session = require("express-session");
const { query } = require("express-validator");
const { MongoClient } = require("mongodb");
const exp = require("constants");
const uri = "mongodb://mongohost";
const app = express();

const client = new MongoClient(uri);
let db = null;

//Items used for the database generation--------------------

const users = [
  "giacomo",
  "giovanni",
  "federico",
  "luca",
  "mario",
  "alice",
  "sveva",
  "ludovica",
  "sara",
  "giulio",
  "franco",
  "greta",
  "paolo",
  "davide",
  "giorgia",
];

const lastNames = [
  "rossi",
  "neri",
  "bianchi",
  "verdi",
  "visconti",
  "brambilla",
  "russo",
  "esposito",
  "romano",
  "monti",
];

const categories = [
  "sport",
  "entertainment",
  "home",
  "school",
  "transport",
  "miscellaneous",
];
const adjective = ["nice", "fun", "cool", "bad", "sad", "boring"];
const noun = ["day", "tool", "experience", "dinner", "trip"];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomPayers(cost, buyer) {
  let num1, num2;

  do {
    num1 = getRandomInt(users.length);
    num2 = getRandomInt(users.length);
  } while (
    !(num1 !== num2 && !(buyer === users[num1]) && !(buyer === users[num2]))
  );

  const payer1 = {
    username: users[num1],
    amount: cost / 3,
  };
  const payer2 = {
    username: users[num2],
    amount: cost / 3,
  };

  const payer = {
    username: buyer,
    amount: cost / 3,
  };

  let payers = [payer1, payer2, payer];

  return payers;
}

app.get("/insert", async (req, res) => {
  for (let i = 0; i < users.length; i++) {
    console.log("Inserting user " + i);
    let user = {
      username: users[i],
      password: "aaa",
      firstName: users[i],
      lastName: lastNames[getRandomInt(lastNames.length)],
    };

    await db.collection("users").insertOne(user);
    console.log("Done");
  }

  for (let i = 0; i < 50; i++) {
    console.log("Inserting expense " + i);
    const rYear = getRandomInt(3) + 2019;
    const rMonth = getRandomInt(12);
    const rDay = getRandomInt(28) + 1;
    const isoDate = new Date(rYear, rMonth, rDay, 0, 0, 0, 0).toISOString();
    const rDescription =
      adjective[getRandomInt(6)] + " " + noun[getRandomInt(5)];
    const rCategory = categories[getRandomInt(6)];
    const rBuyer = users[getRandomInt(15)];
    const rCost = (getRandomInt(40) + 1) * 10 - 1;
    const rUsers = getRandomPayers(rCost, rBuyer);

    const expense = {
      id: i,
      date: isoDate,
      description: rDescription,
      category: rCategory,
      buyer: rBuyer,
      cost: rCost,
      users: rUsers,
    };

    await db.collection("expenses").insertOne(expense);
    console.log("Done");
  }
  res.status(200).send("Fatto");
});

//---------------------------------------------------------

app.use(express.static(`${__dirname}/public`));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "segreto",
    resave: false,
  })
);

function verify(req, res, next) {
  if (req.session.user) {
    //if the user is logged in, then the execution can continue
    next();
  } else {
    //otherwise the resource is forbidden
    res.status(403);
  }
}

app.post("/api/auth/signup", async (req, res) => {
  let new_user = {
    //get values from the body of the request
    username: req.body.username,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
  };

  const userWithTheSameUsername = await db
    .collection("users")
    .findOne({ username: new_user.username }); //look for an user with the same username

  if (userWithTheSameUsername !== null) {
    //if the username is already taken, then return an error
    res.status(401).json({
      message: "Username already taken",
    });
  } else if (new_user.username == null || new_user.password == null) {
    //if a field is null, then return an error
    res.status(401).json({
      message: "Cannot have empty fields",
    });
  } else {
    //else the user is good to signup
    await db.collection("users").insertOne(new_user);
    res.json(new_user);
  }
});

app.post("/api/auth/signin", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const userRequested = await db
    .collection("users")
    .findOne({ username: username }); //look for a user with the desired username

  if (userRequested == null) {
    //if no user has that username, then return an error
    res.status(401).json({
      message: "Requested user does not exist",
    });
  } else if (username == null || password == null) {
    //if a field is empty, then return an error
    res.status(401).json({
      message: "Null username or password are not allowed",
    });
  } else {
    if (userRequested.password === password) {
      //check if the password is correct
      req.session.user = userRequested;
      res.status(200);
      res.json(userRequested); //good to go, the session is set
    } else {
      //else return an error
      res.status(401).send({
        message: "Wrong credentials",
      });
    }
  }
});

app.get("/api/budget/whoami", verify, (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(400).send({
      //return an error if a session is not present
      message: "No session!",
    });
  }

  res.json(req.session.user);
});

app.get("/api/budget", verify, async (req, res) => {
  const user = req.session.user;

  const expenses = await db
    .collection("expenses")
    .find({ "users.username": user.username })
    .toArray(); //get all the expenses of a user
  res.json(expenses);
});

app.get(
  "/api/budget/search",
  verify,
  query("q").notEmpty().escape(),
  async (req, res) => {
    const user = req.session.user;

    const expenses = await db
      .collection("expenses") //get all the expenses that respect the following criteria:
      .find({
        $and: [
          {
            $or: [
              //the user is involved in the expense (borrowed or lent money)
              {
                "users.username": user.username,
              },
              {
                buyer: user.username,
              },
            ],
          },
          {
            $or: [
              //at least one of the text fields satisfy the query
              {
                description: {
                  $regex: req.query.q,
                },
              },
              {
                buyer: {
                  $regex: req.query.q,
                },
              },
              {
                category: {
                  $regex: req.query.q,
                },
              },
            ],
          },
        ],
      })
      .toArray();

    res.json(expenses);
  }
);

app.get("/api/budget/:year", verify, async (req, res) => {
  const user = req.session.user;
  const year = Number(req.params.year);

  const expenses = await db
    .collection("expenses")
    .find({
      "users.username": user.username,
      $expr: { $eq: [{ $year: { $toDate: "$date" } }, year] }, //get all the expenses made by the user in the desired year
    })
    .toArray();

  res.json(expenses);
});

app.get("/api/budget/:year/:month", verify, async (req, res) => {
  const user = req.session.user;

  const year = Number(req.params.year);
  const month = Number(req.params.month);

  const expenses = await db
    .collection("expenses")
    .find({
      "users.username": user.username,
      $expr: {
        $and: [
          { $eq: [{ $year: { $toDate: "$date" } }, year] },
          { $eq: [{ $month: { $toDate: "$date" } }, month] }, //get all the expenses made by the user in the desired month of desired year
        ],
      },
    })
    .toArray();

  res.json(expenses);
});

app.get("/api/budget/:year/:month/:id", verify, async (req, res) => {
  const user = req.session.user;
  const year = Number(req.params.year);
  const month = Number(req.params.month);

  const expense = await db.collection("expenses").findOne({
    //get the expense with the desired id
    id: Number(req.params.id),
    $expr: {
      $and: [
        { $eq: [{ $year: { $toDate: "$date" } }, year] },
        { $eq: [{ $month: { $toDate: "$date" } }, month] },
      ],
    },
  });

  res.json(expense);
});

app.post("/api/budget/:year/:month", verify, async (req, res) => {
  const user = req.session.user;

  const expenses = await db.collection("expenses").find().toArray();

  let maxId = Number.NEGATIVE_INFINITY;
  expenses.forEach((expense) => {
    if (expense.id > maxId) maxId = expense.id;
  }); //set the id as the smallest unused integer

  let itemToAdd = {
    id: maxId + 1,
    date: req.body.date,
    description: req.body.description,
    category: req.body.category,
    buyer: user.username,
    cost: req.body.cost,
    users: req.body.users,
  }; //create the expense to add

  try {
    await db.collection("expenses").insertOne(itemToAdd); //add it to the collection
    res.json(itemToAdd);
  } catch (error) {
    res.status(401);
    res.send(error);
  }
});

app.put("/api/budget/:year/:month/:id", verify, async (req, res) => {
  try {
    await db.collection("expenses").updateOne(
      //edit an expense based on the desired id
      { id: Number(req.params.id) },
      {
        $set: {
          description: req.body.description,
          category: req.body.category,
          cost: req.body.cost,
          users: req.body.users,
        },
        $currentDate: { date: true },
      }
    );

    const updatedExpense = await db
      .collection("expenses")
      .findOne({ id: Number(req.params.id) });

    res.status(200);
    res.json(updatedExpense);
  } catch (error) {
    res.status(401);
    res.send(error);
  }
});

app.delete("/api/budget/:year/:month/:id", verify, async (req, res) => {
  try {
    await db.collection("expenses").deleteOne({ id: Number(req.params.id) }); //delete the expense with the desired id
    res.json(req.params.id);
  } catch (error) {
    res.status(401);
    res.send(error);
  }
});

app.get("/api/balance", verify, async (req, res) => {
  const user = req.session.user;

  let balance = {};

  const expenses = await db
    .collection("expenses")
    .find({ "users.username": user.username })
    .toArray(); //get all the expenses in which the user is involved

  expenses.forEach((expense) => {
    if (expense.buyer === user.username) {
      //if the buyer is the user, then he lent some money
      let parts = expense.users;
      parts.forEach((part) => {
        //for each user involved in the expense
        if (!(part.username == user.username)) {
          //if this is the part that the user has to pay, then do not consider it
          if (!(balance[part.username] == undefined)) {
            //if it is not the first expense with a user, sum the value to the previous one
            balance[part.username] =
              Number(balance[part.username]) + Number(part.amount);
          } else {
            balance[part.username] = Number(part.amount); //if this is the first expense with a user, then set it to the initial value
          }
        }
      });
    } else {
      //else the money has been borrowed
      let buyer = expense.buyer;
      let parts = expense.users;
      parts.forEach((part) => {
        if (part.username === user.username) {
          if (!(balance[buyer] == undefined)) {
            balance[buyer] = Number(balance[buyer]) - Number(part.amount); //subtract money to the total
          } else {
            balance[buyer] = -Number(part.amount);
          }
        }
      });
    }
  });
  res.json(balance);
});

app.get("/api/balance/:id", verify, async (req, res) => {
  //same concept as above, but two different variables are used
  const user = req.session.user; //one for lent money, the other for borrowed money

  let moneyGiven = {};
  let moneyToReceive = {};

  const expenses = await db
    .collection("expenses")
    .find({ "users.username": user.username })
    .toArray();

  expenses.forEach((expense) => {
    if (expense.buyer === user.username) {
      let parts = expense.users;
      parts.forEach((part) => {
        if (!(part.username === user.username)) {
          if (!(moneyGiven[part.username] == undefined)) {
            moneyGiven[part.username] = moneyGiven[part.username] + part.amount;
          } else {
            moneyGiven[part.username] = part.amount;
          }
        }
      });
    } else {
      let buyer = expense.buyer;
      let parts = expense.users;
      parts.forEach((part) => {
        if (part.username === user.username) {
          if (!(moneyToReceive[buyer] == undefined)) {
            moneyToReceive[buyer] =
              Number(moneyToReceive[buyer]) + Number(part.amount);
          } else {
            moneyToReceive[buyer] = Number(part.amount);
          }
        }
      });
    }
  });

  let balanceWithUser = { lend: 0, borrow: 0 };

  if (moneyGiven[req.params.id] == undefined) {
    balanceWithUser.lend = 0;
  } else {
    balanceWithUser.lend = moneyGiven[req.params.id];
  }

  if (moneyToReceive[req.params.id] == undefined) {
    balanceWithUser.borrow = 0;
  } else {
    balanceWithUser.borrow = moneyToReceive[req.params.id];
  }
  res.json(balanceWithUser);
});

app.get(
  "/api/users/search",
  verify,
  query("q").notEmpty().escape(),
  async (req, res) => {
    console.log(req.query.q);
    const users = await db
      .collection("users")
      .find({ username: { $regex: req.query.q } }) //look for the users that match the query
      .toArray();
    users.forEach((user) => {
      delete user.password;
    });

    res.json(users);
  }
);

app.get("/api/auth/logout", async (req, res) => {
  req.session.destroy((err) => {
    console.log(err);
    res.status = 200;
    res.send();
  });
});

app.listen(3000, async () => {
  await client.connect();
  db = client.db("balanceApp");
});
