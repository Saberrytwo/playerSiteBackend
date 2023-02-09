const express = require('express')
const cors = require('cors')
const bodyParser = require("body-parser");
const app = express()
const port = 3001
const sha256 = require('sha256');
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com", // hostname
  secureConnection: false, // TLS requires secureConnection to be false
  port: 587, // port for secure SMTP
  tls: {
     ciphers:'SSLv3'
  },
  auth: {
      user: 'is405classproject@outlook.com',
      pass: 'blahprojectfun1234'
  }
});

const corsOptions ={
    origin:'http://localhost:3000', 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port : 3306,
    user : 'root',
    password : 'rootuser123',
    database : 'playersite'
  }
});

app.get('/', (req, res) => {
  res.send(
    '<p>some html</p>'
  )
});

app.post('/login', async (req,res) => {
  var date = new Date().toISOString().split("T")[0];
  var token = "";
  const user = await knex('Login')
    .where('username', req.body.username);
  if (user[0].password == req.body.password){
    token = sha256(date + "isemp" + req.body.username);
    res.send({token:token});
  }
});

app.get('/players', async (req, res) => {
  const players = await knex('players');
    
  res.send(players);
})

app.get('/notifications', async (req, res) => {
  const employees = await knex('EmployeeSemesterPositionLink')
    .join('Position', 'Position.id', 'EmployeeSemesterPositionLink.positionId')
    .join('Employee', 'Employee.byuId', 'EmployeeSemesterPositionLink.employeeId')
    .join('Semester', 'Semester.id', 'EmployeeSemesterPositionLink.semesterId')
    .where('semester', getCurrentSemester())
    .where('year', new Date().getFullYear());

  const supervisors = await knex('Supervisor');

  const authorizedToWorkNotifications = await Promise.all(employees
    .filter(emp => new Date(emp.dateAdded) < (new Date().getTime() - (7 * 24 * 60 * 60 * 1000)))
    .map(emp => {
      const supervisor = supervisors.filter(sup => sup.id == emp.supervisorId).map(sup => `${sup.firstName} ${sup.lastName}`)
      return {
        name: `${emp.firstName} ${emp.lastName}`,
        position: emp.position,
        dateAdded: emp.dateAdded,
        supervisor: supervisor
      }
    }));

  const eFormNotifications = await Promise.all(employees.filter(emp => emp.qualtricsSurveySent && !emp.isEFormSubmitted)
    .map(emp => {
      const supervisor = supervisors.filter(sup => sup.id == emp.supervisorId).map(sup => `${sup.firstName} ${sup.lastName}`)
      return {
        name: `${emp.firstName} ${emp.lastName}`,
        position: emp.position,
        supervisor: supervisor
      }
    }));

  res.send({
    authorizedToWorkNotifications,
    eFormNotifications
  })
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

