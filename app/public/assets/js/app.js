const app = Vue.createApp({
  data() {
    return {
      username: "", //user info in profile tab
      password: "", //
      firstName: "", //
      lastName: "", //
      showPassword: false, //sets the password visibility
      showProfile: true, //shows profile tab
      showPayments: false, //shows payments tab
      showBalance: false, //shows balance tab
      showSendMoneyForm: true, //shows the form used for sending money
      showEditCard: false, //shows the form used for editing an expense
      showInsightsCard: false, //shows the insights
      showNewExpenseCard: false, //shows the form used for adding an expense
      showCostAlert: false, //shows an alert if the cost of an expense is wrong
      filteredResults: false, //shows button for getting all expenses
      expenses: [], //user expenses
      balance: [], //user balance
      usernameInput: "", //text of the username input field
      suggestedUsernames: { username: "" }, //suggested usernames depending on the user input
      expenseToEdit: "", //which expense the user is willing to edit
      moneyLent: 0, //amount of money lent
      moneyBorrowed: 0, //amount of money borrowed
    };
  },
  methods: {
    async logIn() {
      const user = {
        username: this.$refs.username.value,
        password: this.$refs.password.value,
      };

      await fetch("/api/auth/signin", {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      })
        .then((response) => {
          if (!response.ok) throw new Error(response.status); //something is wrong with the user input

          let result = response.json();
          return JSON.stringify(result);
        })
        .then(() => {
          this.errorFlag = false;
          window.location.replace("dashboard.html"); //redirection to personal dashboard
        })
        .catch((err) => {
          //show alert if invalid credentials
          console.log(err);
          this.errorFlag = true;
        });
    },
    async signup() {
      const username = this.$refs.username.value;
      const firstName = this.$refs.firstName.value;
      const lastName = this.$refs.lastName.value;
      const password = this.$refs.password.value;
      const repeatPassword = this.$refs.repeatPassword.value;

      console.log(password + " " + repeatPassword);

      if (password === repeatPassword) {
        const user = {
          username: username,
          password: password,
          firstName: firstName,
          lastName: lastName,
        };

        await fetch("/api/auth/signup", {
          method: "POST",
          redirect: "follow",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(user),
        })
          .then((response) => {
            if (!response.ok) throw new Error(response.status);
            let result = response.json();
            return JSON.stringify(result);
          })
          .then((result) => {
            if (result != null) {
              this.errorFlag = false;
              window.location.replace("index.html"); //redirection if sigup is completed
            }
          })
          .catch((err) => {
            //if the user input is wrong an alert appears
            console.log(err);
            this.errorFlag = true;
          });
      } else this.errorFlag = true; //show alert if password and its repetition do not match
    },
    switchNavbar(event) {
      navbarLabelPressed = event.target; //get which navbar item is clicked
      if (navbarLabelPressed.classList.contains("paymentsNavbarLabel")) {
        if (this.showPayments === false) {
          this.showPayments = true;
          this.showProfile = false;
          this.showBalance = false;
          this.showEditCard = false;
          this.showInsightsCard = false;
          this.showNewExpenseCard = false;
          this.showSendMoneyForm = false;

          this.getExpenses();
        }
      } else if (navbarLabelPressed.classList.contains("profileNavbarLabel")) {
        if (this.showProfile === false) {
          this.showPayments = false;
          this.showProfile = true;
          this.showBalance = false;
          this.showEditCard = false;
          this.showInsightsCard = false;
          this.showNewExpenseCard = false;
          this.showSendMoneyForm = false;
        }
      } else if (navbarLabelPressed.classList.contains("budgetNavbarLabel")) {
        if (this.showBalance === false) {
          this.showPayments = false;
          this.showProfile = false;
          this.showBalance = true;
          this.showEditCard = false;
          this.showInsightsCard = false;
          this.showNewExpenseCard = false;
          this.showSendMoneyForm = false;

          this.getBalance();
        }
      } else {
        console.log("Unknown caller");
      }
    },
    async getExpenses() {
      await fetch("/api/budget") //get all the user expenses
        .then((response) => response.json())
        .then((response) => {
          this.expenses = response;
        });

      this.filteredResults = false; //remove the filter if there is one
    },
    async filter() {
      month = this.$refs.month.value;
      year = this.$refs.year.value; //get user input

      if (month != "Month" && year != "") {
        //filter results based on month and year
        const addressToFetch = "/api/budget/" + year + "/" + month;
        await fetch(addressToFetch)
          .then((response) => response.json())
          .then((response) => {
            this.expenses = response;
            this.filteredResults = true;
          });
      } else if (year != "") {
        //filter results just based on the year
        const addressToFetch = "/api/budget/" + year;
        await fetch(addressToFetch)
          .then((response) => response.json())
          .then((response) => {
            this.expenses = response;
          });
      }
    },
    async getBalance() {
      const addressToFetch = "/api/balance/";
      await fetch(addressToFetch)
        .then((response) => response.json())
        .then((response) => {
          const keys = Object.keys(response); //get all the keys
          let total = 0; //used for summing all the costs

          keys.forEach((key) => {
            response[key] = this.trimNumber(Number(response[key])); //round all the numbers to 2 decimal digits
            total += response[key];
          });
          response["Total"] = total;

          this.balance = response; //assign the result to the variable used for displaying
          this.filteredResults = true;
        });
    },
    async findSuggestedUsernames() {
      const query = this.usernameInput;
      const addressToFetch = "/api/users/search?q=" + query; //find usernames that match with the user input
      await fetch(addressToFetch)
        .then((response) => response.json())
        .then((response) => {
          this.suggestedUsernames = response;
        });
    },
    async onClickSuggestedUsername(username) {
      //text is auto-completed if an option is clicked
      this.usernameInput = username;
    },
    async showEditWindow(id, date) {
      this.showEditCard = true;
      this.showPayments = false;

      const year = date.substring(0, 4); //get year and month from the date string
      const month = date.substring(5, 7);

      const addressToFetch = "/api/budget/" + year + "/" + month + "/" + id;
      await fetch(addressToFetch)
        .then((response) => response.json())
        .then((response) => {
          this.expenseToEdit = response; //show the current fields of the selected expense
          this.expenseToEdit.date = this.expenseToEdit.date.substring(0, 10);
        });
    },
    async editExpense() {
      const id = this.$refs.id.value;
      const date = this.$refs.date.value;

      const year = date.substring(0, 4);
      const month = date.substring(5, 7);

      const description = this.$refs.description.value;
      const category = this.$refs.category.value;
      const buyer = this.$refs.buyer.value;
      const cost = this.$refs.cost.value;

      let users = [];

      const paragraphs = document.getElementsByClassName("userParagraph"); //get the paragraphs used for editing the users
      for (let i = 0; i < paragraphs.length; i++) {
        users.push({
          username:
            paragraphs[i].getElementsByClassName("usernameInput")[0].value,
          amount: paragraphs[i].getElementsByClassName("amountInput")[0].value,
        }); //get values in the array of users
      }

      const expense = {
        //create the edited expense
        id: id,
        date: date,
        description: description,
        category: category,
        buyer: buyer,
        cost: cost,
        users: users,
      };

      await fetch("/api/budget/" + year + "/" + month + "/" + id, {
        //put the edits
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expense),
      })
        .then((res) => res.json())
        .then((res) => {
          this.getExpenses();
          this.showEditCard = false;
          this.showPayments = true;
        });
    },
    async deleteExpense(id, date) {
      //delete the correct expense
      const year = date.substring(0, 4);
      const month = date.substring(5, 7);

      await fetch("/api/budget/" + year + "/" + month + "/" + id, {
        method: "DELETE",
      })
        .then((res) => res.json())
        .then((res) => {
          this.getExpenses(); //refresh the view
        });
    },
    async findInsights() {
      this.showInsightsCard = true;
      const desiredUsername = this.usernameInput;

      await fetch("/api/balance/" + desiredUsername)
        .then((res) => res.json())
        .then((res) => {
          this.moneyLent = this.trimNumber(Number(res.lend)); //round to two decimal digits
          this.moneyBorrowed = this.trimNumber(Number(res.borrow));
        });
    },
    parseToObjectList(string) {
      const objects = string.split(" ");
      let list = [];
      objects.forEach((object) => {
        const user = object.substring(0, object.indexOf(","));
        const amount = object.substring(object.indexOf(",") + 1, object.length);

        list.push({
          username: user,
          amount: Number(amount),
        });
      });
      return list;
    },
    async createNewExpense() {
      const epsilon = 0.001; //maximum error accepted after rounding

      const date = this.$refs.date.value;
      const description = this.$refs.description.value;
      const category = this.$refs.category.value;
      const buyer = this.$refs.buyer.value;
      const cost = this.$refs.cost.value;
      const users = this.$refs.usernames.value;

      const usernamesAndAmounts = this.parseToObjectList(users);

      const year = date.substring(0, 4);
      const month = date.substring(5, 7);

      let totalCost = 0;

      usernamesAndAmounts.forEach((item) => {
        totalCost += Number(item.amount);
      });

      const isCostEqualToSumOfParts = cost - totalCost < epsilon;

      if (isCostEqualToSumOfParts) {
        //if the user divided correctly the amount
        const newExpense = {
          date: date,
          description: description,
          category: category,
          buyer: buyer,
          cost: cost,
          users: usernamesAndAmounts,
        };

        await fetch("/api/budget/" + year + "/" + month, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newExpense),
        })
          .then((res) => res.json())
          .then((res) => {
            this.getExpenses();
            this.showNewExpenseCard = false;
            this.showPayments = true;
          });
      } else {
        //otherwise show alert
        this.showCostAlert = true;
      }
    },
    trimNumber(num) {
      //round number to two decimal digits
      const trimmedNumber = Math.round((num + Number.EPSILON) * 100) / 100;
      return trimmedNumber;
    },
    async search() {
      const query = this.$refs.searchInput.value; //get the user input

      const addressToFetch = "/api/budget/search?q=" + query;
      await fetch(addressToFetch)
        .then((response) => response.json())
        .then((response) => {
          this.expenses = response; //get the filtered results
          this.filteredResults = true;
        });
    },
    async logOut() {
      this.username = ""; //reset all the variables used in the view
      this.password = "";
      this.firstName = "";
      this.lastName = "";
      this.expenses = "";
      this.balance = "";
      this.moneyLent = 0;
      this.moneyBorrowed = 0;

      await fetch("/api/auth/logout", {
        method: "GET",
        redirect: "follow",
      }).then(() => {
        window.location.replace("index.html"); //go to login page if logout is performed
      });
    },
  },
  async beforeMount() {
    //when dashboard.html is rendered
    try {
      await fetch("/api/budget/whoami", {
        //get session user info
        method: "GET",
        redirect: "follow",
      })
        .then((res) => {
          return res.json();
        })
        .then((user) => {

          this.username = user.username; //show info in the dashboard
          this.password = user.password;
          this.firstName = user.firstName;
          this.lastName = user.lastName;
        });
    } catch (error) {
      console.log(error);
    }
  },
  computed: {
    expensesWithShortDate(){
      return this.expenses.map(item => {
        return {...item, date: item.date.substring(0,10)};
      });
    }
  },
});

app.mount("#app");
