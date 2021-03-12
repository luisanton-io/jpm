const express = require("express")
const q2m = require("query-to-mongo")
const { authorize } = require("../auth")

const UserSchema = require("./model")
const UserModel = require("./model")
const { authenticate, refreshTokens } = require("./authTools")
const uniqid = require("uniqid")
const usersRouter = express.Router()

usersRouter.get("/", authorize, async (req, res, next) => {
  try {
    const query = q2m(req.query)

    const users = await UserSchema.find(query.criteria, query.options.fields)
      .skip(query.options.skip)
      .limit(query.options.limit)
      .sort(query.options.sort)

    res.send({
      data: users,
      total: users.length,
    })
  } catch (error) {
    console.log(error)
    next(error)
  }
})

usersRouter.get("/me", authorize, async (req, res, next) => {
  try {
    res.send(req.user)
  } catch (error) {
    next("While reading users list a problem occurred!")
  }
})

usersRouter.post("/signup", async (req, res, next) => {
  try {
    const newUser = new UserSchema(req.body)
    const { _id } = await newUser.save()

    res.status(201).send(_id)
  } catch (error) {
    next(error)
  }
})

usersRouter.put("/me", authorize, async (req, res, next) => {
  try {
    const updates = Object.keys(req.body)

    try {
      updates.forEach((update) => (req.user[update] = req.body[update]))
      await req.user.save()
      res.send(req.user)
    } catch (e) {
      res.status(400).send(e)
    }
  } catch (error) {
    next(error)
  }
})

usersRouter.delete("/me", authorize, async (req, res, next) => {
  try {
    await req.user.remove()
    res.send("Deleted")
  } catch (error) {
    next(error)
  }
})

usersRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await UserModel.findByCredentials(email, password)

    if (!user) throw new Error("Username/password match not found")

    const { token, refreshToken } = await authenticate(user)

    res.status(200).send({ token, refreshToken })

  } catch (error) {
    error.httpStatusCode = 400
    next(error)
  }
})

usersRouter.post("/logout", authorize, async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(req.user._id, {
      refreshSalt: uniqid().slice(-8)
    })
    res.send()
  } catch (err) {
    next(err)
  }
})

usersRouter.post("/refreshToken", async (req, res, next) => {

  try {
    const oldRefreshToken = req.header("Authorization") && req.header("Authorization").replace("Bearer ", "")

    if (!oldRefreshToken) {
      const err = new Error("Refresh token missing")
      err.httpStatusCode = 403
      next(err)
    } else {
      try {
        const tokens = await refreshTokens(oldRefreshToken)
        res.send(tokens)
      } catch (error) {
        console.log(error)
        const err = new Error(error)
        err.httpStatusCode = 403
        next(err)
      }
    }
  } catch (error) { next(error) }
})

module.exports = usersRouter
