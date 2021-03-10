const { Schema } = require("mongoose")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const v = require("validator")
const uniqid = require("uniqid")

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      validate: async (value) => {
        if (v.isEmail(value)) {
          let user = await UserModel.findOne({ username: value })
          if (user) throw new Error("This username already exists!")
        } else throw new Error("Invalid email.")
      }
    },
    password: {
      type: String,
      minlength: 7,
    },
    refreshSalt: {
      type: String,
      default: uniqid().slice(-8)
    },
    orgs: {
      type: mongoose.Types.ObjectId,
      ref: 'orgs'
    }
  }
)

UserSchema.statics.findByCredentials = async (email, password) => {
  const user = await UserModel.findOne({ email })

  if (user) {
    const isMatch = await bcrypt.compare(password, user.password)
    if (isMatch) return user
  }

  return null
}

UserSchema.methods.toJSON = function () {
  const user = this
  const userObject = user.toObject()

  delete userObject.password
  delete userObject.__v

  return userObject
}

UserSchema.pre("save", async function (next) {
  const user = this

  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8)
  }

  next()
})

UserSchema.post("validate", function (error, doc, next) {
  if (error) {
    error.httpStatusCode = 400
    next(error)
  } else next()
})

UserSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoError" && error.code === 11000) {
    error.httpStatusCode = 400
    next(error)
  } else next()
})

const UserModel = mongoose.model("User", UserSchema)

module.exports = UserModel