# Board - the Balance Web App
This is the final project for the Web Programming course. The client-side code uses Vue.js and Bootstrap, and the server-side code uses Node.js and Express.

## The Application
Board is a web app created to manage the expenses of a family or a group of friends.
A user can:
- sign up/log in/log out
- check the expenses made
- check the balance with other users
- check the insights for a specific user, after searching for a username
- create/edit/delete expenses
- filter expenses based on the description or the date

## Run the Application

To run the application, Express module has to be installed in the app folder.
Open the terminal, navigate to the project folder, and run:
```
cd app
npm install express
docker compose up
```
Now, the container should have been created and ready to be used. ```localhost:3000``` should show the login page
If an error is thrown (usually the error code is 14), delete the ```.data``` folder and try again.

To have some sample data in the database, navigate to ```localhost:3000\insert``` and wait for the server response. 
