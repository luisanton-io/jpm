require("dotenv").config()

const express = require("express")
const cors = require("cors")
const { join } = require("path")
const listEndpoints = require("express-list-endpoints")
const mongoose = require("mongoose")

const cookieParser = require("cookie-parser")

const usersRouter = require("./services/users")
const orgsRouter = require("./services/orgs")
const pkgsRouter = require("./services/pkgs")

const {
  notFoundHandler,
  forbiddenHandler,
  badRequestHandler,
  genericErrorHandler,
} = require("./errorHandlers")

const server = express()

server.use(cookieParser())
server.use(cors())

const staticFolderPath = join(__dirname, "../public")
server.use(express.static(staticFolderPath))
server.use(express.json())

server.use("/users", usersRouter)
server.use("/orgs", orgsRouter)
server.use("/pkgs", pkgsRouter)

server.use(badRequestHandler)
server.use(forbiddenHandler)
server.use(notFoundHandler)
server.use(genericErrorHandler)

console.log(listEndpoints(server))


module.exports = server

